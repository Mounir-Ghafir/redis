const encoder = require("../../encoder");
const store = require("../../store");

function zcard(args, socket) {
  const key = args[2];
  
  if (!key) {
    encoder.writeInteger(socket, 0);
    return;
  }
  
  const count = store.zcard(key);
  encoder.writeInteger(socket, count);
}

module.exports = { zcard };