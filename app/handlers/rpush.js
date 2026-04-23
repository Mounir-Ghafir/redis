const store = require("../store");
const encoder = require("../encoder");

function rpush(args, socket) {
  const key = args[4];
  const elements = [];

  for (let i = 6; i < args.length; i += 2) {
    elements.push(args[i]);
  }

  let entry = store.get(key);
  if (!entry) {
    entry = { type: "list", value: [], expiry: null };
    store.set(key, entry);
  }

  entry.value.push(...elements);
  encoder.writeInteger(socket, entry.value.length);

  handleWaitingClients(key);
}

function handleWaitingClients(key) {
  const entry = store.get(key);
  const waiting = store.getWaitingClients(key);

  while (waiting && waiting.length > 0 && entry.value.length > 0) {
    const waiter = waiting[0];
    if (waiter.type === "BLPOP") {
      waiting.shift();
      if (waiter.timeoutId) clearTimeout(waiter.timeoutId);
      const poppedValue = entry.value.shift();
      encoder.writeKeyValue(waiter.socket, key, poppedValue);
    } else {
      break; 
    }
  }
}

module.exports = rpush;