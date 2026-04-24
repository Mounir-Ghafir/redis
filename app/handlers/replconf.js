const encoder = require("../encoder");

function replconf(args, socket, state, serverInfo) {
  const command = args[4]?.toUpperCase();
  if (command === "GETACK") {
    const offset = serverInfo?.replOffset || 0;
    encoder.writeArray(socket, ["REPLCONF", "ACK", offset.toString()]);
  } else {
    encoder.writeSimpleString(socket, "OK");
  }
}

module.exports = { replconf };