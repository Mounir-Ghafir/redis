const encoder = require("../../encoder");
const store = require("../../store");

function aclWhoami(args, socket, state) {
  const user = store.getAuthenticatedUser(socket) || "default";
  encoder.writeBulkString(socket, user);
}

module.exports = { aclWhoami };