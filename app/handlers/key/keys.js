const encoder = require("../../encoder");
const store = require("../../store");

function keys(args, socket) {
  const pattern = args[2];
  const allKeys = store.getKeys();
  
  if (pattern === "*" || !pattern) {
    const response = [`*${allKeys.length}\r\n`];
    for (const key of allKeys) {
      response.push(`$${key.length}\r\n${key}\r\n`);
    }
    encoder.writeArray(socket, allKeys);
  } else {
    encoder.writeArray(socket, []);
  }
}

module.exports = { keys };