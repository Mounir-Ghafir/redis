const encoder = require("../encoder");

function unsubscribe(args, socket, state, serverInfo) {
  const channel = args[2];
  
  if (!state.subscriptions || !channel) {
    encoder.writeArray(socket, ["unsubscribe", channel || "", 0]);
    return;
  }

  state.subscriptions.delete(channel);
  const remaining = state.subscriptions.size;
  state.inSubscribeMode = remaining > 0;

  encoder.writeArray(socket, ["unsubscribe", channel, remaining]);

  if (serverInfo && serverInfo.removeSubscription) {
    serverInfo.removeSubscription(channel, socket);
  }
}

module.exports = { unsubscribe };