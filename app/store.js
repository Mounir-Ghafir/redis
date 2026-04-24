const fs = require("fs");
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
};