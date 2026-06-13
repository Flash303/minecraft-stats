-- Add hashes & old status inside servers
ALTER TABLE servers ADD COLUMN IF NOT EXISTS last_favicon TEXT NULL;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS last_status TEXT NULL CHECK (last_status IN ('online', 'offline'));
ALTER TABLE servers ADD COLUMN IF NOT EXISTS last_connected INTEGER NULL;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS last_version TEXT NULL;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS favicon_hash TEXT NULL;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS motd_hash TEXT NULL;
ALTER TABLE servers ADD COLUMN IF NOT EXISTS resolved_endpoint TEXT NULL;
