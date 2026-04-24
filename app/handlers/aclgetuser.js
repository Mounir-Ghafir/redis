const encoder = require("../encoder");
const store = require("../store");

function aclGetuser(args, socket, state) {
  const username = args[2] || "default";
  const result = store.aclGetuser(username);
  
  if (!result) {
    encoder.writeArray(socket, []);
    return;
  }
  
  encoder.writeArray(socket, [result[0], result[1], result[2], result[3]]);
}

module.exports = { aclGetuser };