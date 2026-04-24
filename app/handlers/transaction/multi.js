const encoder = require("../../encoder");

function multi(args, socket, state, serverInfo) {
  state.inTransaction = true;
  state.queuedCommands = [];
  encoder.writeSimpleString(socket, "OK");
}

module.exports = multi;