-- Regeneraciones de OVAs (chat del editor «Aplicar», «Regenerar OVA completo").
-- Antes su estado vivía en un dict de la memoria del proceso web:
--   · el sondeo de progreso que caía en otro worker de uvicorn daba 404;
--   · al arrancar, un proceso liberaba («listo») el OVA que otro proceso vivo
--     estaba regenerando, porque solo miraba su propio registro;
--   · un reinicio perdía la regeneración y el chat se quedaba girando.
-- Ahora cada regeneración es una fila compartida. Quien la ejecuta (hilo del
-- web o worker arq) la reclama (`owner`) y renueva `heartbeat_at` mientras
-- trabaja; si deja de latir, cualquier proceso puede darla por interrumpida y
-- liberar el OVA. Los tiempos se comparan con el reloj de la BD, no el de cada
-- máquina.
-- RLS deny-all como el resto: el backend (postgres) la salta; PostgREST no ve nada.

CREATE TABLE IF NOT EXISTS regen_jobs (
    id                 UUID        PRIMARY KEY,
    ova_id             UUID        NOT NULL REFERENCES ovas(id) ON DELETE CASCADE,
    -- Proceso ejecutor (host:pid:arranque). NULL = aún en cola, nadie la tomó.
    owner              TEXT,
    -- running (registrada) → generating (en curso) → success | error. Son los
    -- mismos valores que el endpoint de progreso devolvía desde memoria.
    status             TEXT        NOT NULL DEFAULT 'running',
    -- Paso interno real (queued, material, llm, persist, done, interrupted): acota
    -- por abajo el porcentaje estimado por tiempo.
    step               TEXT        NOT NULL DEFAULT 'queued',
    total_phases       INTEGER     NOT NULL DEFAULT 1,
    -- Parámetros de la ejecución: el ejecutor puede ser otro proceso (worker arq).
    prompt             TEXT        NOT NULL DEFAULT '',
    instruction        TEXT,
    phase_ids          JSONB       NOT NULL DEFAULT '[]'::jsonb,
    attachments        JSONB       NOT NULL DEFAULT '[]'::jsonb,
    new_version_number INTEGER,
    -- Informe del material de referencia (RAG) consultado; el chat lo muestra.
    rag                JSONB,
    error              TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at         TIMESTAMPTZ,
    heartbeat_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_regen_jobs_ova_id ON regen_jobs (ova_id);
-- La recuperación solo recorre las que siguen abiertas.
CREATE INDEX IF NOT EXISTS idx_regen_jobs_active
    ON regen_jobs (heartbeat_at) WHERE status IN ('running', 'generating');
CREATE INDEX IF NOT EXISTS idx_regen_jobs_finished_at
    ON regen_jobs (finished_at) WHERE finished_at IS NOT NULL;
ALTER TABLE regen_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS backend_only ON regen_jobs;
CREATE POLICY backend_only ON regen_jobs USING (false);
