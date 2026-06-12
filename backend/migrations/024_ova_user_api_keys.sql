-- Per-user OVA generation settings (image count, image provider).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS ova_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Per-user API keys (stored plaintext; never logged, returned masked).
-- Keys: groq, openrouter, opencode, siliconflow, runware, falai
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_api_keys JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Platform-level API keys configurable by admins.
-- Values are only readable/writable by admin endpoints, returned masked to UI.
CREATE TABLE IF NOT EXISTS platform_config (
    key        VARCHAR(128) PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
