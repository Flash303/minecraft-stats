-- Subscriptions for Web Push
CREATE TABLE IF NOT EXISTS web_push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,

    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON web_push_subscriptions(user_id);

-- User configured alerts
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,

    alert_type TEXT NOT NULL CHECK (alert_type IN ('status_to_offline', 'status_to_online', 'player_above', 'player_below')),
    player_threshold INTEGER NULL, -- Only for player_above and player_below
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, server_id, alert_type, player_threshold)
);
CREATE INDEX IF NOT EXISTS idx_alerts_server_id ON alerts(server_id) WHERE is_active = TRUE;
