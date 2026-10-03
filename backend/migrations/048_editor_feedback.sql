CREATE TABLE IF NOT EXISTS editor_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ova_id UUID NOT NULL REFERENCES ovas(id) ON DELETE CASCADE,
    fase_id VARCHAR(100),
    instruccion TEXT,
    bloques_antes JSONB DEFAULT '[]'::jsonb,
    intencion_propuesta JSONB,
    intencion_final JSONB,
    resultado VARCHAR(30) NOT NULL CHECK (resultado IN ('applied', 'undone', 'cancelled', 'rejected_guard')),
    confianza DOUBLE PRECISION,
    backend VARCHAR(50),
    motivo_rechazo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_editor_feedback_ova_id ON editor_feedback(ova_id);
CREATE INDEX IF NOT EXISTS ix_editor_feedback_user_id ON editor_feedback(user_id);
CREATE INDEX IF NOT EXISTS ix_editor_feedback_resultado ON editor_feedback(resultado);
CREATE INDEX IF NOT EXISTS ix_editor_feedback_created_at ON editor_feedback(created_at);

ALTER TABLE editor_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS backend_only ON editor_feedback;
CREATE POLICY backend_only ON editor_feedback USING (false);
