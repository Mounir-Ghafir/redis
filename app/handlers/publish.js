const encoder = require("../encoder");

function publish(args, socket, state, serverInfo) {
  const channel = args[2];
  const message = args[4];
  
  if (!channel) {
    encoder.writeInteger(socket, 0);
    return;
  }

  const subscribers = serverInfo?.getSubscribers?.(channel) || [];
  
  for (const client of subscribers) {
    try {
      const clientSocket = client.socket || client;
      encoder.writeArray(clientSocket, ["message", channel, message]);
    } catch (e) {
      // Ignore delivery errors
    }
  }

  encoder.writeInteger(socket, subscribers.length);
}

module.exports = { publish };