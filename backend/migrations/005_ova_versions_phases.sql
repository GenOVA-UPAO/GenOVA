-- Migration 005: OVA versions and phases for HU-011 (Edit OVA)

ALTER TABLE ovas ADD COLUMN IF NOT EXISTS current_version_id UUID;

CREATE TABLE IF NOT EXISTS ova_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ova_id UUID NOT NULL REFERENCES ovas(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    prompt TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ova_versions_ova_id ON ova_versions(ova_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_version_per_ova
    ON ova_versions(ova_id)
    WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS ova_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES ova_versions(id) ON DELETE CASCADE,
    phase_type VARCHAR(30) NOT NULL,
    phase_order INTEGER NOT NULL,
    content TEXT NOT NULL,
    regenerated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ova_phases_version_id ON ova_phases(version_id);
