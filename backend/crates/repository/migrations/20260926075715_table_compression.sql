ALTER TABLE ping_records SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'server_id',
    timescaledb.compress_orderby = 'date DESC'
);

SELECT compress_chunk(i) FROM show_chunks('ping_records', older_than => INTERVAL '7 days') i;

SELECT add_compression_policy('ping_records', INTERVAL '7 days');