const encoder = require("./encoder");
const handlers = require("./handlers");
const store = require("./store");
const fs = require("fs");
const path = require("path");
const logger = require("./logger");

const REPL_ID = "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb";
const replicas = [];
const subscriptions = new Map();
let globalOffset = 0;
let serverConfig = {};
let activeConnections = new Set();

function createServer(server, config = {}) {
  serverConfig = config;
  
  if (config.dir && config.dbfilename) {
    const rdbPath = path.join(config.dir, config.dbfilename);
    if (fs.existsSync(rdbPath)) {
      store.loadRdbFile(rdbPath);
    }
  }

  if (config.appendonly === "yes" && config.dir && config.appenddirname && config.appendfilename) {
    const aofDir = path.join(config.dir, config.appenddirname);
    if (!fs.existsSync(aofDir)) {
      fs.mkdirSync(aofDir, { recursive: true });
    }
    
    const aofBaseName = config.appendfilename + ".1.incr.aof";
    const aofPath = path.join(aofDir, aofBaseName);
    if (!fs.existsSync(aofPath)) {
      fs.writeFileSync(aofPath, "");
    }
    
    const manifestPath = path.join(aofDir, config.appendfilename + ".manifest");
    if (!fs.existsSync(manifestPath)) {
      fs.writeFileSync(manifestPath, "file " + aofBaseName + " seq 1 type i\n");
    }
    
    store.replayAof(aofDir, config.appendfilename);
  }

  server.on("connection", (socket) => {
    activeConnections.add(socket);
    logger.info("Client connected", { clientIp: socket.remoteAddress, activeConnections: activeConnections.size });
    
    let buffer = "";
    const state = {
      inTransaction: false,
      queuedCommands: [],
      isReplica: false,
      subscriptions: new Set(),
      inSubscribeMode: false,
    };

    socket.on("data", (data) => {
      try {
        const startTime = Date.now();
        buffer += data.toString();

        while (buffer.includes('\r\n')) {
          const parts = buffer.split('\r\n');
          const numArgs = parseInt(parts[0]?.slice(1));
          
          if (isNaN(numArgs) || numArgs < 0) {
            socket.write("-ERR invalid argument count\r\n");
            buffer = "";
            break;
          }

          const expectedParts = 1 + numArgs * 2;
          if (parts.length < expectedParts) break;

          const command = parts[2]?.toUpperCase();
          const clientIp = socket.remoteAddress;
          
          logger.logRequest(command, parts, clientIp);

          if (!command) {
            socket.write("-ERR empty command\r\n");
            buffer = parts.slice(expectedParts).join('\r\n');
            continue;
          }

          const users = store.users || {};
          const isAuthCommand = command === "AUTH" || command === "ACLWHOAMI" || command === "ACLGETUSER" || command === "ACLSETUSER";
          const currentUser = store.getAuthenticatedUser(socket);
          const requiresAuth = users.default && users.default.passwords && users.default.passwords.length > 0;
          
          if (requiresAuth && !currentUser && !isAuthCommand) {
            socket.write("-ERR NOAUTH Authentication required.\r\n");
            buffer = parts.slice(expectedParts).join('\r\n');
            continue;
          }

          if (state.inSubscribeMode) {
            const allowedCommands = ["SUBSCRIBE", "UNSUBSCRIBE", "PING", "QUIT", "RESET"];
            if (!allowedCommands.includes(command)) {
              socket.write("-ERR only PING/QUIT allowed in subscribe mode\r\n");
              buffer = parts.slice(expectedParts).join('\r\n');
              continue;
            }
          }

          if (state.inTransaction && command !== "EXEC" && command !== "MULTI" && command !== "DISCARD" && command !== "WATCH") {
            state.queuedCommands.push(parts.slice(0, expectedParts));
            socket.write("+QUEUED\r\n");
            buffer = parts.slice(expectedParts).join('\r\n');
            continue;
          }

          const rawData = parts.slice(0, expectedParts).join('\r\n') + '\r\n';
          globalOffset += rawData.length;

          const handler = handlers[command.toLowerCase()] || handlers.unknown;
          const serverInfo = { 
            replId: REPL_ID, 
            replOffset: globalOffset, 
            addReplica, 
            getReplicaCount: () => replicas.length,
            getReplicas: () => replicas,
            dir: serverConfig.dir,
            dbfilename: serverConfig.dbfilename,
            appendonly: serverConfig.appendonly,
            appenddirname: serverConfig.appenddirname,
            appendfilename: serverConfig.appendfilename,
            addSubscription: (channel, sock) => {
              if (!subscriptions.has(channel)) {
                subscriptions.set(channel, new Set());
              }
              subscriptions.get(channel).add(sock);
            },
            removeSubscription: (channel, sock) => {
              if (subscriptions.has(channel)) {
                subscriptions.get(channel).delete(sock);
              }
            },
            getSubscribers: (channel) => {
              return Array.from(subscriptions.get(channel) || []);
            },
          };
          handler(parts, socket, state, serverInfo);

          const durationMs = Date.now() - startTime;
          logger.logResponse(command, durationMs, socket.remoteAddress);

          if (!state.isReplica && command === "SET") {
            propagateCommand(rawData);
          }

          buffer = parts.slice(expectedParts).join('\r\n');
        }
      } catch (err) {
        logger.error("Error processing command: " + err.message, { stack: err.stack });
        socket.write("-ERR Internal server error\r\n");
      }
    });

    socket.on("end", () => {
      try {
        activeConnections.delete(socket);
        const idx = replicas.indexOf(socket);
        if (idx !== -1) replicas.splice(idx, 1);
        handlers.cleanup({}, socket, state);
        logger.info("Client disconnected", { clientIp: socket.remoteAddress, activeConnections: activeConnections.size });
      } catch (err) {
        logger.error("Disconnect error: " + err.message);
      }
    });

    socket.on("error", (err) => {
      logger.error("Socket error: " + err.message);
    });

    socket.on("close", () => {
      activeConnections.delete(socket);
      store.removeClientFromAllKeys(socket);
    });
  });

  return server;
}

function propagateCommand(commandStr) {
  for (const replica of replicas) {
    try {
      replica.write(commandStr);
    } catch (e) {
      logger.error("Failed to propagate: " + e.message);
    }
  }
}

function addReplica(socket) {
  replicas.push(socket);
}

function getActiveConnections() {
  return activeConnections.size;
}

module.exports = { createServer, addReplica, getActiveConnections };