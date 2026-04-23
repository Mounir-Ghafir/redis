const store = require("../store");
const encoder = require("../encoder");

function llen(args, socket) {
  const key = args[4];
  const entry = store.get(key);

  if (!entry || !Array.isArray(entry.value)) {
    encoder.writeInteger(socket, 0);
  } else {
    encoder.writeInteger(socket, entry.value.length);
  }
}

module.exports = llen;