const encoder = require("../../encoder");
const store = require("../../store");

function geopos(args, socket) {
  const key = args[2];
  const members = args.slice(4);
  
  if (!key || members.length === 0) {
    encoder.writeArray(socket, []);
    return;
  }
  
  const results = [];
  for (const member of members) {
    const coords = store.geopos(key, member);
    if (coords) {
      encoder.writeArray(socket, coords);
    } else {
      encoder.writeNullArray(socket);
    }
  }
}

module.exports = { geopos };