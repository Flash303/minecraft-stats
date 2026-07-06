-- Create servers table
CREATE TABLE IF NOT EXISTS servers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    ip TEXT NOT NULL,
    port INTEGER NOT NULL CHECK (port >= 0 AND port <= 65535),
    UNIQUE (ip, port)
);

-- Create ping_records table
CREATE TABLE IF NOT EXISTS ping_records (
    server_id INTEGER NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    value INTEGER NOT NULL,
    PRIMARY KEY (server_id, date),
    FOREIGN KEY (server_id) REFERENCES servers (id)
);
