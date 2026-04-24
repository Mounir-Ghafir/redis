const encoder = require("../encoder");

function wait(args, socket, state, serverInfo) {
  const numReplicas = parseInt(args[2]);
  const getReplicaCount = serverInfo?.getReplicaCount?.() || 0;
  
  if (numReplicas === 0 || getReplicaCount === 0) {
    encoder.writeInteger(socket, getReplicaCount);
    return;
  }

  const replicas = serverInfo?.getReplicas?.() || [];
  const offset = serverInfo?.replOffset || 0;

  if (offset === 0) {
    encoder.writeInteger(socket, replicas.length);
    return;
  }

  for (const replica of replicas) {
    try {
      replica.write("*3\r\n$8\r\nREPLCONF\r\n$6\r\ngetack\r\n$1\r\n*\r\n");
    } catch (e) {
      console.error("Failed to send GETACK:", e.message);
    }
  }

  setTimeout(() => {
    encoder.writeInteger(socket, replicas.length);
  }, 400);
}

module.exports = { wait };