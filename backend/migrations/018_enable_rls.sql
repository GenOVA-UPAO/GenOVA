-- EN-019: Habilitar RLS en todas las tablas del schema public
-- El backend conecta via service role (bypasses RLS) → sin impacto funcional.
-- Bloquea acceso anon/authenticated via PostgREST (ningún cliente directo existe).
ALTER TABLE public._migrations_applied ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ovas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ova_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ova_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ova_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ova_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ova_job_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ova_phase_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoint_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoint_blobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoint_writes ENABLE ROW LEVEL SECURITY;
