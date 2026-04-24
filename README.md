# Redis Server Implementation in Node.js

A custom implementation of a Redis-compatible server built with Node.js. This project implements the RESP (Redis Serialization Protocol) and supports various data structures including Strings, Lists, Streams, Transactions, Replication, RDB Persistence, AOF Persistence, Pub/Sub, Sorted Sets, and Geo commands.

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
- **ping.js**: Responds with `PONG`.
- **echo.js**: Returns the provided message back.
- **type.js**: Returns the type of the value stored at a key.
- **info.js**: Returns server information and statistics.
- **configget.js**: Handles CONFIG GET command.
- **cleanup.js**: Handles resource cleanup when a client disconnects.
- **unknown.js**: Returns an error message for unsupported commands.

### String Commands
- **set.js**: Stores a string value. Supports optional `PX` (expiry).
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

### Sorted Set Commands
- **zadd.js**: Add member to sorted set with score.
- **zrank.js**: Get rank (index) of member in sorted set.
- **zrange.js**: Get members by index range.
- **zcard.js**: Get count of members in sorted set.
- **zscore.js**: Get score of member.
- **zrem.js**: Remove member from sorted set.

### Pub/Sub Commands
- **subscribe.js**: Subscribe to a channel.
- **unsubscribe.js**: Unsubscribe from a channel.
- **publish.js**: Publish message to channel.

### Replication Commands
- **psync.js**: Handles full resynchronization.
- **wait.js**: Waits for replicas to acknowledge.
- **replconf.js**: Handles REPLCONFIG commands.

### Geo Commands
- **geoadd.js**: Add location with longitude, latitude.
- **geopos.js**: Get coordinates of location.
- **geodist.js**: Calculate distance between two locations.
- **geosearch.js**: Search locations within radius.

### ACL Commands
- **aclwhoami.js**: Get current authenticated user.
- **aclgetuser.js**: Get user properties (flags, passwords).
- **aclsetuser.js**: Set user password.
- **auth.js**: Authenticate user.

## Features

### Pub/Sub
After SUBSCRIBE, client enters "Subscribed mode" where only SUBSCRIBE, UNSUBSCRIBE, PSUBSCRIBE, PUNSUBSCRIBE, PING, QUIT, RESET commands are allowed.
PING in subscribe mode returns ["pong", ""] instead of +PONG.

### RDB Persistence
When started with `--dir` and `--dbfilename`, the server loads keys from the RDB file on startup. Keys with expiry are handled automatically.

### AOF Persistence
When `--appendonly yes` is set:
- Creates `<dir>/<appenddirname>/` directory
- Creates `<appendfilename>.1.incr.aof` file
- Creates `<appendfilename>.manifest` file
- Write commands are logged to AOF file
- Commands are replayed on startup to restore state

### Replication
- Master: Sends FULLRESYNC with empty RDB file, propagates SET commands
- Replica: Completes 3-step handshake, processes propagated commands silently, tracks offset

### ACL (Access Control)
- Default user with nopass flag (auto-authenticated)
- Password storage using SHA-256 hash
- Set password: ACL SETUSER default >password
- AUTH command for authentication
- NOAUTH error when password is set and not authenticated

### Geo Commands
- GEOADD: Validates longitude (-180 to +180) and latitude (-85.05112878 to +85.05112878)
- GEOPOS: Returns longitude and latitude for location members
- GEODIST: Calculates distance using Haversine formula (Earth radius: 6372797.560856m)
- GEOSEARCH: FROMLONLAT lng lat BYRADIUS radius unit (supports m, km, mi)