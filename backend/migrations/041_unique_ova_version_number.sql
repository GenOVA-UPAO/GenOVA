-- (ova_id, version_number) debe ser único. create_next_version y regen usaban
-- active.version_number+1, así que un revert a v1 y un nuevo guardado/regen
-- reutilizaban el 2 (dos filas «Versión 2» en el historial).
-- Renumera por created_at y luego fija el índice único.

WITH ordered AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY ova_id ORDER BY created_at ASC, id ASC
           ) AS new_num
    FROM ova_versions
)
UPDATE ova_versions AS v
SET version_number = ordered.new_num
FROM ordered
WHERE v.id = ordered.id
  AND v.version_number IS DISTINCT FROM ordered.new_num;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ova_version_number
    ON ova_versions (ova_id, version_number);
