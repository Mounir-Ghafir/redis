const encoder = require("../encoder");
const store = require("../store");

function zrange(args, socket) {
  const key = args[2];
  const start = parseInt(args[4]);
  const stop = parseInt(args[6]);
  
  if (!key) {
    encoder.writeArray(socket, []);
    return;
  }
  
  const members = store.zrange(key, start, stop);
  encoder.writeArray(socket, members);
}

module.exports = { zrange };