# Redis Server Implementation in Node.js

A custom implementation of a Redis-compatible server built with Node.js. This project implements the RESP (Redis Serialization Protocol) and supports various data structures including Strings, Lists, and Streams.

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
- **cleanup.js**: Handles resource cleanup when a client disconnects.
- **unknown.js**: Returns an error message for unsupported or unrecognized commands.

### String Commands
- **set.js**: Stores a string value at a specified key. Supports optional `PX` (expiry in milliseconds).
- **get.js**: Retrieves the string value stored at a key. Returns null if the key doesn't exist or has expired.

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
