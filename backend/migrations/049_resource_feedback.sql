-- Valoración del docente por recurso generado (👍/👎 en la vista previa).
-- Alimenta el análisis y el entrenamiento del planner y de las plantillas
-- (scripts/export_generation_feedback.py). Una fila por (usuario, recurso):
-- volver a valorar actualiza la fila. `phase_id` no lleva FK a propósito: al
-- regenerar o borrar la fase la valoración se conserva como dato de calidad.
-- RLS deny-all como el resto: el backend (postgres) la salta; PostgREST no ve nada.

CREATE TABLE IF NOT EXISTS resource_feedback (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ova_id        UUID        NOT NULL REFERENCES ovas(id) ON DELETE CASCADE,
    phase_id      UUID        NOT NULL,
    phase         VARCHAR(30) NOT NULL,
    resource_type VARCHAR(40),
    template_key  VARCHAR(40),
    params        JSONB       NOT NULL DEFAULT '{}'::jsonb,
    rating        VARCHAR(4)  NOT NULL CHECK (rating IN ('up', 'down')),
    reason        VARCHAR(30) CHECK (reason IN (
        'contenido_incorrecto', 'fuera_de_tema', 'diseño', 'no_funciona', 'muy_largo', 'muy_corto', 'otro'
    )),
    comment       VARCHAR(500),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_resource_feedback_user_phase UNIQUE (user_id, phase_id)
);
CREATE INDEX IF NOT EXISTS idx_resource_feedback_ova_id ON resource_feedback (ova_id);
CREATE INDEX IF NOT EXISTS idx_resource_feedback_template ON resource_feedback (template_key, rating);
ALTER TABLE resource_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS backend_only ON resource_feedback;
CREATE POLICY backend_only ON resource_feedback USING (false);
