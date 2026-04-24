const net = require("net");
const { createServer } = require("./server");
const handlers = require("./handlers");
const store = require("./store");

console.log("Logs from your program will appear here!");

const args = process.argv.slice(2);
let port = 6379;
let isReplica = false;
let masterHost = null;
let masterPort = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" && args[i + 1]) {
    port = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === "--replicaof" && args[i + 1]) {
    isReplica = true;
    const [host, portStr] = args[i + 1].split(" ");
    masterHost = host;
    masterPort = parseInt(portStr);
    i++;
  }
}

const server = net.createServer();
const host = "127.0.0.1";

createServer(server, { isReplica });

server.listen(port, host, () => {
  console.log(`Server running at ${host}:${port}`);

  if (isReplica && masterHost && masterPort) {
    startReplicaHandshake(host, port, masterHost, masterPort);
  }
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
    console.error("Replica error:", err.message);
  });
}