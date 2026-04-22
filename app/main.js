const net = require("net");
const {
  ping,
  echo,
  set,
  get,
  rpush,
  lpush,
  lpop,
  blpop,
  lrange,
  llen,
  unknown,
  cleanup,
} = require("./handlers");

console.log("Logs from your program will appear here!");

const server = net.createServer();
const port = 6379;
const host = "127.0.0.1";

server.on("connection", (socket) => {
  let buffer = "";

  socket.on("data", (data) => {
    buffer += data.toString();

    while (buffer.includes('\r\n')) {
      const parts = buffer.split('\r\n');
      const numArgs = parseInt(parts[0]?.slice(1));
      const expectedParts = 1 + numArgs * 2;

      if (parts.length < expectedParts) break;

      const command = parts[2]?.toUpperCase();

      if (command === "PING") {
        ping(socket);
      } else if (command === "ECHO") {
        echo(parts, socket);
      } else if (command === "SET") {
        set(parts, socket);
      } else if (command === "GET") {
        get(parts, socket);
      } else if (command === "RPUSH") {
        rpush(parts, socket);
      } else if (command === "LPUSH") {
        lpush(parts, socket);
      } else if (command === "LPOP") {
        lpop(parts, socket);
      } else if (command === "BLPOP") {
        blpop(parts, socket);
      } else if (command === "LRANGE") {
        lrange(parts, socket);
      } else if (command === "LLEN") {
        llen(parts, socket);
      } else {
        unknown(socket);
      }

      buffer = parts.slice(expectedParts).join('\r\n');
    }
  });

  socket.on("end", () => {
    cleanup(socket);
    console.log("Client disconnected");
  });

  socket.on("error", (err) => {
    console.error("Socket error:", err.message);
  });
});

server.listen(port, host, () => {
  console.log(`Server running at ${host}:${port}`);
});