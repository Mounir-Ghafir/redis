const store = require("../store");
const encoder = require("../encoder");

function writeSimpleString(socket, content) {
  socket.write(`+${content}\r\n`);
}

function writeBulkString(socket, content) {
  if (content === null) {
    socket.write("$-1\r\n");
  } else {
    socket.write(`$${content.length}\r\n${content}\r\n`);
  }
}

function get(args, socket) {
  const key = args[4];
  const entry = store.get(key);

  if (!entry || (entry.expiry && Date.now() > entry.expiry)) {
    if (entry) store.deleteKey(key);
    encoder.writeBulkString(socket, null);
    return;
  }
  encoder.writeBulkString(socket, entry.value);
}

module.exports = get;