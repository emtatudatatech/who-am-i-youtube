-- 0002_content_type.sql — classify each activity as video / short / ad / post / other.
-- Idempotent. After applying, reload `history` so existing rows get a value
-- (content_type is derived from the raw `details`/URL at load time, which is not
-- reconstructable in SQL): TRUNCATE history; python -m pipelines.load_history.

ALTER TABLE history ADD COLUMN IF NOT EXISTS content_type text;

CREATE INDEX IF NOT EXISTS idx_history_content_type ON history (content_type);
