-- EN-013: Persist the state of each OVA generation as a job + per-resource rows.
-- Moves generation orchestration from the browser to the server so it survives a
-- client disconnect and can be polled / resumed. One ova_jobs row per generation;
-- one ova_job_resources row per generable resource (text, image, code, exercise…)
-- inside a 5E phase. The opaque job_id (UUID) is what HU-023 / "Mis OVAs" use to
-- locate an in-progress generation by ova_id/user_id.

CREATE TABLE IF NOT EXISTS ova_jobs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ova_id      UUID REFERENCES ovas(id) ON DELETE SET NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'queued',
    prompt      TEXT NOT NULL DEFAULT '',
    params      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at  TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

-- "Mis OVAs" (HU-023) locates a job by ova_id/user_id; recency narrows to the
-- latest/in-progress generation.
CREATE INDEX IF NOT EXISTS idx_ova_jobs_user_id ON ova_jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ova_jobs_ova_id ON ova_jobs (ova_id);

CREATE TABLE IF NOT EXISTS ova_job_resources (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id         UUID NOT NULL REFERENCES ova_jobs(id) ON DELETE CASCADE,
    phase_type     VARCHAR(30) NOT NULL,
    phase_order    INTEGER NOT NULL,
    resource_type  VARCHAR(40),
    resource_order INTEGER NOT NULL DEFAULT 0,
    status         VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts       INTEGER NOT NULL DEFAULT 0,
    error_id       UUID,
    ova_phase_id   UUID REFERENCES ova_phases(id) ON DELETE SET NULL,
    content        TEXT,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Progress queries and the runner both walk resources in (phase, resource) order.
CREATE INDEX IF NOT EXISTS idx_ova_job_resources_order
    ON ova_job_resources (job_id, phase_order, resource_order);
