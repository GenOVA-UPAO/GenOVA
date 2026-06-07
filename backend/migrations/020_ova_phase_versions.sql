-- Migration 020: micro-versioning per OVA phase (HU-029)
-- Tracks individual edits to a phase as minor versions (vN.M) independent
-- of the global OVA version (vN).

CREATE TABLE IF NOT EXISTS ova_phase_versions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id    UUID NOT NULL REFERENCES ova_phases(id) ON DELETE CASCADE,
    ova_id      UUID NOT NULL REFERENCES ovas(id) ON DELETE CASCADE,
    minor_number INTEGER NOT NULL DEFAULT 1,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opv_phase_id ON ova_phase_versions (phase_id, minor_number DESC);
CREATE INDEX IF NOT EXISTS idx_opv_ova_id   ON ova_phase_versions (ova_id);
