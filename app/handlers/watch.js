const encoder = require("../encoder");
const store = require("../store");

function watch(args, socket, state, serverInfo) {
  console.log("WATCH called, inTransaction:", state.inTransaction);
  if (state.inTransaction) {
    encoder.writeError(socket, "WATCH inside MULTI is not allowed");
    return;
  }

  const numArgs = parseInt(args[0]?.slice(1)) - 1;
  const keys = [];
  for (let i = 0; i < numArgs; i++) {
    keys.push(args[4 + i * 2]);
  }

  if (!state.watchedKeys) {
    state.watchedKeys = new Map();
  }

  for (const key of keys) {
    store.clearDirty(key);
    const value = store.get(key);
    state.watchedKeys.set(key, { value: value ? JSON.stringify(value) : null, dirty: false });
  }

  encoder.writeSimpleString(socket, "OK");
}

module.exports = watch;