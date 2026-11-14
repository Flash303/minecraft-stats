-- no-transaction
-- Adds the `gens` server category: standalone game loop built around
-- generators, upgrades and tycoon progression (distinct from skyblock).
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block, hence the
-- `-- no-transaction` opt-out on the first line (supported by sqlx 0.9).
-- Existing values are untouched, so current rows need no rewrite.

ALTER TYPE server_category ADD VALUE 'gens';
