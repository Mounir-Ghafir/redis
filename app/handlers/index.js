const ping = require("./ping");
const echo = require("./echo");
const set = require("./set");
const get = require("./get");
const incr = require("./incr");
const multi = require("./multi");
const exec = require("./exec");
const discard = require("./discard");
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
  cleanup,
};