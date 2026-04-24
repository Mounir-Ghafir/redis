# Redis Server Implementation in Node.js

A custom implementation of a Redis-compatible server built with Node.js. This project implements the RESP (Redis Serialization Protocol) and supports various data structures including Strings, Lists, Streams, and Transactions.

## Project Structure

- `app/main.js`: Entry point of the application.
- `app/server.js`: TCP server setup and RESP protocol parsing.
- `app/store.js`: In-memory data store logic.
- `app/encoder.js`: RESP encoding utility functions.
- `app/handlers/`: Contains individual command handlers.

## Command Handlers

Every command supported by this server is managed by a specific handler in the `app/handlers/` directory:

### General Commands
- **ping.js**: Responds with `PONG`. Used to test the connection.
- **echo.js**: Returns the provided message back to the client.
- **type.js**: Returns the type of the value stored at a key (e.g., `string`, `list`, `stream`, or `none`).
- **info.js**: Returns server information and statistics. Supports `replication` section with role, master_replid, and master_repl_offset.
- **cleanup.js**: Handles resource cleanup when a client disconnects.
- **unknown.js**: Returns an error message for unsupported or unrecognized commands.

## Usage

Run the server with optional flags:
- `--port <port>`: Start the server on a custom port (default: 6379)
- `--replicaof <host> <port>`: Start as a replica connecting to the specified master

## Replication

When running as a replica with `--replicaof`, the server performs a 3-step handshake:
1. Sends PING to the master
2. Sends REPLCONF listening-port and REPLCONF capa psync2
3. Sends PSYNC ? -1 to synchronize

### String Commands
- **set.js**: Stores a string value at a specified key. Supports optional `PX` (expiry in milliseconds).
- **get.js**: Retrieves the string value stored at a key. Returns null if the key doesn't exist or has expired.
- **incr.js**: Increments the value of a key by 1. Creates key with value 1 if it doesn't exist. Returns error if value is not a valid integer.

### Transaction Commands
- **watch.js**: Monitors keys for changes. If called inside a transaction, returns an error.
- **multi.js**: Starts a transaction. After this, commands are queued instead of executed.
- **exec.js**: Executes all queued commands in a transaction and returns their responses as an array. If any watched key was modified, returns null array and discards queued commands.
- **discard.js**: Discards all queued commands in a transaction and aborts the transaction.

### List Commands
- **lpush.js**: Inserts elements at the head of a list.
- **rpush.js**: Inserts elements at the tail of a list.
- **lpop.js**: Removes and returns the first element of a list.
- **blpop.js**: A blocking version of `LPOP`. It waits until an element is available or a timeout is reached.
- **lrange.js**: Returns a range of elements from a list.
- **llen.js**: Returns the number of elements in a list.

### Stream Commands
- **xadd.js**: Appends a new entry to a stream. Automatically generates IDs if `*` is provided and validates that IDs are monotonically increasing.
- **xrange.js**: Returns entries from a stream within a specified range of IDs. Supports `-` and `+` for minimum and maximum possible IDs.
- **xread.js**: Reads data from one or more streams starting from IDs greater than those specified. Supports multiple streams by providing multiple keys followed by their corresponding IDs. Returns a nested RESP array of results.
