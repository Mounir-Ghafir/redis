const store = require("../../store");
const encoder = require("../../encoder");

function type(args, socket) {
  const key = args[4];
  const entry = store.get(key);

  if (!entry || (entry.expiry && Date.now() > entry.expiry)) {
    if (entry) store.deleteKey(key);
    encoder.writeSimpleString(socket, "none");
    return;
  }

  let typeName;
  if (entry.type === "stream") {
    typeName = "stream";
  } else if (Array.isArray(entry.value)) {
    typeName = "list";
  } else if (typeof entry.value === "string") {
    typeName = "string";
  } else {
    typeName = "none";
  }

  encoder.writeSimpleString(socket, typeName);
}

module.exports = type;