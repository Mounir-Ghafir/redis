const encoder = require("../../encoder");

function unknown(args, socket) {
  encoder.writeError(socket, "unknown command");
}

module.exports = unknown;