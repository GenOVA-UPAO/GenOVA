-- Migration 022: catalog_cache — raw API responses from model-list endpoints.
-- One row per provider (groq | openrouter) with a 24h TTL so we can rebuild the
-- merged catalog even when both providers are unreachable at the same time.
CREATE TABLE IF NOT EXISTS catalog_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider VARCHAR(20) NOT NULL,
    raw_data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_cache_provider ON catalog_cache(provider);
