-- Enable RLS on tables that were missing it.
ALTER TABLE catalog_cache       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_links          ENABLE ROW LEVEL SECURITY;
ALTER TABLE _migrations_applied ENABLE ROW LEVEL SECURITY;

-- Deny-all policy on every public table.
-- Backend connects as postgres superuser → bypasses RLS.
-- These block only direct PostgREST/Supabase-client (anon/authenticated).
DROP POLICY IF EXISTS backend_only ON users;
CREATE POLICY backend_only ON users USING (false);

DROP POLICY IF EXISTS backend_only ON ovas;
CREATE POLICY backend_only ON ovas USING (false);

DROP POLICY IF EXISTS backend_only ON sessions;
CREATE POLICY backend_only ON sessions USING (false);

DROP POLICY IF EXISTS backend_only ON roles;
CREATE POLICY backend_only ON roles USING (false);

DROP POLICY IF EXISTS backend_only ON user_roles;
CREATE POLICY backend_only ON user_roles USING (false);

DROP POLICY IF EXISTS backend_only ON user_links;
CREATE POLICY backend_only ON user_links USING (false);

DROP POLICY IF EXISTS backend_only ON ova_versions;
CREATE POLICY backend_only ON ova_versions USING (false);

DROP POLICY IF EXISTS backend_only ON ova_phases;
CREATE POLICY backend_only ON ova_phases USING (false);

DROP POLICY IF EXISTS backend_only ON ova_phase_versions;
CREATE POLICY backend_only ON ova_phase_versions USING (false);

DROP POLICY IF EXISTS backend_only ON lab_results;
CREATE POLICY backend_only ON lab_results USING (false);

DROP POLICY IF EXISTS backend_only ON rag_chunks;
CREATE POLICY backend_only ON rag_chunks USING (false);

DROP POLICY IF EXISTS backend_only ON password_reset_tokens;
CREATE POLICY backend_only ON password_reset_tokens USING (false);

DROP POLICY IF EXISTS backend_only ON platform_config;
CREATE POLICY backend_only ON platform_config USING (false);

DROP POLICY IF EXISTS backend_only ON catalog_cache;
CREATE POLICY backend_only ON catalog_cache USING (false);

DROP POLICY IF EXISTS backend_only ON ova_error_logs;
CREATE POLICY backend_only ON ova_error_logs USING (false);

DROP POLICY IF EXISTS backend_only ON ova_jobs;
CREATE POLICY backend_only ON ova_jobs USING (false);

DROP POLICY IF EXISTS backend_only ON ova_job_resources;
CREATE POLICY backend_only ON ova_job_resources USING (false);

DROP POLICY IF EXISTS backend_only ON _migrations_applied;
CREATE POLICY backend_only ON _migrations_applied USING (false);
