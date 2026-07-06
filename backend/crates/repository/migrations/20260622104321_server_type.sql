-- Add type inside servers table
ALTER TABLE servers ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'java' CHECK (type IN ('java', 'bedrock'));