const store = require("../store");

function cleanup(args, socket) {
  store.removeClientFromAllKeys(socket);
}

module.exports = cleanup;