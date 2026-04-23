const store = require("../store");
const encoder = require("../encoder");

function lpop(args, socket) {
  const key = args[4];
  const count = args[6] ? parseInt(args[6]) : null;
  const entry = store.get(key);

  if (!entry || !Array.isArray(entry.value) || entry.value.length === 0) {
    encoder.writeBulkString(socket, null);
    return;
  }

  if (count === null) {
    const removedItem = entry.value.shift();
    encoder.writeBulkString(socket, removedItem);
    if (entry.value.length === 0) store.deleteKey(key);
    return;
  }

  const numToRemove = Math.min(count, entry.value.length);
  const removedItems = entry.value.splice(0, numToRemove);

  if (removedItems.length === 1) {
    encoder.writeBulkString(socket, removedItems[0]);
  } else {
    encoder.writeArray(socket, removedItems);
  }

  if (entry.value.length === 0) store.deleteKey(key);
}

module.exports = lpop;