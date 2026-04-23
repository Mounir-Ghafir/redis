const store = require("../store");
const encoder = require("../encoder");

function blpop(args, socket) {
  const key = args[4];
  const timeoutSeconds = parseFloat(args[6]);
  const entry = store.get(key);

  if (entry && Array.isArray(entry.value) && entry.value.length > 0) {
    const poppedValue = entry.value.shift();
    encoder.writeKeyValue(socket, key, poppedValue);
  } else {
    const timeoutId = timeoutSeconds > 0
      ? setTimeout(() => {
          store.removeWaitingClient(key, socket);
          encoder.writeArray(socket, null);
        }, timeoutSeconds * 1000)
      : null;

    store.addWaitingClient(key, { socket, timeoutId, type: "BLPOP" });
  }
}

module.exports = blpop;