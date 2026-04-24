const encoder = require("./encoder");
const handlers = require("./handlers");
const fs = require("fs");
const path = require("path");

const REPL_ID = "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb";
const replicas = [];
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

  server.on("connection", (socket) => {
    let buffer = "";
    const state = {
      inTransaction: false,
      queuedCommands: [],
      isReplica: false,
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
        };
        const response = handler(parts, socket, state, serverInfo);

        if (state.isReplica && command !== "PSYNC" && command !== "PING" && command !== "REPLCONF") {
          // This is a propagated command to a replica, no response needed
        } else if (!state.isReplica && command === "SET") {
          propagateCommand(rawData, socket);
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