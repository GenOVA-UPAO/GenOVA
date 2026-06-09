-- Migration 021: per-user LLM generation config (general, applies to all OVAs).
-- JSONB on users: { "<tipo>": {"provider","model_id","timeout_s"} } for tipo in
-- texto / codigo / orquestador / razonamiento. Empty object = system defaults.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS llm_settings JSONB NOT NULL DEFAULT '{}'::jsonb;
