const store = require("../store");
const encoder = require("../encoder");

function xadd(args, socket) {
  const key = args[4];
  let id = args[6];
  const fields = {};
  
  let [msStr, seqStr] = id.split("-");
  let newMs = parseInt(msStr);
  let newSeq;

  const streamEntry = store.get(key);
  const lastEntry = streamEntry && streamEntry.value.length > 0 
    ? streamEntry.value[streamEntry.value.length - 1] 
    : null;

  if (seqStr === "*") {
    if (lastEntry) {
      const [lastMs, lastSeq] = lastEntry.id.split("-").map(Number);
      if (newMs === lastMs) {
        newSeq = lastSeq + 1;
      } else if (newMs > lastMs) {
        newSeq = 0;
      } else {
        encoder.writeError(socket, "The ID specified in XADD is equal or smaller than the target stream top item");
        return;
      }
    } else {
      newSeq = (newMs === 0) ? 1 : 0;
    }
    id = `${newMs}-${newSeq}`;
  } else {
    newSeq = parseInt(seqStr);
    if (newMs === 0 && newSeq === 0) {
      encoder.writeError(socket, "The ID specified in XADD must be greater than 0-0");
      return;
    }
    if (lastEntry) {
      const [lastMs, lastSeq] = lastEntry.id.split("-").map(Number);
      if (newMs < lastMs || (newMs === lastMs && newSeq <= lastSeq)) {
        encoder.writeError(socket, "The ID specified in XADD is equal or smaller than the target stream top item");
        return;
      }
    }
  }

  for (let i = 8; i < args.length; i += 4) {
    const fieldKey = args[i];
    const fieldValue = args[i + 2];
    if (fieldKey && fieldValue) fields[fieldKey] = fieldValue;
  }

  let entry = streamEntry;
  if (!entry) {
    entry = { type: "stream", value: [], expiry: null };
    store.set(key, entry);
  }

  entry.value.push({ id, fields });
  encoder.writeBulkString(socket, id);
}

module.exports = xadd;