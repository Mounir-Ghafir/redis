const encoder = require("../../encoder");
const store = require("../../store");

function geosearch(args, socket) {
  const key = args[2];
  
  let lng = null, lat = null, radius = null, unit = 'm';
  let i = 4;
  while (i < args.length) {
    if (args[i] === 'FROMLONLAT') {
      lng = parseFloat(args[i + 1]);
      lat = parseFloat(args[i + 2]);
      i += 3;
    } else if (args[i] === 'BYRADIUS') {
      radius = parseFloat(args[i + 1]);
      unit = args[i + 2];
      i += 3;
    } else {
      i++;
    }
  }
  
  if (!key || lng === null || lat === null || radius === null) {
    encoder.writeArray(socket, []);
    return;
  }
  
  const results = store.geosearch(key, lng, lat, radius, unit);
  encoder.writeArray(socket, results);
}

module.exports = { geosearch };