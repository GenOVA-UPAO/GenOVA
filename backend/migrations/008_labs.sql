-- Migration 008: Labs — prompt versioning and lab results

CREATE TABLE IF NOT EXISTS prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase VARCHAR(20) NOT NULL,
    resource_type INTEGER NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    prompt_text TEXT NOT NULL,
    model_id VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_versions_active
    ON prompt_versions(phase, resource_type)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_prompt_versions_lookup
    ON prompt_versions(phase, resource_type, created_at DESC);

CREATE TABLE IF NOT EXISTS lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase VARCHAR(20) NOT NULL,
    resource_type INTEGER NOT NULL,
    concept VARCHAR(500) NOT NULL,
    prompt_text TEXT NOT NULL,
    model_id VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    html_content TEXT,
    raw_json JSONB,
    quality_checks JSONB,
    was_selected BOOLEAN NOT NULL DEFAULT FALSE,
    generation_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_lab_results_lookup
    ON lab_results(phase, resource_type, created_at DESC);
