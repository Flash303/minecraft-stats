-- Add migration script here
ALTER TABLE servers
ADD COLUMN last_max_players INTEGER DEFAULT NULL,
ADD COLUMN last_motd TEXT DEFAULT NULL;
