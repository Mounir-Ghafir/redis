const encoder = require("../../encoder");

function ping(args, socket, state) {
  if (state.inSubscribeMode) {
    encoder.writeArray(socket, ["pong", ""]);
  } else {
    encoder.writeSimpleString(socket, "PONG");
  }
}

module.exports = ping;