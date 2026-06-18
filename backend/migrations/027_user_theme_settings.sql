-- Migration 027: add theme_settings column to users table.
-- Stores per-user visual preferences: {colorMode, designMode, palette}.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS theme_settings JSONB NOT NULL
    DEFAULT '{"colorMode": "upao", "designMode": "upao", "palette": null}';
