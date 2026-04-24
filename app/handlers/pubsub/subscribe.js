const encoder = require("../../encoder");

function subscribe(args, socket, state, serverInfo) {
  const channel = args[2];
  if (!channel) return;

  if (!state.subscriptions) {
    state.subscriptions = new Set();
  }
  state.subscriptions.add(channel);
  state.inSubscribeMode = true;

  const count = state.subscriptions.size;
  encoder.writeArray(socket, ["subscribe", channel, count]);

  if (serverInfo && serverInfo.addSubscription) {
    serverInfo.addSubscription(channel, socket);
  }
}

module.exports = { subscribe };