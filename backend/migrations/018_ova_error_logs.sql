-- EN-012: Observability of generation errors in Supabase.
-- Records every generation failure with an opaque, searchable Error ID and a
-- sanitized technical message. PK = error_id (the opaque ID exposed to the
-- user via EN-013/HU-022). job_id / job_resource_id are nullable and FK-free
-- on purpose: the ova_jobs / ova_job_resources tables ship with EN-013 (019),
-- so we keep them as plain UUID columns here to avoid a forward dependency.
CREATE TABLE IF NOT EXISTS ova_error_logs (
    error_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ova_id          UUID REFERENCES ovas(id) ON DELETE SET NULL,
    job_id          UUID,
    job_resource_id UUID,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    error_category  VARCHAR(20) NOT NULL DEFAULT 'other',
    message         TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Diagnostics in the Supabase dashboard are mostly "errors for this OVA" and
-- "recent errors", so index by ova_id and by recency.
CREATE INDEX IF NOT EXISTS idx_ova_error_logs_ova_id ON ova_error_logs (ova_id);
CREATE INDEX IF NOT EXISTS idx_ova_error_logs_created_at ON ova_error_logs (created_at DESC);
