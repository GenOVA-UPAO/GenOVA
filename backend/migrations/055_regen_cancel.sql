-- «Cancelar» una regeneración del chat (hallazgo A2 del QA 2026-10-06).
-- El ejecutor comprueba esta marca entre recurso y recurso: si está activa,
-- descarta lo ya editado (no crea versión) y devuelve el OVA a «listo».
ALTER TABLE regen_jobs ADD COLUMN IF NOT EXISTS cancel_requested BOOLEAN NOT NULL DEFAULT false;
