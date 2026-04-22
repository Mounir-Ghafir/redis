const store = {};
const waitingClients = {};

function ping(socket) {
  socket.write("+PONG\r\n");
}

function xadd(args, socket) {
  const key = args[4];
  let id = args[6];
  const fields = {};
  
  let [msStr, seqStr] = id.split("-");
  let newMs = parseInt(msStr);
  let newSeq;

  const streamEntry = store[key];
  const lastEntry = streamEntry && streamEntry.value.length > 0 
    ? streamEntry.value[streamEntry.value.length - 1] 
    : null;

  if (seqStr === "*") {
    if (lastEntry) {
      const [lastMs, lastSeq] = lastEntry.id.split("-").map(Number);
      
      if (newMs === lastMs) {
        newSeq = lastSeq + 1;
      } else if (newMs > lastMs) {
        newSeq = 0;
      } else {
  
        socket.write("-ERR The ID specified in XADD is equal or smaller than the target stream top item\r\n");
        return;
      }
    } else {

      newSeq = (newMs === 0) ? 1 : 0;
    }

    id = `${newMs}-${newSeq}`;
  } else {

    newSeq = parseInt(seqStr);

    if (newMs === 0 && newSeq === 0) {
      socket.write("-ERR The ID specified in XADD must be greater than 0-0\r\n");
      return;
    }

    if (lastEntry) {
      const [lastMs, lastSeq] = lastEntry.id.split("-").map(Number);
      if (newMs < lastMs || (newMs === lastMs && newSeq <= lastSeq)) {
        socket.write("-ERR The ID specified in XADD is equal or smaller than the target stream top item\r\n");
        return;
      }
    }
  }

  for (let i = 8; i < args.length; i += 4) {
    const fieldKey = args[i];
    const fieldValue = args[i + 2];
    if (fieldKey && fieldValue) fields[fieldKey] = fieldValue;
  }

  if (!store[key]) {
    store[key] = { type: "stream", value: [], expiry: null };
  }

  store[key].value.push({ id, fields });

  socket.write(`$${id.length}\r\n${id}\r\n`);
}
function type(args, socket) {
  const key = args[4];
  const entry = store[key];

  if (!entry || (entry.expiry && Date.now() > entry.expiry)) {
    if (entry) delete store[key];
    socket.write("+none\r\n");
    return;
  }

  // Check the explicit type property first
  if (entry.type === "stream") {
    socket.write("+stream\r\n");
  } else if (Array.isArray(entry.value)) {
    socket.write("+list\r\n");
  } else if (typeof entry.value === "string") {
    socket.write("+string\r\n");
  } else {
    socket.write("+none\r\n");
  }
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

  store[key] = { type: "string", value, expiry };
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
    store[key] = { type: "list", value: [], expiry: null };
  }

  store[key].value.push(...elements);
  socket.write(`:${store[key].value.length}\r\n`);

  // Handle BLPOP waiters
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
    store[key] = { type: "list", value: [], expiry: null };
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
    if (stop < 0)  stop  = list.length + stop;
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
  type,
  xadd,
  cleanup,
};