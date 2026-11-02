-- Identidad estable de un recurso (fase) entre versiones del OVA. Cada guardado
-- o regeneración crea filas nuevas en ova_phases con otro id, y el historial de
-- micro-versiones (ova_phase_versions.phase_id) quedaba colgado de la fila de
-- la versión anterior: «Historial del recurso» solo mostraba la última entrada.
-- La copia de una fase hereda el linaje de su origen; NULL = su propio id (filas
-- ya existentes o recién creadas), así que no hace falta rellenar nada.
ALTER TABLE ova_phases ADD COLUMN IF NOT EXISTS lineage_id UUID;
CREATE INDEX IF NOT EXISTS ix_ova_phases_lineage_id ON ova_phases (lineage_id);
