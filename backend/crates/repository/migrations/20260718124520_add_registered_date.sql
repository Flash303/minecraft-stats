ALTER TABLE servers ADD COLUMN registered_date TIMESTAMPTZ DEFAULT NOW() NOT NULL;

UPDATE servers
SET registered_date = subquery.first_ping
FROM (
    SELECT server_id, MIN(date) as first_ping
    FROM ping_records
    GROUP BY server_id
) AS subquery
WHERE servers.id = subquery.server_id;
