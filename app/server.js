const encoder = require("./encoder");
const handlers = require("./handlers");
const fs = require("fs");
const path = require("path");

const REPL_ID = "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb";
const replicas = [];
const subscriptions = new Map();
let globalOffset = 0;
let serverConfig = {};

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
      fs.writeFileSync(manifestPath, `file ${aofBaseName} seq 1 type i\n`);
    }
    
    store.replayAof(aofDir, config.appendfilename);
  }

  server.on("connection", (socket) => {
    let buffer = "";
    const state = {
      inTransaction: false,
      queuedCommands: [],
      isReplica: false,
      subscriptions: new Set(),
      inSubscribeMode: false,
      ...config,
    };

    socket.on("data", (data) => {
      buffer += data.toString();
      console.log("Server received:", JSON.stringify(buffer));

      while (buffer.includes('\r\n')) {
        const parts = buffer.split('\r\n');
        const numArgs = parseInt(parts[0]?.slice(1));

        const expectedParts = 1 + numArgs * 2;
        if (parts.length < expectedParts) break;

        const command = parts[2]?.toUpperCase();

        if (state.inSubscribeMode) {
          const allowedCommands = ["SUBSCRIBE", "UNSUBSCRIBE", "PSUBSCRIBE", "PUNSUBSCRIBE", "PING", "QUIT", "RESET"];
          if (!allowedCommands.includes(command)) {
            socket.write(`-ERR Can't execute '${command}': only (P|S)SUBSCRIBE / (P|S)UNSUBSCRIBE / PING / QUIT / RESET are allowed in this context\r\n`);
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
          appendfsync: serverConfig.appendfsync,
          addSubscription: (channel, socket) => {
            if (!subscriptions.has(channel)) {
              subscriptions.set(channel, new Set());
            }
            subscriptions.get(channel).add(socket);
          },
          removeSubscription: (channel, socket) => {
            if (subscriptions.has(channel)) {
              subscriptions.get(channel).delete(socket);
            }
          },
          getSubscribers: (channel) => {
            return Array.from(subscriptions.get(channel) || []);
          },
        };
        const response = handler(parts, socket, state, serverInfo);

        if (state.isReplica && command !== "PSYNC" && command !== "PING" && command !== "REPLCONF") {
          // This is a propagated command to a replica, no response needed
        } else if (!state.isReplica && command === "SET") {
          propagateCommand(rawData, socket);
        }

        if (serverConfig.appendonly === "yes") {
          const aofDir = path.join(serverConfig.dir, serverConfig.appenddirname);
          const manifestPath = path.join(aofDir, serverConfig.appendfilename + ".manifest");
          if (fs.existsSync(manifestPath)) {
            const manifest = fs.readFileSync(manifestPath, "utf8");
            const match = manifest.match(/file\s+(\S+)\s+seq\s+(\d+)\s+type\s+(\w)/);
            if (match) {
              const aofPath = path.join(aofDir, match[1]);
              if (isWriteCommand(command)) {
                fs.appendFileSync(aofPath, rawData);
                if (serverConfig.appendfsync === "always") {
                  fs.fsyncSync(fs.openSync(aofPath, "r+"));
                }
              }
            }
          }
        }

        buffer = parts.slice(expectedParts).join('\r\n');
      }
    });

    socket.on("end", () => {
      const idx = replicas.indexOf(socket);
      if (idx !== -1) replicas.splice(idx, 1);
      handlers.cleanup({}, socket);
      console.log("Client disconnected");
    });

    socket.on("error", (err) => {
      console.error("Socket error:", err.message);
    });
  });

  return server;
}

function isWriteCommand(command) {
  const writeCommands = ["SET", "DEL", "INCR", "DECR", "LPUSH", "RPUSH", "LPOP", "RPOP", "LREM", "LSET", "SADD", "SREM", "SMOVE", "ZADD", "ZREM", "ZINCRBY", "APPEND"];
  return writeCommands.includes(command);
}

function propagateCommand(commandStr, originSocket) {
  for (const replica of replicas) {
    try {
      replica.write(commandStr);
    } catch (e) {
      console.error("Failed to propagate:", e.message);
    }
  }
}

function addReplica(socket) {
  replicas.push(socket);
}

module.exports = { createServer, addReplica };