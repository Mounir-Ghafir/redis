const encoder = require("../../encoder");

function health(args, socket, state, serverInfo) {
  const connections = serverInfo.getActiveConnections ? serverInfo.getActiveConnections() : 0;
  const mem = serverInfo.getMemoryUsage ? serverInfo.getMemoryUsage() : { heapUsed: 0 };
  
  const output = JSON.stringify({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    connections: connections,
    memory: mem.heapUsed,
    timestamp: Date.now()
  });
  
  encoder.writeBulkString(socket, output);
}

function stats(args, socket, state, serverInfo) {
  const connections = serverInfo.getActiveConnections ? serverInfo.getActiveConnections() : 0;
  const replicasCount = serverInfo.getReplicaCount ? serverInfo.getReplicaCount() : 0;
  const mem = serverInfo.getMemoryUsage ? serverInfo.getMemoryUsage() : { heapUsed: 0, heapTotal: 0, rss: 0, external: 0 };
  
  const output = `total_connections_received:${connections}
total_commands_processed:${serverInfo.replOffset || 0}
instantaneous_ops_per_sec:0
connected_clients:${connections}
blocked_clients:0
connected_slaves:${replicasCount}
used_memory:${mem.heapUsed}
used_memory_lua:${mem.heapTotal}
used_memory_rss:${mem.rss}
used_memory_peak:${mem.heapTotal}
maxmemory:${0}
maxmemory_policy:${serverInfo.maxmemoryPolicy || "noeviction"}`;
  
  encoder.writeBulkString(socket, output);
}

module.exports = { health, stats };