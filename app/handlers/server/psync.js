const encoder = require("../../encoder");

const EMPTY_RDB = Buffer.from("UkVESVMwMDEx+glyZWRpcy12ZXIFNy4yLjD6CnJlZGlzLWJpdHPAQPoFY3RpbWXCbQi8ZfoIdXNlZC1tZW3CsMQQAPoIYW9mLWJhc2XAAP/wbjv+wP9aog==", "base64");

function psync(args, socket, state, serverInfo) {
  const replId = serverInfo?.replId || "8371b4fb1155b71f4a04d3e1bc3e18c4a990aeeb";
  encoder.writeSimpleString(socket, `FULLRESYNC ${replId} 0`);

  const length = EMPTY_RDB.length;
  socket.write(`$${length}\r\n`);
  socket.write(EMPTY_RDB);

  if (serverInfo && serverInfo.addReplica) {
    serverInfo.addReplica(socket);
  }
}

module.exports = { psync };