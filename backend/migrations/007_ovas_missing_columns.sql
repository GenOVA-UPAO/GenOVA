-- Migration 007: Add missing columns to ovas table
-- user_id, status, and file_path were defined in the model but never migrated.

ALTER TABLE ovas ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE ovas ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'borrador';
ALTER TABLE ovas ADD COLUMN IF NOT EXISTS file_path TEXT;

CREATE INDEX IF NOT EXISTS idx_ovas_user_id ON ovas(user_id);
