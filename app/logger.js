const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

let currentLevel = LOG_LEVELS.INFO;
let logFile = null;

function setLevel(level) {
  if (level === 'DEBUG') currentLevel = LOG_LEVELS.DEBUG;
  else if (level === 'WARN') currentLevel = LOG_LEVELS.WARN;
  else if (level === 'ERROR') currentLevel = LOG_LEVELS.ERROR;
  else currentLevel = LOG_LEVELS.INFO;
}

function setLogFile(filePath) {
  logFile = filePath;
  if (!fs.existsSync(path.dirname(logFile))) {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
  }
}

function formatMessage(level, message, meta = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  return JSON.stringify(logEntry);
}

function writeLog(entry) {
  const line = entry + '\n';
  if (logFile) {
    fs.appendFileSync(logFile, line);
  }
  process.stdout.write(line);
}

function debug(message, meta) {
  if (currentLevel <= LOG_LEVELS.DEBUG) {
    writeLog(formatMessage('DEBUG', message, meta));
  }
}

function info(message, meta) {
  if (currentLevel <= LOG_LEVELS.INFO) {
    writeLog(formatMessage('INFO', message, meta));
  }
}

function warn(message, meta) {
  if (currentLevel <= LOG_LEVELS.WARN) {
    writeLog(formatMessage('WARN', message, meta));
  }
}

function error(message, meta) {
  if (currentLevel <= LOG_LEVELS.ERROR) {
    writeLog(formatMessage('ERROR', message, meta));
  }
}

function logRequest(command, args, clientIp) {
  info('Request received', { 
    command, 
    args: args?.slice(2),
    clientIp,
    timestamp: Date.now()
  });
}

function logResponse(command, durationMs, clientIp) {
  info('Response sent', { 
    command, 
    durationMs,
    clientIp
  });
}

module.exports = {
  setLevel,
  setLogFile,
  debug,
  info,
  warn,
  error,
  logRequest,
  logResponse,
  LOG_LEVELS,
};