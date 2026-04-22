const store = {};
const waitingClients = {};

function ping(socket) {
  socket.write("+PONG\r\n");
}

function echo(args, socket) {
  const content = args[4];
  socket.write(`$${content.length}\r\n${content}\r\n`);
}

function set(args, socket) {
  const key = args[4];
  const value = args[6];
  const pxIndex = args.findIndex(p => p.toUpperCase() === "PX");
  let expiry = null;

  if (pxIndex !== -1) {
    const duration = parseInt(args[pxIndex + 2]);
    expiry = Date.now() + duration;
  }

  store[key] = { value, expiry };
  socket.write("+OK\r\n");
}

function get(args, socket) {
  const key = args[4];
  const entry = store[key];

  if (!entry || (entry.expiry && Date.now() > entry.expiry)) {
    if (entry) delete store[key];
    socket.write("$-1\r\n");
  } else {
    socket.write(`$${entry.value.length}\r\n${entry.value}\r\n`);
  }
}

function rpush(args, socket) {
  const key = args[4];
  const elements = [];

  for (let i = 6; i < args.length; i += 2) {
    elements.push(args[i]);
  }

  if (!store[key]) {
    store[key] = { value: [], expiry: null };
  }

  store[key].value.push(...elements);
  socket.write(`:${store[key].value.length}\r\n`);

  while (waitingClients[key] && waitingClients[key].length > 0 && store[key].value.length > 0) {
    const waiter = waitingClients[key].shift();
    if (waiter.timeoutId) clearTimeout(waiter.timeoutId);
    
    const poppedValue = store[key].value.shift();
    waiter.socket.write(`*2\r\n$${key.length}\r\n${key}\r\n$${poppedValue.length}\r\n${poppedValue}\r\n`);
  }
}

function lpush(args, socket) {
  const key = args[4];
  const elements = [];

  for (let i = 6; i < args.length; i += 2) {
    elements.push(args[i]);
  }

  if (!store[key]) {
    store[key] = { value: [], expiry: null };
  }

  store[key].value.unshift(...elements.reverse());
  socket.write(`:${store[key].value.length}\r\n`);

  while (waitingClients[key] && waitingClients[key].length > 0 && store[key].value.length > 0) {
    const waiter = waitingClients[key].shift();
    if (waiter.timeoutId) clearTimeout(waiter.timeoutId);
    
    const poppedValue = store[key].value.shift();
    waiter.socket.write(`*2\r\n$${key.length}\r\n${key}\r\n$${poppedValue.length}\r\n${poppedValue}\r\n`);
  }
}

function lpop(args, socket) {
  const key = args[4];
  const entry = store[key];
  const count = args[6] ? parseInt(args[6]) : null;

  if (!entry || !Array.isArray(entry.value) || entry.value.length === 0) {
    socket.write("$-1\r\n");
  } else if (count === null) {
    const removedItem = entry.value.shift();
    socket.write(`$${removedItem.length}\r\n${removedItem}\r\n`);
    if (entry.value.length === 0) delete store[key];
  } else {
    const numToRemove = Math.min(count, entry.value.length);
    const removedItems = entry.value.splice(0, numToRemove);
    let response = `*${removedItems.length}\r\n`;
    for (const item of removedItems) {
      response += `$${item.length}\r\n${item}\r\n`;
    }
    socket.write(response);
    if (entry.value.length === 0) delete store[key];
  }
}

function blpop(args, socket) {
  const key = args[4];
  const timeoutSeconds = parseFloat(args[6]); 
  const entry = store[key];

  if (entry && Array.isArray(entry.value) && entry.value.length > 0) {
    const poppedValue = entry.value.shift();
    socket.write(`*2\r\n$${key.length}\r\n${key}\r\n$${poppedValue.length}\r\n${poppedValue}\r\n`);
  } else {
    if (!waitingClients[key]) waitingClients[key] = [];
    
    let timeoutId = null;
    if (timeoutSeconds > 0) {
      timeoutId = setTimeout(() => {
        if (waitingClients[key]) {
          waitingClients[key] = waitingClients[key].filter(c => c.socket !== socket);
        }
        socket.write("*-1\r\n");
      }, timeoutSeconds * 1000);
    }
    waitingClients[key].push({ socket, timeoutId });
  }
}

function lrange(args, socket) {
  const key = args[4];
  let start = parseInt(args[6]);
  let stop  = parseInt(args[8]);
  const entry = store[key];

  if (!entry || !Array.isArray(entry.value)) {
    socket.write("*0\r\n");
  } else {
    const list = entry.value;
    if (start < 0) start = Math.max(0, list.length + start);
    if (stop < 0)  stop  = list.length + stop
    if (stop >= list.length) stop = list.length - 1;

    if (start >= list.length || start > stop) {
      socket.write("*0\r\n");
    } else {
      const slice = list.slice(start, stop + 1);
      let response = `*${slice.length}\r\n`;
      for (const item of slice) {
        response += `$${item.length}\r\n${item}\r\n`;
      }
      socket.write(response);
    }
  }
}

function llen(args, socket) {
  const key = args[4];
  const entry = store[key];
  if (!entry || !Array.isArray(entry.value)) {
    socket.write(":0\r\n");
  } else {
    socket.write(`:${entry.value.length}\r\n`);
  }
}

function unknown(socket) {
  socket.write("-ERR unknown command\r\n");
}

function cleanup(socket) {
  Object.keys(waitingClients).forEach(key => {
    waitingClients[key] = waitingClients[key].filter(c => c.socket !== socket);
  });
}

module.exports = {
  store,
  waitingClients,
  ping,
  echo,
  set,
  get,
  rpush,
  lpush,
  lpop,
  blpop,
  lrange,
  llen,
  unknown,
  cleanup,
};