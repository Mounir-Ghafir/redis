const store = require("../store");
const encoder = require("../encoder");

function get(args, socket) {
  const key = args[4];
  const entry = store.get(key);

  if (!entry || (entry.expiry && Date.now() > entry.expiry)) {
    if (entry) store.deleteKey(key);
    encoder.writeBulkString(socket, null);
  } else {
    encoder.writeBulkString(socket, entry.value);
  }
}

module.exports = get;