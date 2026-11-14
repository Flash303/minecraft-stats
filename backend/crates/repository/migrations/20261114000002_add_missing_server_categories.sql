-- no-transaction
-- Adds 4 missing server categories: oneblock, boxed, roleplay, practice.
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block, hence the
-- `-- no-transaction` opt-out on the first line (supported by sqlx 0.9).
-- Existing values are untouched, so current rows need no rewrite.

ALTER TYPE server_category ADD VALUE 'oneblock';
ALTER TYPE server_category ADD VALUE 'boxed';
ALTER TYPE server_category ADD VALUE 'roleplay';
ALTER TYPE server_category ADD VALUE 'practice';
