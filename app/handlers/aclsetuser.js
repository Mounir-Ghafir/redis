const crypto = require("crypto");
const encoder = require("../encoder");
const store = require("../store");

function aclSetuser(args, socket, state) {
  const username = args[2];
  let passwordHash = null;
  
  for (let i = 4; i < args.length; i++) {
    if (args[i] && args[i].startsWith(">")) {
      const password = args[i].slice(1);
      passwordHash = crypto.createHash("sha256").update(password).digest("hex");
      break;
    }
  }
  
  if (!username) {
    encoder.writeSimpleString(socket, "OK");
    return;
  }
  
  if (passwordHash) {
    store.aclSetuser(username, passwordHash);
  }
  
  encoder.writeSimpleString(socket, "OK");
}

module.exports = { aclSetuser };