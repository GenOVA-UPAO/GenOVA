-- Migration 006: Add soft-delete support to ovas table

ALTER TABLE ovas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ovas_deleted_at ON ovas(deleted_at) WHERE deleted_at IS NOT NULL;
