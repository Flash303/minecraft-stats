-- Add extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert hyper table
SELECT create_hypertable('ping_records', 'date', migrate_data => true);