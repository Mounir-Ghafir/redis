const encoder = require("../../encoder");

function info(args, socket, state, serverInfo) {
  const section = args[4]?.toLowerCase();

  if (section === "replication") {
    const role = state.isReplica ? "slave" : "master";
    const replId = serverInfo.replId || "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb";
    const replOffset = serverInfo.replOffset || 0;
    const output = `role:${role}\nmaster_replid:${replId}\nmaster_repl_offset:${replOffset}`;
    encoder.writeBulkString(socket, output);
  } else {
    encoder.writeBulkString(socket, "role:master");
  }
}

module.exports = { info };