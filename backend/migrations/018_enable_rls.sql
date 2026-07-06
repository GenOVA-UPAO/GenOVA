-- EN-019: Habilitar RLS en todas las tablas del schema public
-- El backend conecta via service role (bypasses RLS) → sin impacto funcional.
-- Bloquea acceso anon/authenticated via PostgREST (ningún cliente directo existe).
--
-- Fix (audit 2026-07-06 #6): las tablas checkpoint_* las crea LangGraph en el
-- primer uso del checkpointer, no una migración — pueden no existir aún y un
-- ALTER directo aborta toda la migración en cada arranque. Se condiciona cada
-- ALTER a la existencia de la tabla via to_regclass().
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        '_migrations_applied',
        'users',
        'ovas',
        'sessions',
        'roles',
        'user_roles',
        'password_reset_tokens',
        'ova_versions',
        'ova_phases',
        'lab_results',
        'rag_chunks',
        'ova_error_logs',
        'ova_jobs',
        'ova_job_resources',
        'ova_phase_versions',
        'catalog_cache',
        'platform_config',
        'checkpoint_migrations',
        'checkpoints',
        'checkpoint_blobs',
        'checkpoint_writes'
    ]
    LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        END IF;
    END LOOP;
END $$;
