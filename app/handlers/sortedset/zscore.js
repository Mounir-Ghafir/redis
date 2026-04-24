const encoder = require("../../encoder");
const store = require("../../store");

function zscore(args, socket) {
  const key = args[2];
  const member = args[4];
  
  if (!key || !member) {
    encoder.writeBulkString(socket, null);
    return;
  }
  
  const score = store.zscore(key, member);
  if (score === null) {
    encoder.writeBulkString(socket, null);
  } else {
    encoder.writeBulkString(socket, score);
  }
}

module.exports = { zscore };