const encoder = require("../../encoder");
const store = require("../../store");

function geoadd(args, socket) {
  const key = args[2];
  const lng = parseFloat(args[4]);
  const lat = parseFloat(args[6]);
  const member = args[8];
  
  if (isNaN(lng) || isNaN(lat) || !key || !member) {
    encoder.writeInteger(socket, 0);
    return;
  }
  
  if (lng < -180 || lng > 180) {
    encoder.writeError(socket, `invalid longitude,latitude pair ${lng},${lat}`);
    return;
  }
  
  if (lat < -85.05112878 || lat > 85.05112878) {
    encoder.writeError(socket, `invalid longitude,latitude pair ${lng},${lat}`);
    return;
  }
  
  const added = store.geoadd(key, lng, lat, member);
  encoder.writeInteger(socket, added);
}

module.exports = { geoadd };