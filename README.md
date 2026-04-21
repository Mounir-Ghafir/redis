# Testing Your Redis Server

This project is a simple Redis-compatible server that responds to `PING` commands. Here are the different ways you can test it.

## 1. Using `redis-cli` (Recommended)
If you have the official Redis tools installed, this is the best way to test:
```bash
redis-cli PING
```
It should return `PONG`.

## 2. Using Netcat (`nc`)
Netcat is a versatile networking tool available on most Linux/macOS systems:
```bash
echo "PING" | nc 127.0.0.1 6379
```
It should return `+PONG`.

## 3. Using PowerShell (Windows)
If you are on Windows without other tools, run this in PowerShell:
```powershell
$client = New-Object System.Net.Sockets.TcpClient('127.0.0.1', 6379);
$stream = $client.GetStream();
$data = [System.Text.Encoding]::ASCII.GetBytes("PING\r\n");
$stream.Write($data, 0, $data.Length);
$buffer = New-Object byte[] 1024;
$count = $stream.Read($buffer, 0, $buffer.Length);
[System.Text.Encoding]::ASCII.GetString($buffer, 0, $count);
$client.Close();
```

## 4. Using a Node.js Script
You can create a small script (e.g., `test.js`) to test the connection:
```javascript
const net = require('net');
const client = net.createConnection({ port: 6379 }, () => {
  client.write('PING\r\n');
});
client.on('data', (data) => {
  console.log('Server replied:', data.toString());
  client.end();
});
```
Run it with `node test.js`.
