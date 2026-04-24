const store = require("../store");
const encoder = require("../encoder");

function incr(args, socket) {
  const key = args[4];
  const entry = store.get(key);

  if (!entry || (entry.expiry && Date.now() > entry.expiry)) {
    store.set(key, { type: "string", value: "1", expiry: null });
    encoder.writeInteger(socket, 1);
    return;
  }

  if (entry && entry.type === "string") {
    const num = parseInt(entry.value, 10);
    if (isNaN(num)) {
      encoder.writeError(socket, "value is not an integer or out of range");
      return;
    }
    const newValue = num + 1;
    store.set(key, { type: "string", value: String(newValue), expiry: entry.expiry });
    encoder.writeInteger(socket, newValue);
    return;
  }

  encoder.writeError(socket, "value is not an integer or out of range");
}

module.exports = incr;