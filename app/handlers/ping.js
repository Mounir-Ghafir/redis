const encoder = require("../encoder");

function ping(args, socket) {
  encoder.writeSimpleString(socket, "PONG");
}

module.exports = ping;