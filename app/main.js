const net = require("net");

const server = net.createServer();
const port = 6380;
const host = "127.0.0.1";

const store = {};

server.on("connection", (socket) => {
    let buffer = ""; 

    socket.on("data", (data) => {
        buffer += data.toString();
        while (buffer.includes("\r\n")) {
            const parts = buffer.split("\r\n");
            const numArgs = parseInt(parts[0]?.slice(1));
            const expectedParts = 1 + numArgs * 2;

            if (parts.length < expectedParts + 1) break;

            const command = parts[2]?.toUpperCase();

            if (command === "PING") {
                socket.write("+PONG\r\n");
            } else if (command === "ECHO") {
                const content = parts[4];
                socket.write(`$${content.length}\r\n${content}\r\n`);
            } else if (command === "SET") {
                const key = parts[4];
                const value = parts[6];
                const pxIndex = parts.findIndex(p => p.toUpperCase() === "PX");

                let expiry = null;
                if (pxIndex !== -1) {
                    const duration = parseInt(parts[pxIndex + 2]);
                    expiry = Date.now() + duration;
                }

                store[key] = { value, expiry };
                socket.write("+OK\r\n");
            } else if (command === "GET") {
                const key = parts[4];
                const entry = store[key];

                if (!entry) {
                    socket.write("$-1\r\n");
                } else if (entry.expiry && Date.now() > entry.expiry) {
                    delete store[key];
                    socket.write("$-1\r\n");
                } else {
                    socket.write(`$${entry.value.length}\r\n${entry.value}\r\n`);
                }
            } else {
                socket.write("-ERR unknown command\r\n");
            }

            buffer = parts.slice(expectedParts).join("\r\n");
        }
    });

    socket.on("end", () => {
        console.log("Client disconnected");
    });

    socket.on("error", (err) => {
        console.error("Socket error:", err.message);
    });
});

server.listen(port, host, () => {
    console.log(`Server running at ${host}:${port}`);
});