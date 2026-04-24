const encoder = require("../encoder");
const store = require("../store");

function zrank(args, socket) {
  const key = args[2];
  const member = args[4];
  
  if (!key || !member) {
    encoder.writeBulkString(socket, null);
    return;
  }
  
  const rank = store.zrank(key, member);
  if (rank === null) {
    encoder.writeBulkString(socket, null);
  } else {
    encoder.writeInteger(socket, rank);
  }
}

module.exports = { zrank };