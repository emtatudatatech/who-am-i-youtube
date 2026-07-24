-- 0001_init.sql — initial schema for "Who Am I? | YouTube"
-- Idempotent: safe to re-run (CREATE ... IF NOT EXISTS).

-- Video-category dimension (from pipelines/video_categories.py).
CREATE TABLE IF NOT EXISTS video_categories (
    category_id   text PRIMARY KEY,   -- YouTube numeric-string IDs, e.g. '22'
    category_name text NOT NULL
);

-- One row per activity entry (watch OR search OR any of the 14 verbs).
CREATE TABLE IF NOT EXISTS history (
    id                     bigserial PRIMARY KEY,
    activity_hash          text UNIQUE NOT NULL,      -- idempotency key (Ground Rule 7)
    activity_type          text NOT NULL,             -- lowercased leading verb, e.g. 'watched'
    header                 text,
    title                  text,
    title_url              text,
    channel_name           text,                      -- subtitles[0].name (nullable)
    channel_url            text,                      -- subtitles[0].url (nullable)
    "time"                 timestamptz NOT NULL,      -- UTC, exactly as Takeout gives it
    time_eat               timestamp NOT NULL,        -- naive East Africa Time wall-clock
    video_id               text,
    category_id            text REFERENCES video_categories (category_id),
    video_thumbnail_url    text,
    channel_id             text,
    channel_image_url      text,
    channel_country        text,                      -- ISO 3166-1 alpha-2 (nullable)
    is_short               boolean NOT NULL,
    video_duration_seconds integer,
    created_at             timestamptz NOT NULL DEFAULT now()
);

-- Nearly every dashboard query filters/aggregates on one of these.
CREATE INDEX IF NOT EXISTS idx_history_time_eat      ON history (time_eat);
CREATE INDEX IF NOT EXISTS idx_history_channel_id    ON history (channel_id);
CREATE INDEX IF NOT EXISTS idx_history_category_id   ON history (category_id);
CREATE INDEX IF NOT EXISTS idx_history_activity_type ON history (activity_type);

-- Incremental-sync bookmark (single logical row: key='last_synced_time').
CREATE TABLE IF NOT EXISTS pipeline_state (
    key   text PRIMARY KEY,
    value text
);
