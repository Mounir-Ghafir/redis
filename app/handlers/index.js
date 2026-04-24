const ping = require("./ping");
const echo = require("./echo");
const set = require("./set");
const get = require("./get");
const incr = require("./incr");
const multi = require("./multi");
const exec = require("./exec");
const discard = require("./discard");
const watch = require("./watch");
const unwatch = require("./unwatch");
const rpush = require("./rpush");
const lpush = require("./lpush");
const lpop = require("./lpop");
const blpop = require("./blpop");
const lrange = require("./lrange");
const llen = require("./llen");
const type = require("./type");
const xadd = require("./xadd");
const xrange = require("./xrange");
const { xread } = require("./xread");
const { info } = require("./info");
const { replconf } = require("./replconf");
const { psync } = require("./psync");
const { wait } = require("./wait");
const unknown = require("./unknown");
const cleanup = require("./cleanup");

module.exports = {
  ping,
  echo,
  set,
  get,
  incr,
  multi,
  exec,
  discard,
  watch,
  unwatch,
  rpush,
  lpush,
  lpop,
  blpop,
  lrange,
  llen,
  unknown,
  type,
  xadd,
  xrange,
  xread,
  info,
  replconf,
  psync,
  wait,
  cleanup,
};