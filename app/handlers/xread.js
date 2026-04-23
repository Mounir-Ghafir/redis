const store = require("../store");
const encoder = require("../encoder");

function getResults(keys, idsOrMarkers) {
  const results = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    let idArg = idsOrMarkers[i];
    const streamEntry = store.get(key);

    // Handle special '$' ID - resolve to current max at check time
    if (idArg === "$") {
      if (streamEntry && streamEntry.type === "stream" && streamEntry.value.length > 0) {
        idArg = streamEntry.value[streamEntry.value.length - 1].id;
      } else {
        idArg = "0-0";
      }
    }

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
  return results;
}

function writeResponse(socket, results) {
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

function xread(args, socket) {
  const values = args.filter((_, i) => i % 2 === 0 && i >= 2);
  const blockIndex = values.findIndex(v => v && v.toUpperCase() === "BLOCK");
  const streamsIndex = values.findIndex(v => v && v.toUpperCase() === "STREAMS");

  if (streamsIndex === -1) {
    encoder.writeError(socket, "syntax error");
    return;
  }

  const keysIds = values.slice(streamsIndex + 1);
  if (keysIds.length % 2 !== 0) {
    encoder.writeError(socket, "syntax error");
    return;
  }
  const half = keysIds.length / 2;
  const keys = keysIds.slice(0, half);
  let ids = keysIds.slice(half);

  const immediateResults = getResults(keys, ids);

  if (immediateResults.length > 0) {
    writeResponse(socket, immediateResults);
    return;
  }

  if (blockIndex !== -1) {
    const timeoutValue = values[blockIndex + 1];
    const timeoutMs = timeoutValue !== undefined ? parseInt(timeoutValue) : NaN;
    
    // Preserve original IDs (including '$' marker) for resolution at check time
    const rawIds = keysIds.slice(half);
    
    const clientData = {
      socket,
      type: "XREAD",
      keys,
      ids: rawIds,
      timeoutId: null
    };

    if (!isNaN(timeoutMs) && timeoutMs > 0) {
      clientData.timeoutId = setTimeout(() => {
        // Remove from all keys
        keys.forEach(k => store.removeWaitingClient(k, socket));
        encoder.writeBulkString(socket, null);
      }, timeoutMs);
    } else if (timeoutMs === 0 || isNaN(timeoutMs)) {
      // Wait indefinitely if BLOCK 0 or just BLOCK is provided
    }

    keys.forEach(key => store.addWaitingClient(key, clientData));
    return;
  }

  encoder.writeBulkString(socket, null);
}

module.exports = {
  xread,
  getResults,
  writeResponse
};