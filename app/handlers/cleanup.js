const store = require("../store");

function cleanup(args, socket) {
  store.clearAll();
}

module.exports = cleanup;