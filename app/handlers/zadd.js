const encoder = require("../encoder");
const store = require("../store");

function zadd(args, socket) {
  const key = args[2];
  const score = parseFloat(args[4]);
  const member = args[6];
  
  if (!key || !member || isNaN(score)) {
    encoder.writeInteger(socket, 0);
    return;
  }
  
  const added = store.zadd(key, score, member);
  encoder.writeInteger(socket, added);
}

module.exports = { zadd };