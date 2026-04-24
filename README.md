# Redis Server Implementation in Node.js

A custom implementation of a Redis-compatible server built with Node.js. This project implements the RESP (Redis Serialization Protocol) and supports various data structures including Strings, Lists, Streams, Transactions, Replication, and RDB Persistence.

## Project Structure

- `app/main.js`: Entry point of the application.
- `app/server.js`: TCP server setup and RESP protocol parsing.
- `app/store.js`: In-memory data store logic.
- `app/encoder.js`: RESP encoding utility functions.
- `app/handlers/`: Contains individual command handlers.

## Usage

Run the server with optional flags:
- `--port <port>`: Start the server on a custom port (default: 6379)
- `--replicaof <host> <port>`: Start as a replica connecting to the specified master
- `--dir <directory>`: Directory where RDB and AOF files are stored
- `--dbfilename <name>`: Name of the RDB file
- `--appendonly <yes|no>`: Enable AOF persistence (default: no)
- `--appenddirname <name>`: AOF subdirectory (default: appendonlydir)
- `--appendfilename <name>`: AOF filename (default: appendonly.aof)
- `--appendfsync <always|everysec|no>`: AOF sync mode (default: everysec)

## Command Handlers

### General Commands
- **ping.js**: Responds with `PONG`. Used to test the connection.
- **echo.js**: Returns the provided message back to the client.
- **type.js**: Returns the type of the value stored at a key.
- **info.js**: Returns server information and statistics.
- **replconf.js**: Handles REPLCONF commands including GETACK for replicas.
- **configget.js**: Handles CONFIG GET command for dir and dbfilename.
- **cleanup.js**: Handles resource cleanup when a client disconnects.
- **unknown.js**: Returns an error message for unsupported commands.

### String Commands
- **set.js**: Stores a string value. Supports optional `PX` (expiry in milliseconds).
- **get.js**: Retrieves the string value.
- **incr.js**: Increments the value of a key by 1.
- **keys.js**: Returns all keys matching pattern (supports `*`).

### Transaction Commands
- **multi.js**: Starts a transaction.
- **exec.js**: Executes all queued commands.
- **discard.js**: Discards all queued commands.
- **watch.js**: Monitors keys for changes.
- **unwatch.js**: Cancels monitoring.

### List Commands
- **lpush.js**: Inserts elements at the head of a list.
- **rpush.js**: Inserts elements at the tail of a list.
- **lpop.js**: Removes and returns the first element.
- **blpop.js**: A blocking version of `LPOP`.
- **lrange.js**: Returns a range of elements.
- **llen.js**: Returns the number of elements.

### Stream Commands
- **xadd.js**: Appends a new entry to a stream.
- **xrange.js**: Returns entries within a range of IDs.
- **xread.js**: Reads data from streams.

### Replication Commands
- **psync.js**: Handles full resynchronization.
- **wait.js**: Waits for replicas to acknowledge.
- **replconf.js**: Handles REPLCONFIG commands.

## RDB Persistence

When started with `--dir` and `--dbfilename`, the server loads keys from the RDB file:
- Keys with expiry are loaded with expiration timestamps
- Expired keys return null on GET
- KEYS returns all non-expired keys

### Configuration Commands
- **CONFIG GET dir**: Returns the configured directory path
- **CONFIG GET dbfilename**: Returns the configured RDB filename
- **CONFIG GET appendonly**: Returns AOF enabled status
- **CONFIG GET appenddirname**: Returns AOF subdirectory
- **CONFIG GET appendfilename**: Returns AOF filename
- **CONFIG GET appendfsync**: Returns AOF sync mode

## AOF Persistence

When `--appendonly yes` is set, write commands are logged to AOF file:

### Files Created
- `<dir>/<appenddirname>/`: AOF directory created on startup
- `<dir>/<appenddirname>/<appendfilename>.1.incr.aof`: Append-only file
- `<dir>/<appenddirname>/<appendfilename>.manifest`: Manifest file

### Write Commands
Only modifying commands (SET, DEL, INCR, LPUSH, etc.) are logged to AOF file.
- **appendfsync always**: Flush to disk before client response (tested)
- **appendfsync everysec**: Flush every second (not fully tested)
- **appendfsync no**: Let OS handle flushing (not tested)

### Recovery
On startup with AOF enabled, commands from AOF file are replayed to restore state.

## Replication

### Master Role
- Sends FULLRESYNC with empty RDB file
- Propagates SET commands to all replicas
- WAIT command returns count of acknowledged replicas

### Replica Role
- Completes 3-step handshake (PING, REPLCONF, PSYNC)
- Processes propagated commands silently
- Tracks offset and responds to REPLCONF GETACK