const fs = require('fs');
const path = require('path');

const CONFIG_DEFAULTS = {
  port: 6379,
  bind: '127.0.0.1',
  maxmemory: null,
  maxmemoryPolicy: 'noeviction',
  loglevel: 'INFO',
  logfile: null,
  dir: process.cwd(),
  dbfilename: 'dump.rdb',
  appendonly: 'no',
  appenddirname: 'appendonlydir',
  appendfilename: 'appendonly.aof',
  appendfsync: 'everysec',
  requirepass: null,
  maxclients: 10000,
  tcpkeepalive: 300,
  timeout: 0,
};

function parseValue(key, value) {
  const lowerKey = key.toLowerCase();
  
  if (lowerKey === 'port' || lowerKey === 'maxclients' || lowerKey === 'timeout' || lowerKey === 'tcpkeepalive') {
    return parseInt(value, 10);
  }
  if (lowerKey === 'maxmemory') {
    return parseInt(value, 10);
  }
  if (lowerKey === 'appendonly' || lowerKey === 'appendfsync' || lowerKey === 'loglevel' || lowerKey === 'maxmemorypolicy') {
    return value.toLowerCase();
  }
  return value;
}

function loadConfigFile(filePath) {
  const config = { ...CONFIG_DEFAULTS };
  
  if (!fs.existsSync(filePath)) {
    return config;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const separator = trimmed.indexOf(' ');
    if (separator === -1) continue;
    
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    
    config[key] = parseValue(key, value);
  }
  
  return config;
}

function mergeEnvVars(config) {
  if (process.env.REDIS_PORT) config.port = parseInt(process.env.REDIS_PORT, 10);
  if (process.env.REDIS_BIND) config.bind = process.env.REDIS_BIND;
  if (process.env.REDIS_MAXMEMORY) config.maxmemory = parseInt(process.env.REDIS_MAXMEMORY, 10);
  if (process.env.REDIS_MAXMEMORY_POLICY) config.maxmemoryPolicy = process.env.REDIS_MAXMEMORY_POLICY;
  if (process.env.REDIS_LOGLEVEL) config.loglevel = process.env.REDIS_LOGLEVEL;
  if (process.env.REDIS_LOGFILE) config.logfile = process.env.REDIS_LOGFILE;
  if (process.env.REDIS_DIR) config.dir = process.env.REDIS_DIR;
  if (process.env.REDIS_DBFILENAME) config.dbfilename = process.env.REDIS_DBFILENAME;
  if (process.env.REDIS_APPENDONLY) config.appendonly = process.env.REDIS_APPENDONLY;
  if (process.env.REDIS_REQUIREPASS) config.requirepass = process.env.REDIS_REQUIREPASS;
  
  return config;
}

function loadConfig(configFile, cliArgs) {
  let config = { ...CONFIG_DEFAULTS };
  
  if (configFile) {
    config = loadConfigFile(configFile);
  }
  
  for (const arg of cliArgs) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      if (key && value !== undefined) {
        config[key] = parseValue(key, value);
      }
    }
  }
  
  config = mergeEnvVars(config);
  
  return config;
}

module.exports = {
  CONFIG_DEFAULTS,
  loadConfig,
  loadConfigFile,
  mergeEnvVars,
  parseValue,
};