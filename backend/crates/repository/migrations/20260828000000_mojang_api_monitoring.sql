CREATE TABLE IF NOT EXISTS mojang_api_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    is_down BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert the default status row
INSERT INTO mojang_api_status (id, is_down, updated_at) VALUES (1, false, NOW()) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS mojang_api_downtimes (
    id SERIAL PRIMARY KEY,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ
);
