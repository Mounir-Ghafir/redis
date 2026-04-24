const encoder = require("../encoder");

function configGet(args, socket, state, serverInfo) {
  const param = args[2]?.toLowerCase();
  
  if (param === "dir") {
    encoder.writeArray(socket, ["dir", serverInfo?.dir || ""]);
  } else if (param === "dbfilename") {
    encoder.writeArray(socket, ["dbfilename", serverInfo?.dbfilename || ""]);
  } else {
    encoder.writeArray(socket, [param, ""]);
  }
}

module.exports = { configGet };