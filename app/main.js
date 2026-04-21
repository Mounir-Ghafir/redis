const net = require("net");

const server = net.createServer((connection) => {

    connection.on("data", () => {
        connection.write("+PONG\r\n");
    });
});

server.listen(6380, "127.0.0.1" , () => {
    console.log("server")
});
