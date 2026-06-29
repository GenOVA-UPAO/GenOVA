-- Migration 033: drop lab_results (cierre de la deprecación de Labs).
--
-- Contexto:
--   008_labs.sql       creó la tabla lab_results como soporte del sandbox de prompts.
--   009_drop_prompt_versions.sql quitó la persistencia de prompt_versions (Labs
--                        quedó como sandbox puro, "lab_results is kept" a propósito).
--   018_enable_rls.sql  activó Row Level Security sobre lab_results.
--   028_rls_policies.sql añadió la política deny-all "backend_only".
--   033_drop_lab_results.sql (este archivo) elimina la tabla y su policy.
--
-- Reversibilidad: NO es trivialmente reversible (datos de experimentos se pierden).
-- Si se requiere restaurar, restaurar desde snapshot de BD previo al deploy.

DROP POLICY IF EXISTS backend_only ON lab_results;
DROP TABLE IF EXISTS lab_results CASCADE;
