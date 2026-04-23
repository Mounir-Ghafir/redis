function writeSimpleString(socket, content) {
  socket.write(`+${content}\r\n`);
}

function writeBulkString(socket, content) {
  if (content === null) {
    socket.write("$-1\r\n");
  } else {
    socket.write(`$${content.length}\r\n${content}\r\n`);
  }
}

function writeInteger(socket, num) {
  socket.write(`:${num}\r\n`);
}

function writeArray(socket, items) {
  if (items === null) {
    socket.write("*-1\r\n");
  } else if (items.length === 0) {
    socket.write("*0\r\n");
  } else {
    let response = `*${items.length}\r\n`;
    for (const item of items) {
      if (item === null) {
        response += "$-1\r\n";
      } else if (typeof item === "string") {
        response += `$${item.length}\r\n${item}\r\n`;
      } else if (typeof item === "number") {
        response += `:${item}\r\n`;
      } else if (Array.isArray(item)) {
        response += `*${item.length}\r\n`;
        for (const subItem of item) {
          response += `$${subItem.length}\r\n${subItem}\r\n`;
        }
      }
    }
    socket.write(response);
  }
}

function writeError(socket, message) {
  socket.write(`-ERR ${message}\r\n`);
}

function writeStreamEntries(socket, entries) {
  let response = `*${entries.length}\r\n`;
  for (const entry of entries) {
    const pairs = Object.entries(entry.fields).flat();
    response += `*2\r\n$${entry.id.length}\r\n${entry.id}\r\n`;
    response += `*${pairs.length}\r\n`;
    for (const part of pairs) {
      response += `$${part.length}\r\n${part}\r\n`;
    }
  }
  socket.write(response);
}

function writeKeyValue(socket, key, value) {
  socket.write(`*2\r\n$${key.length}\r\n${key}\r\n$${value.length}\r\n${value}\r\n`);
}

module.exports = {
  writeSimpleString,
  writeBulkString,
  writeInteger,
  writeArray,
  writeError,
  writeStreamEntries,
  writeKeyValue,
};