const store = require("../../store");

function cleanup(args, socket, state, serverInfo) {
  store.removeClientFromAllKeys(socket);
  
  if (state.subscriptions && serverInfo && serverInfo.removeSubscription) {
    for (const channel of state.subscriptions) {
      serverInfo.removeSubscription(channel, socket);
    }
  }
}

module.exports = cleanup;