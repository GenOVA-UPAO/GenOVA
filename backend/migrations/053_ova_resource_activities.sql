-- Datos estructurados de cada recurso generado por plantilla (ova_engine): clave de
-- la plantilla, JSON de texto validado y params decididos. Permiten exportar las
-- evaluaciones como actividades editables (H5P, iDevices nativos de eXeLearning).
--
-- La fila se identifica por el sha256 del HTML generado (`content_sha256`), no por la
-- fase: el mismo HTML pasa del job a la fase y se copia entre versiones sin tocar esta
-- tabla. Si el docente edita el HTML, su hash ya no coincide → los datos quedan
-- desincronizados y el recurso se exporta como HTML (nunca con datos que no
-- corresponden a lo que ve el estudiante).
-- RLS deny-all como el resto: el backend (postgres) la salta; PostgREST no ve nada.

CREATE TABLE IF NOT EXISTS ova_resource_activities (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    content_sha256 CHAR(64)    NOT NULL,
    template_key   VARCHAR(40) NOT NULL,
    phase_type     VARCHAR(30) NOT NULL,
    resource_type  VARCHAR(40),
    data           JSONB       NOT NULL,
    params         JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ova_resource_activities_sha UNIQUE (content_sha256)
);
CREATE INDEX IF NOT EXISTS idx_ova_resource_activities_template
    ON ova_resource_activities (template_key);
ALTER TABLE ova_resource_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS backend_only ON ova_resource_activities;
CREATE POLICY backend_only ON ova_resource_activities USING (false);
