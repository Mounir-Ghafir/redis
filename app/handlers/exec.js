const encoder = require("../encoder");
const store = require("../store");

const setHandler = require("./set");
const getHandler = require("./get");
const incrHandler = require("./incr");

function exec(args, socket, state, serverInfo) {
  if (!state.inTransaction) {
    encoder.writeError(socket, "EXEC without MULTI");
    return;
  }

  let anyDirty = false;
  if (state.watchedKeys) {
    for (const [key, watchData] of state.watchedKeys) {
      if (store.isDirty(key)) {
        anyDirty = true;
        break;
      }
    }
  }

  if (anyDirty) {
    state.inTransaction = false;
    state.queuedCommands = [];
    state.watchedKeys = null;
    encoder.writeNullArray(socket);
    return;
  }

  const responses = [];

  for (const parts of state.queuedCommands) {
    const numArgs = parseInt(parts[0]?.slice(1));
    const expectedParts = 1 + numArgs * 2;
    const cmdParts = parts.slice(0, expectedParts);
    const command = cmdParts[2]?.toUpperCase();
    const commandLower = command?.toLowerCase();
    
    let handler;
    switch (commandLower) {
      case 'set': handler = setHandler; break;
      case 'get': handler = getHandler; break;
      case 'incr': handler = incrHandler; break;
      default: handler = null;
    }
    
    if (!handler) {
      responses.push("-ERR unknown command\r\n");
      continue;
    }

    const output = [];
    const fakeSocket = { write: (msg) => output.push(msg) };
    
    handler(cmdParts, fakeSocket, { inTransaction: false, queuedCommands: [] });
    
    responses.push(output.join(""));
  }

  state.inTransaction = false;
  state.queuedCommands = [];
  state.watchedKeys = null;

  encoder.writeArray(socket, responses);
}

module.exports = exec;