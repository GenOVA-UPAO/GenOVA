-- Migration 023: per-user enabled model allowlist.
-- [{provider, model_id}, ...] — models the user has enabled for their LLM config
-- dropdowns. System defaults are always included regardless of this list.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS enabled_models JSONB NOT NULL DEFAULT '[]'::jsonb;
