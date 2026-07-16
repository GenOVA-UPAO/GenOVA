-- Migration 035: ON DELETE CASCADE en ovas.user_id (landmine C14).
--
-- Contexto:
--   ovas.user_id se creó sin ON DELETE, a diferencia de ova_jobs.user_id y
--   rag_chunks.user_id (que sí cascadeadan). Hoy no hay hard-delete de User
--   (/me solo anonimiza), pero cualquier "purgar usuario"/GDPR futuro
--   reventaría con ForeignKeyViolation sobre las filas de ovas. Se alinea el
--   DDL con el ORM (users/models.py declara cascade="all, delete-orphan" +
--   passive_deletes en la relación User.ovas desde esta misma migración).
--
-- Reversibilidad:
--   UP   recrea la FK con ON DELETE CASCADE.
--   DOWN recrear la FK sin la cláusula ON DELETE.

DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'ovas'::regclass
      AND contype = 'f'
      AND confrelid = 'users'::regclass;

    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE ovas DROP CONSTRAINT %I', fk_name);
    END IF;

    ALTER TABLE ovas
        ADD CONSTRAINT ovas_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;
