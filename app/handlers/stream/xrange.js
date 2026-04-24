const store = require("../../store");
const encoder = require("../../encoder");

function xrange(args, socket) {
  const key = args[4];
  const startArg = args[6];
  const endArg = args[8];

  const streamEntry = store.get(key);
  if (!streamEntry || streamEntry.type !== "stream") {
    encoder.writeArray(socket, []);
    return;
  }

  let startMs, startSeq;
  if (startArg === "-") {
    startMs = 0; startSeq = 0;
  } else {
    const [ms, seq] = startArg.split("-");
    startMs = parseInt(ms);
    startSeq = seq !== undefined ? parseInt(seq) : 0;
  }

  let endMs, endSeq;
  if (endArg === "+") {
    endMs = Infinity; endSeq = Infinity;
  } else {
    const [ms, seq] = endArg.split("-");
    endMs = parseInt(ms);
    endSeq = seq !== undefined ? parseInt(seq) : Infinity;
  }

  const entries = streamEntry.value.filter(({ id }) => {
    const [ms, seq] = id.split("-").map(Number);
    if (ms < startMs || ms > endMs) return false;
    if (ms === startMs && seq < startSeq) return false;
    if (ms === endMs && seq > endSeq) return false;
    return true;
  });

  encoder.writeStreamEntries(socket, entries);
}

module.exports = xrange;