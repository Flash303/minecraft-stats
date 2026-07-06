-- Index to optimize the query
CREATE INDEX IF NOT EXISTS idx_ping_records_server_date
ON ping_records(server_id, date);
