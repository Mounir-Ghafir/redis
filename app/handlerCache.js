const handlerCache = new Map();

function getHandler(command) {
  if (handlerCache.has(command)) {
    return handlerCache.get(command);
  }
  
  const { handlers } = require("./handlers");
  const handler = handlers[command] || handlers.unknown;
  handlerCache.set(command, handler);
  return handler;
}

function clearHandlerCache() {
  handlerCache.clear();
}

module.exports = { getHandler, clearHandlerCache };