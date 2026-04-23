const store = require("../store");
const encoder = require("../encoder");

function xread(args, socket) {
  const values = args.filter((_, i) => i % 2 === 0 && i >= 2);
  const streamsIndex = values.findIndex(v => v && v.toUpperCase() === "STREAMS");

  if (streamsIndex === -1) {
    encoder.writeError(socket, "syntax error");
    return;
  }

  const remaining = values.slice(streamsIndex + 1);
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

    if (entries.length > 0) {
      results.push({ key, entries });
    }
  }

  if (results.length === 0) {
    encoder.writeBulkString(socket, null);
    return;
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
        const partStr = part.toString();
        response += `$${partStr.length}\r\n${partStr}\r\n`;
      }
    }
  }

  socket.write(response);
}

module.exports = xread;