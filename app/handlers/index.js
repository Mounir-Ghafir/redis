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
const { configGet } = require("./configget");
const { keys } = require("./keys");
const { subscribe } = require("./subscribe");
const { unsubscribe } = require("./unsubscribe");
const { publish } = require("./publish");
const { zadd } = require("./zadd");
const { zrank } = require("./zrank");
const { zrange } = require("./zrange");
const { zcard } = require("./zcard");
const { zscore } = require("./zscore");
const { zrem } = require("./zrem");
const { geoadd } = require("./geoadd");
const { geopos } = require("./geopos");
const { geodist } = require("./geodist");
const { geosearch } = require("./geosearch");
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
  configGet,
  keys,
  subscribe,
  unsubscribe,
  publish,
  zadd,
  zrank,
  zrange,
  zcard,
  zscore,
  zrem,
  geoadd,
  geopos,
  geodist,
  geosearch,
  cleanup,
};