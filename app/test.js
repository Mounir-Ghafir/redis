const net = require("net");

const client = net.createConnection({ port: 6380, host: "127.0.0.1" }, () => {
    console.log("Connected to server\n");

    function buildCommand(...args) {
        let cmd = `*${args.length}\r\n`;
        for (const arg of args) {
            cmd += `$${arg.length}\r\n${arg}\r\n`;
        }
        return cmd;
    }

    // Send all test commands
    client.write(buildCommand("PING"));
    client.write(buildCommand("ECHO", "hello"));
    client.write(buildCommand("SET", "name", "john"));
    client.write(buildCommand("GET", "name"));
    client.write(buildCommand("SET", "temp", "data", "PX", "100"));
    client.write(buildCommand("GET", "temp"));

    // Wait 200ms then GET the expired key
    setTimeout(() => {
        client.write(buildCommand("GET", "temp"));
        client.write(buildCommand("GET", "unknown"));
        client.write(buildCommand("INVALID"));

        // Close after all commands
        setTimeout(() => client.end(), 500);
    }, 200);
});

client.on("data", (data) => {
    console.log("Response:", data.toString());
});

client.on("end", () => {
    console.log("Disconnected from server");
});

client.on("error", (err) => {
    console.error("Error:", err.message);
});