const store = require("../../store");
const encoder = require("../../encoder");

function lrange(args, socket) {
  const key = args[4];
  let start = parseInt(args[6]);
  let stop = parseInt(args[8]);
  const entry = store.get(key);

  if (!entry || !Array.isArray(entry.value)) {
    encoder.writeArray(socket, []);
    return;
  }

  const list = entry.value;
  if (start < 0) start = Math.max(0, list.length + start);
  if (stop < 0) stop = list.length + stop;
  if (stop >= list.length) stop = list.length - 1;

  if (start >= list.length || start > stop) {
    encoder.writeArray(socket, []);
    return;
  }

  const slice = list.slice(start, stop + 1);
  encoder.writeArray(socket, slice);
}

module.exports = lrange;