-- no-transaction
-- Adds 8 server languages reported missing after the initial bulk pass:
-- he (Hebrew), cs (Czech), fi (Finnish), vi (Vietnamese),
-- sr (Serbian), ro (Romanian), ka (Georgian), da (Danish).
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block, hence the
-- `-- no-transaction` opt-out on the first line (supported by sqlx 0.9).
-- Existing values are untouched, so current rows need no rewrite.

ALTER TYPE server_language ADD VALUE 'he';
ALTER TYPE server_language ADD VALUE 'cs';
ALTER TYPE server_language ADD VALUE 'fi';
ALTER TYPE server_language ADD VALUE 'vi';
ALTER TYPE server_language ADD VALUE 'sr';
ALTER TYPE server_language ADD VALUE 'ro';
ALTER TYPE server_language ADD VALUE 'ka';
ALTER TYPE server_language ADD VALUE 'da';
