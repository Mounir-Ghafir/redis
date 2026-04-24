const encoder = require("../encoder");
const handlers = require("./handlers");

function createServer(server) {
  server.on("connection", (socket) => {
    let buffer = "";
    const state = {
      inTransaction: false,
      queuedCommands: [],
    };

    socket.on("data", (data) => {
      buffer += data.toString();

      while (buffer.includes('\r\n')) {
        const parts = buffer.split('\r\n');
        const numArgs = parseInt(parts[0]?.slice(1));

        const expectedParts = 1 + numArgs * 2;
        if (parts.length < expectedParts) break;

        const command = parts[2]?.toUpperCase();

        if (state.inTransaction && command !== "EXEC" && command !== "MULTI") {
          state.queuedCommands.push(parts.slice(0, expectedParts));
          socket.write("+QUEUED\r\n");
          buffer = parts.slice(expectedParts).join('\r\n');
          continue;
        }

        const handler = handlers[command.toLowerCase()] || handlers.unknown;
        handler(parts, socket, state);

        buffer = parts.slice(expectedParts).join('\r\n');
      }
    });

    socket.on("end", () => {
      handlers.cleanup({}, socket);
      console.log("Client disconnected");
    });

    socket.on("error", (err) => {
      console.error("Socket error:", err.message);
    });
  });

  return server;
}

module.exports = { createServer };