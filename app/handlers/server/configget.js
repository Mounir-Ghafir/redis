const encoder = require("../../encoder");

function configGet(args, socket, state, serverInfo) {
  const param = args[2]?.toLowerCase();
  
  if (param === "dir") {
    encoder.writeArray(socket, ["dir", serverInfo?.dir || process.cwd()]);
  } else if (param === "dbfilename") {
    encoder.writeArray(socket, ["dbfilename", serverInfo?.dbfilename || ""]);
  } else if (param === "appendonly") {
    encoder.writeArray(socket, ["appendonly", serverInfo?.appendonly || "no"]);
  } else if (param === "appenddirname") {
    encoder.writeArray(socket, ["appenddirname", serverInfo?.appenddirname || "appendonlydir"]);
  } else if (param === "appendfilename") {
    encoder.writeArray(socket, ["appendfilename", serverInfo?.appendfilename || "appendonly.aof"]);
  } else if (param === "appendfsync") {
    encoder.writeArray(socket, ["appendfsync", serverInfo?.appendfsync || "everysec"]);
  } else {
    encoder.writeArray(socket, [param, ""]);
  }
}

module.exports = { configGet };