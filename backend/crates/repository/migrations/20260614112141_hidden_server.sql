-- Add hidden field to servers table
ALTER TABLE servers ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE;
