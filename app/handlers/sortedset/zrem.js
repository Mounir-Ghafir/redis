const encoder = require("../../encoder");
const store = require("../../store");

function zrem(args, socket) {
  const key = args[2];
  const member = args[4];
  
  if (!key || !member) {
    encoder.writeInteger(socket, 0);
    return;
  }
  
  const removed = store.zrem(key, member);
  encoder.writeInteger(socket, removed);
}

module.exports = { zrem };