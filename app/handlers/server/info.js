const encoder = require("../../encoder");

function info(args, socket, state, serverInfo) {
  const section = args[4]?.toLowerCase();
  const mem = serverInfo.getMemoryUsage ? serverInfo.getMemoryUsage() : { heapUsed: 0, heapTotal: 0, rss: 0 };
  const connections = serverInfo.getActiveConnections ? serverInfo.getActiveConnections() : 0;
  const replicas = serverInfo.getReplicaCount ? serverInfo.getReplicaCount() : 0;

  if (section === "replication") {
    const role = state.isReplica ? "slave" : "master";
    const replId = serverInfo.replId || "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb";
    const replOffset = serverInfo.replOffset || 0;
    const output = `role:${role}\nmaster_replid:${replId}\nmaster_repl_offset:${replOffset}`;
    encoder.writeBulkString(socket, output);
  } else if (section === "stats") {
    const output = `total_connections_received:${connections}\ntotal_commands_processed:${replOffset}\nconnected_slaves:${replicas}`;
    encoder.writeBulkString(socket, output);
  } else if (section === "memory") {
    const output = `used_memory:${mem.heapUsed}\nused_memory_lua:${mem.heapTotal}\nmemory_resident:${mem.rss}`;
    encoder.writeBulkString(socket, output);
  } else if (section === "clients") {
    const output = `connected_clients:${connections}\nblocked_clients:0\nconnected_slaves:${replicas}`;
    encoder.writeBulkString(socket, output);
  } else {
    const output = `redis_version:1.0.0\nrole:master\nconnected_clients:${connections}\ntotal_connections_received:${connections}\ntotal_commands_processed:${replOffset}\nused_memory:${mem.heapUsed}\nmemory_resident:${mem.rss}\nconnected_slaves:${replicas}`;
    encoder.writeBulkString(socket, output);
  }
}

module.exports = { info };