const store = require("../store");
const encoder = require("../encoder");

function set(args, socket) {
  const key = args[4];
  const value = args[6];
  const pxIndex = args.findIndex(p => p.toUpperCase() === "PX");
  let expiry = null;

  if (pxIndex !== -1) {
    const duration = parseInt(args[pxIndex + 2]);
    expiry = Date.now() + duration;
  }

  store.set(key, { type: "string", value, expiry });
  encoder.writeSimpleString(socket, "OK");
}

module.exports = set;