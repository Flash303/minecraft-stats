DROP INDEX IF EXISTS idx_ping_records_server_date;

CREATE INDEX IF NOT EXISTS idx_ping_records_server_date_value 
ON ping_records(server_id, date DESC) INCLUDE (value);

CREATE MATERIALIZED VIEW ping_records_5m_agg
WITH (timescaledb.continuous) AS
SELECT 
    server_id,
    time_bucket('5 minutes', date) as time_bucket,
    AVG(value)::integer as agg_value
FROM ping_records
GROUP BY server_id, time_bucket
WITH NO DATA;

SELECT add_continuous_aggregate_policy('ping_records_5m_agg',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '5 minutes');
