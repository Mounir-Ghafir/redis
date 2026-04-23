const encoder = require("../encoder");

function echo(args, socket) {
  const content = args[4];
  encoder.writeBulkString(socket, content);
}

module.exports = echo;