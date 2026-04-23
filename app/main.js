const net = require("net");
const { createServer } = require("./server");

console.log("Logs from your program will appear here!");

const server = net.createServer();
const port = 6379;
const host = "127.0.0.1";

createServer(server);

server.listen(port, host, () => {
  console.log(`Server running at ${host}:${port}`);
});