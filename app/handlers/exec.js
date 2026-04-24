const encoder = require("../encoder");
const handlers = require("./handlers");

function exec(args, socket, state) {
  if (!state.inTransaction) {
    encoder.writeError(socket, "EXEC without MULTI");
    return;
  }

  const responses = [];

  for (const parts of state.queuedCommands) {
    const numArgs = parseInt(parts[0]?.slice(1));
    const expectedParts = 1 + numArgs * 2;
    const cmdParts = parts.slice(0, expectedParts);
    const command = cmdParts[2]?.toUpperCase();
    
    const handler = handlers[command.toLowerCase()] || handlers.unknown;
    
    const output = [];
    const fakeSocket = { write: (msg) => output.push(msg) };
    
    handler(cmdParts, fakeSocket, { inTransaction: false, queuedCommands: [] });
    
    responses.push(output.join(""));
  }

  state.inTransaction = false;
  state.queuedCommands = [];

  encoder.writeArray(socket, responses);
}

module.exports = exec;