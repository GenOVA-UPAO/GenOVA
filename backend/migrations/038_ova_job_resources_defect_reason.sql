-- Motivo pedagógico cuando un recurso queda `degraded` (no pasa el validador)
-- en vez de `done`. Se expone en el DTO de estado del job para que el usuario
-- sepa por qué y pueda reanudar. El HTML se conserva en `content`.

ALTER TABLE ova_job_resources
    ADD COLUMN IF NOT EXISTS defect_reason TEXT;

COMMENT ON COLUMN ova_job_resources.defect_reason IS
    'Defectos estructurales/de tema que impiden marcar el recurso como done. '
    'NULL = recurso sano o fallo duro sin HTML (ver error_id).';
