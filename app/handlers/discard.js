const encoder = require("../encoder");

function discard(args, socket, state) {
  if (!state.inTransaction) {
    encoder.writeError(socket, "DISCARD without MULTI");
    return;
  }

  state.inTransaction = false;
  state.queuedCommands = [];
  encoder.writeSimpleString(socket, "OK");
}

module.exports = discard;