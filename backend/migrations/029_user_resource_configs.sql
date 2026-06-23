ALTER TABLE users
    ADD COLUMN IF NOT EXISTS resource_configs JSONB NOT NULL DEFAULT '{}'::jsonb;
