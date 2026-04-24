const encoder = require("../encoder");
const store = require("../store");

function geodist(args, socket) {
  const key = args[2];
  const member1 = args[4];
  const member2 = args[6];
  
  if (!key || !member1 || !member2) {
    encoder.writeBulkString(socket, null);
    return;
  }
  
  const distance = store.geodist(key, member1, member2);
  if (distance === null) {
    encoder.writeBulkString(socket, null);
  } else {
    encoder.writeBulkString(socket, distance);
  }
}

module.exports = { geodist };