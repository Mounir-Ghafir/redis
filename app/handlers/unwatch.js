const encoder = require("../encoder");

function unwatch(args, socket, state) {
  state.watchedKeys = null;
  encoder.writeSimpleString(socket, "OK");
}

module.exports = unwatch;