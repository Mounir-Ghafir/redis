const net = require("net");
const { createServer } = require("./server");
const handlers = require("./handlers");
const store = require("./store");
const logger = require("./logger");
const config = require("./config");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);

let configFile = null;
let cliArgs = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--conf' && args[i + 1]) {
    configFile = args[i + 1];
    i++;
  } else {
    cliArgs.push(args[i]);
  }
}

const cfg = config.loadConfig(configFile, cliArgs);

logger.setLevel(cfg.loglevel);
if (cfg.logfile) {
  logger.setLogFile(cfg.logfile);
}

logger.info("Starting Redis server", { port: cfg.port, dir: cfg.dir });

const server = net.createServer();

createServer(server, { 
  isReplica: false, 
  dir: cfg.dir, 
  dbfilename: cfg.dbfilename, 
  appendonly: cfg.appendonly, 
  appenddirname: cfg.appenddirname, 
  appendfilename: cfg.appendfilename, 
  appendfsync: cfg.appendfsync,
  maxmemory: cfg.maxmemory,
  maxmemoryPolicy: cfg.maxmemoryPolicy,
  requirepass: cfg.requirepass,
  maxclients: cfg.maxclients,
  rateLimitMax: cfg.ratelimitmax,
  rateLimitWindow: cfg.ratelimitwindow,
});

server.listen(cfg.port, cfg.bind, () => {
  logger.info("Server started", { host: cfg.bind, port: cfg.port });
});

function startReplicaHandshake(localHost, localPort, masterHost, masterPort) {
  const replica = net.createConnection({ host: masterHost, port: masterPort }, () => {
    replica.write("*1\r\n$4\r\nPING\r\n");
  });

  let step = 0;
  let buffer = "";
  let handshakeComplete = false;
  let offset = 0;
  let pendingOffset = 0;

  const handleCommand = (parts, rawData) => {
    const command = parts[2]?.toUpperCase();
    if (command === "SET") {
      const key = parts[4];
      const value = parts[6];
      store.set(key, { type: "string", value, expiry: null });
    } else if (command === "REPLCONF" && parts[4]?.toUpperCase() === "GETACK") {
      replica.write(`*3\r\n$8\r\nREPLCONF\r\n$3\r\nACK\r\n$${pendingOffset.toString().length}\r\n${pendingOffset}\r\n`);
      pendingOffset = offset;
    } else if (command !== "REPLCONF" || parts[4]?.toUpperCase() !== "ACK") {
      pendingOffset = offset;
    }
  };

  replica.on("data", (data) => {
    buffer += data.toString();

    if (handshakeComplete) {
      if (buffer.includes('REPLCONF') && buffer.includes('GETACK')) {
        replica.write(`*3\r\n$8\r\nREPLCONF\r\n$3\r\nACK\r\n$${pendingOffset.toString().length}\r\n${pendingOffset}\r\n`);
        pendingOffset = offset;
        buffer = "";
        return;
      }
      while (buffer.includes('\r\n')) {
        const parts = buffer.split('\r\n');
        const numArgs = parseInt(parts[0]?.slice(1));
        if (isNaN(numArgs)) break;
        const expectedParts = 1 + numArgs * 2;
        if (parts.length < expectedParts) break;

        const rawData = parts.slice(0, expectedParts).join('\r\n') + '\r\n';
        handleCommand(parts.slice(0, expectedParts), rawData);
        offset += rawData.length;

        buffer = parts.slice(expectedParts).join('\r\n');
      }
      return;
    }

    if (buffer.includes('+FULLRESYNC')) {
      const fullResyncIdx = buffer.indexOf('+FULLRESYNC');
      const afterResync = buffer.slice(fullResyncIdx + 11);
      const lines = afterResync.split('\r\n');
      for (const line of lines) {
        if (line.startsWith('$')) {
          const rdbLength = parseInt(line.slice(1));
          if (!isNaN(rdbLength)) {
            handshakeComplete = true;
            break;
          }
        }
      }
    }

    if (buffer.includes('\r\n')) {
      step++;
      if (step === 1) {
        replica.write(`*3\r\n$8\r\nREPLCONF\r\n$14\r\nlistening-port\r\n$${localPort.toString().length}\r\n${localPort}\r\n`);
      } else if (step === 2) {
        replica.write("*3\r\n$8\r\nREPLCONF\r\n$4\r\ncapa\r\n$6\r\npsync2\r\n");
      } else if (step === 3) {
        replica.write("*3\r\n$5\r\nPSYNC\r\n$1\r\n?\r\n$2\r\n-1\r\n");
      }
      buffer = "";
    }
  });

  replica.on("error", (err) => {
    logger.error("Replica error: " + err.message);
  });
}

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception: " + err.message, { stack: err.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", { reason: String(reason), stack: reason?.stack });
});

let isShuttingDown = false;

const RDB_OPCODE_DB = 254;
const RDB_OPCODE_EOF = 255;

function saveRDB(dir, dbfilename) {
  const rdbPath = path.join(dir, dbfilename);
  const keys = store.getKeys();
  
  let data = Buffer.from([0x52, 0x45, 0x44, 0x49]); // REDI header
  data = Buffer.concat([data, Buffer.alloc(4)]); // Reserved
  
  data = Buffer.concat([data, Buffer.from([RDB_OPCODE_DB])]);
  const countBuf = Buffer.alloc(2);
  countBuf.writeUInt16BE(keys.length, 0);
  data = Buffer.concat([data, countBuf]);
  
  for (const key of keys) {
    const entry = store.get(key);
    if (entry && (!entry.expiry || entry.expiry > Date.now())) {
      const k = Buffer.from(key);
      const v = Buffer.from(String(entry.value));
      data = Buffer.concat([data, Buffer.from([k.length]), k, Buffer.from([v.length]), v]);
    }
  }
  
  data = Buffer.concat([data, Buffer.from([RDB_OPCODE_EOF])]);
  fs.writeFileSync(rdbPath, data);
  logger.info("RDB saved", { path: rdbPath, keys: keys.length });
}

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info("Graceful shutdown initiated", { signal });
  
  server.close(() => {
    logger.info("Server closed, saving data...");
    
    if (cfg.appendonly === "yes") {
      // AOF already has data, just note it's saved
      logger.info("AOF sync complete");
    }
    
    if (cfg.dir && cfg.dbfilename) {
      try {
        const rdbPath = path.join(cfg.dir, cfg.dbfilename);
        const keys = store.getKeys();
        
        let data = Buffer.from([0x52, 0x45, 0x44, 0x49]);
        
        const numKeys = keys.length;
        const buf = Buffer.alloc(2);
        buf.writeUInt16BE(numKeys, 0);
        
        for (const key of keys) {
          const entry = store.get(key);
          if (entry && (!entry.expiry || entry.expiry > Date.now())) {
            const k = Buffer.from(key);
            const v = Buffer.from(String(entry.value));
            data = Buffer.concat([data, Buffer.from([k.length]), k, Buffer.from([v.length]), v]);
          }
        }
        
        data = Buffer.concat([data, Buffer.from([RDB_OPCODE_EOF])]);
        fs.writeFileSync(rdbPath, data);
        logger.info("RDB saved", { path: rdbPath, keys: keys.length });
      } catch (err) {
        logger.error("RDB save failed: " + err.message);
      }
    }
    
    logger.info("Shutdown complete");
    process.exit(0);
  });
  
  setTimeout(() => {
    logger.error("Shutdown timeout, forcing exit");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));