const store = {};
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

function addWaitingClient(key, client) {
  if (!waitingClients[key]) waitingClients[key] = [];
  waitingClients[key].push(client);
}

function removeWaitingClient(key, socket) {
  if (!waitingClients[key]) return null;
  return waitingClients[key].filter(c => c.socket !== socket);
}

function getWaitingClients(key) {
  return waitingClients[key] || [];
}

function clearAll() {
  Object.keys(waitingClients).forEach(key => {
    waitingClients[key] = waitingClients[key].filter(c => c.socket);
  });
}

module.exports = {
  store,
  waitingClients,
  get,
  set,
  has,
  deleteKey,
  getKeys,
  addWaitingClient,
  removeWaitingClient,
  getWaitingClients,
  clearAll,
};