-- Duración de generación por tipo de recurso: alimenta el tiempo restante estimado
-- (mediana histórica por fase/tipo). Sin contenido ni datos personales.
-- RLS deny-all como el resto: el backend (postgres) la salta; PostgREST no ve nada.

CREATE TABLE IF NOT EXISTS resource_timings (
    id            UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_type    VARCHAR(30)      NOT NULL,
    resource_type VARCHAR(40)      NOT NULL,
    seconds       DOUBLE PRECISION NOT NULL,
    created_at    TIMESTAMPTZ      NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_resource_timings_key
    ON resource_timings (phase_type, resource_type, created_at);

ALTER TABLE resource_timings ENABLE ROW LEVEL SECURITY;
