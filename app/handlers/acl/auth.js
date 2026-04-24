const crypto = require("crypto");
const encoder = require("../../encoder");
const store = require("../../store");

function auth(args, socket, state, serverInfo) {
  const username = args[2];
  const password = args[4];
  
  if (!username || !password) {
    encoder.writeError(socket, "WRONGPASS invalid username-password pair or user is disabled.");
    return;
  }
  
  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  const success = store.authenticate(socket, username, passwordHash);
  
  if (success) {
    store.setAuthenticatedUser(socket, username);
    encoder.writeSimpleString(socket, "OK");
  } else {
    encoder.writeError(socket, "WRONGPASS invalid username-password pair or user is disabled.");
  }
}

module.exports = { auth };