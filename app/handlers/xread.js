const store = require("../store");
const encoder = require("../encoder");

function xread(args, socket) {
  const streamsIndex = args.findIndex(a => a && a.toUpperCase() === "STREAMS");
  if (streamsIndex === -1) {
    encoder.writeError(socket, "syntax error");
    return;
  }

  const remaining = args.slice(streamsIndex + 1).filter(a => a !== "");
  const half = remaining.length / 2;
  const keys = remaining.slice(0, half);
  const ids = remaining.slice(half);

  const results = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const idArg = ids[i];
    const streamEntry = store.get(key);

    const [msStr, seqStr] = idArg.split("-");
    const startMs = parseInt(msStr);
    const startSeq = seqStr !== undefined ? parseInt(seqStr) : 0;

    const entries = (streamEntry && streamEntry.type === "stream")
      ? streamEntry.value.filter(({ id }) => {
          const [ms, seq] = id.split("-").map(Number);
          if (ms > startMs) return true;
          if (ms === startMs && seq > startSeq) return true;
          return false;
        })
      : [];

    results.push({ key, entries });
  }

  let response = `*${results.length}\r\n`;

  for (const { key, entries } of results) {
    response += `*2\r\n$${key.length}\r\n${key}\r\n`;
    response += `*${entries.length}\r\n`;
    for (const entry of entries) {
      const pairs = Object.entries(entry.fields).flat();
      response += `*2\r\n$${entry.id.length}\r\n${entry.id}\r\n`;
      response += `*${pairs.length}\r\n`;
      for (const part of pairs) {
        response += `$${part.length}\r\n${part}\r\n`;
      }
    }
  }

  socket.write(response);
}

module.exports = xread;