-- Add last_ping_time field to servers
ALTER TABLE servers ADD COLUMN IF NOT EXISTS last_ping_time INTEGER NULL;
