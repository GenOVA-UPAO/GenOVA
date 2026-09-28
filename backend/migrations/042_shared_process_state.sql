-- Estado que antes vivía en la memoria de cada proceso y fallaba con varios
-- procesos (varios workers de uvicorn, o web + worker arq): cada uno veía solo lo
-- suyo. Ahora vive aquí, compartido. Todas son tablas de vida corta: cada fila
-- lleva su caducidad y se purga sola (al usarse o al arrancar).
-- RLS deny-all como el resto: el backend (postgres) la salta; PostgREST no ve nada.

-- 1) Subidas temporales (antes un dict por proceso): una subida hecha en un
--    worker tiene que verse (estado «indexando/listo», reclamo al crear el OVA)
--    desde cualquier otro. El archivo sigue en disco (UPLOAD_TEMP_DIR).
CREATE TABLE IF NOT EXISTS temp_uploads (
    upload_id    UUID        PRIMARY KEY,
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename     TEXT        NOT NULL,
    content_type TEXT        NOT NULL,
    size_bytes   BIGINT      NOT NULL,
    storage_path TEXT        NOT NULL,
    -- Contexto de la lista: NULL = formulario de crear OVA; un id = chat del editor.
    ova_id       UUID,
    rag_status   JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ NOT NULL,
    confirmed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_temp_uploads_user_active
    ON temp_uploads (user_id, ova_id) WHERE confirmed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_temp_uploads_expires_at ON temp_uploads (expires_at);
ALTER TABLE temp_uploads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS backend_only ON temp_uploads;
CREATE POLICY backend_only ON temp_uploads USING (false);

-- 2) Ventanas deslizantes compartidas (límite de «Probar un modelo»…): con N
--    procesos y un contador en memoria el límite real era N veces mayor.
--    Una fila por intento; `expires_at` = intento + ventana.
CREATE TABLE IF NOT EXISTS throttle_hits (
    id         BIGSERIAL   PRIMARY KEY,
    bucket     TEXT        NOT NULL,
    subject    TEXT        NOT NULL,
    hit_at     TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_throttle_hits_key
    ON throttle_hits (bucket, subject, expires_at);
CREATE INDEX IF NOT EXISTS idx_throttle_hits_expires_at ON throttle_hits (expires_at);
ALTER TABLE throttle_hits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS backend_only ON throttle_hits;
CREATE POLICY backend_only ON throttle_hits USING (false);

-- 3) Reclamo exclusivo de la espera de un video tardío: la web y el worker
--    reanudan al arrancar los avisos pendientes; sin reclamo, ambos sondeaban y
--    descargaban el mismo trabajo. El dueño renueva `expires_at` mientras su hilo
--    vive; si el proceso muere, el reclamo caduca y otro puede tomarlo.
--    (No advisory locks de sesión: el pooler de Supabase es por transacción.)
CREATE TABLE IF NOT EXISTS late_video_claims (
    job_id     TEXT        PRIMARY KEY,
    owner      TEXT        NOT NULL,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    done       BOOLEAN     NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_late_video_claims_expires_at ON late_video_claims (expires_at);
ALTER TABLE late_video_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS backend_only ON late_video_claims;
CREATE POLICY backend_only ON late_video_claims USING (false);

-- 4) Tickets del segundo paso del login con 2FA: se emitía en un proceso y el
--    código TOTP podía llegar a otro, que no lo conocía («ticket caducado»).
--    Se guarda el hash del ticket, nunca el ticket.
CREATE TABLE IF NOT EXISTS totp_login_tickets (
    ticket_hash TEXT        PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    remember_me BOOLEAN     NOT NULL DEFAULT false,
    expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_totp_login_tickets_expires_at ON totp_login_tickets (expires_at);
ALTER TABLE totp_login_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS backend_only ON totp_login_tickets;
CREATE POLICY backend_only ON totp_login_tickets USING (false);
