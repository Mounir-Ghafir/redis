const store = {};
const dirty = {};
const waitingClients = {};

function get(key) {
  return store[key];
}

function set(key, value) {
  store[key] = value;
}

function has(key) {
  return key in store;
}

function deleteKey(key) {
  delete store[key];
}

function getKeys() {
  return Object.keys(store);
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
};