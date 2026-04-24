const fs = require("fs");
const path = require("path");
const handlers = require("./handlers");
const store = {};
const dirty = {};
const waitingClients = {};

function get(key) {
  const entry = store[key];
  if (!entry) return null;
  if (entry.expiry && entry.expiry < Date.now()) {
    delete store[key];
    return null;
  }
  return entry;
}

function set(key, value) {
  store[key] = value;
}

function has(key) {
  return get(key) !== null;
}

function deleteKey(key) {
  delete store[key];
}

function getKeys() {
  const keys = [];
  for (const key in store) {
    if (get(key)) {
      keys.push(key);
    }
  }
  return keys;
}

function markDirty(key) {
  dirty[key] = true;
}

function clearDirty(key) {
  delete dirty[key];
}

function isDirty(key) {
  return !!dirty[key];
}

function addWaitingClient(key, client) {
  if (!waitingClients[key]) waitingClients[key] = [];
  waitingClients[key].push(client);
}

function removeWaitingClient(key, socket) {
  if (!waitingClients[key]) return;
  waitingClients[key] = waitingClients[key].filter(c => c.socket !== socket);
}

function getWaitingClients(key) {
  return waitingClients[key] || [];
}

function clearWaitingClients(key) {
  delete waitingClients[key];
}

function clearAll() {
  Object.keys(waitingClients).forEach(key => {
    waitingClients[key] = [];
  });
}

function removeClientFromAllKeys(socket) {
  Object.keys(waitingClients).forEach(key => {
    waitingClients[key] = waitingClients[key].filter(c => c.socket !== socket);
  });
}

const RDB_OPCODE_EXPIRE_MS = 252;
const RDB_OPCODE_EXPIRE_SEC = 253;
const RDB_OPCODE_DB = 254;
const RDB_OPCODE_EOF = 255;
const RDB_TYPE_STRING = 0;

function loadRdbFile(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    let pos = 0;
    
    if (data.length < 4) return;
    if (data[pos] !== 0x52 || data[pos+1] !== 0x45 || data[pos+2] !== 0x44 || data[pos+3] !== 0x49) {
      return;
    }
    pos += 4;
    
    while (pos < data.length) {
      const optType = data[pos++];
      
      if (optType === RDB_OPCODE_EOF) {
        break;
      }
      
      if (optType === RDB_OPCODE_DB) {
        const dbSize = data.readUInt16BE(pos);
        pos += 2;
        
        for (let i = 0; i < dbSize; i++) {
          const key = readString(data, pos);
          pos += 1 + key.length;
          const value = readString(data, pos);
          pos += 1 + value.length;
          store[key] = { type: "string", value: value, expiry: null };
        }
      }
      
      if (optType === RDB_OPCODE_EXPIRE_MS) {
        const expiryMs = Number(data.readBigUInt64BE(pos));
        pos += 8;
        const key = readString(data, pos);
        pos += 1 + key.length;
        const value = readString(data, pos);
        pos += 1 + value.length;
        store[key] = { type: "string", value: value, expiry: expiryMs };
      }
    }
  } catch (e) {
    // File doesn't exist or is invalid, treat as empty
  }
}

function readString(data, pos) {
  const lenByte = data[pos];
  let len;
  
  if (lenByte < 0xC0) {
    len = lenByte;
  } else if (lenByte === 0xC0) {
    len = data.readUInt8(pos + 1);
  } else if (lenByte === 0xC1) {
    len = data.readUInt16BE(pos + 1);
  } else if (lenByte >= 0xC2) {
    return "";
  }
  
  const str = data.slice(pos + 1, pos + 1 + len).toString();
  return str;
}

function replayAof(aofDir, appendFilename) {
  try {
    const manifestPath = path.join(aofDir, appendFilename + ".manifest");
    if (!fs.existsSync(manifestPath)) return;
    
    const manifest = fs.readFileSync(manifestPath, "utf8");
    const match = manifest.match(/file\s+(\S+)\s+seq\s+(\d+)\s+type\s+(\w)/);
    if (!match) return;
    
    const aofPath = path.join(aofDir, match[1]);
    if (!fs.existsSync(aofPath)) return;
    
    const aofData = fs.readFileSync(aofPath, "utf8");
    let pos = 0;
    
    while (pos < aofData.length) {
      if (aofData[pos] !== '*') break;
      
      const lineEnd = aofData.indexOf('\r\n', pos);
      if (lineEnd === -1) break;
      
      const numArgs = parseInt(aofData.slice(pos + 1, lineEnd));
      if (isNaN(numArgs)) break;
      
      pos = lineEnd + 2;
      const parts = [];
      
      for (let i = 0; i < numArgs; i++) {
        if (aofData[pos] !== '$') break;
        const lenEnd = aofData.indexOf('\r\n', pos);
        if (lenEnd === -1) break;
        
        const len = parseInt(aofData.slice(pos + 1, lenEnd));
        pos = lenEnd + 2;
        const value = aofData.slice(pos, pos + len);
        parts.push(value);
        pos += len + 2;
      }
      
      if (parts.length > 0) {
        const handler = handlers[parts[0].toLowerCase()];
        if (handler) {
          handler(parts, { write: () => {} }, { inTransaction: false, queuedCommands: [] }, {});
        }
      }
    }
  } catch (e) {
    // Ignore AOF replay errors
  }
}

function zadd(key, score, member) {
  if (!store[key]) {
    store[key] = { type: "zset", members: new Map() };
  }
  if (store[key].type !== "zset") {
    return 0;
  }
  
  const zset = store[key];
  const isNew = !zset.members.has(member);
  zset.members.set(member, score);
  return isNew ? 1 : 0;
}

function zrank(key, member) {
  if (!store[key] || store[key].type !== "zset") {
    return null;
  }
  
  const zset = store[key];
  if (!zset.members.has(member)) {
    return null;
  }
  
  const sorted = Array.from(zset.members.entries()).sort((a, b) => {
    if (a[1] !== b[1]) return a[1] - b[1];
    return a[0].localeCompare(b[0]);
  });
  
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i][0] === member) {
      return i;
    }
  }
  return null;
}

function zrange(key, start, stop) {
  if (!store[key] || store[key].type !== "zset") {
    return [];
  }
  
  const zset = store[key];
  const sorted = Array.from(zset.members.entries()).sort((a, b) => {
    if (a[1] !== b[1]) return a[1] - b[1];
    return a[0].localeCompare(b[0]);
  });
  
  let startIdx = start;
  let stopIdx = stop;
  
  if (startIdx < 0) startIdx = sorted.length + startIdx;
  if (stopIdx < 0) stopIdx = sorted.length + stopIdx;
  
  if (startIdx < 0) startIdx = 0;
  if (stopIdx < 0) stopIdx = 0;
  if (startIdx >= sorted.length) return [];
  if (stopIdx >= sorted.length) stopIdx = sorted.length - 1;
  if (startIdx > stopIdx) return [];
  
  const result = [];
  for (let i = startIdx; i <= stopIdx && i < sorted.length; i++) {
    result.push(sorted[i][0]);
  }
  return result;
}

function zcard(key) {
  if (!store[key] || store[key].type !== "zset") {
    return 0;
  }
  return store[key].members.size;
}

function zscore(key, member) {
  if (!store[key] || store[key].type !== "zset") {
    return null;
  }
  const zset = store[key];
  if (!zset.members.has(member)) {
    return null;
  }
  return zset.members.get(member).toString();
}

function zrem(key, member) {
  if (!store[key] || store[key].type !== "zset") {
    return 0;
  }
  const zset = store[key];
  if (!zset.members.has(member)) {
    return 0;
  }
  zset.members.delete(member);
  return 1;
}

module.exports = {
  store,
  dirty,
  get,
  set,
  has,
  deleteKey,
  getKeys,
  markDirty,
  clearDirty,
  isDirty,
  addWaitingClient,
  removeWaitingClient,
  getWaitingClients,
  clearWaitingClients,
  clearAll,
  removeClientFromAllKeys,
  loadRdbFile,
  replayAof,
  zadd,
  zrank,
  zrange,
  zcard,
  zscore,
  zrem,
};