-- Migration 034: introduce `user_roles.is_primary` so /api/auth/me has a stable,
-- deterministic answer for "qué rol representa a este usuario" en lugar de
-- devolver el primero alfabético (causa raíz de BU-002: la sidebar mostraba
-- "usuario" en lugar de "administrador" tras varias navegaciones).
--
-- Convenciones del repo (ver 030, 031, 032): un único archivo por migración,
-- idempotente, reversible. Las migraciones se ejecutan en orden numérico por
-- el runner de `scripts/migrate.py` — añadir solo al final de la cadena.
--
-- Reversibilidad:
--   UP   añade columna + índice único parcial + backfill determinista.
--   DOWN quita el índice y la columna (no toca el resto de la fila).

-- ── 1. Columna ──────────────────────────────────────────────────────────────
ALTER TABLE user_roles
    ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 2. Restricción: a lo sumo 1 fila con is_primary=TRUE por user_id ─────────
-- Índice único parcial. Si dos INSERTs/UPDATEs intentan marcar otra fila
-- con is_primary=TRUE para el mismo user_id, la BD rechaza la operación.
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_roles_one_primary_per_user
    ON user_roles(user_id)
    WHERE is_primary = TRUE;

-- ── 3. Backfill determinista ─────────────────────────────────────────────────
-- Para cada user: marcar is_primary=TRUE en la fila cuyo role asociado tenga
-- el mayor nº de permisos. En empate (varias filas con el mismo nº de
-- permisos), dejar todas las filas con is_primary=FALSE para ese user — no
-- asumimos cuál prefiere el operador (causa raíz: el orden alfabético previo
-- podía elegir "administrador" sobre "usuario" sin ser decisión consciente).
--
-- Estrategia:
--   a) Numerar todas las filas user_roles por user_id, ordenadas por nº de
--      permisos del role DESC y nombre del role ASC (desempate estable).
--   b) Numerar también por (user_id, perm_count) para detectar empates.
--   c) Marcar is_primary=TRUE solo donde rn=1 AND tie_count=1.

WITH ranked AS (
    SELECT
        ur.user_id,
        ur.role_id,
        ROW_NUMBER() OVER (
            PARTITION BY ur.user_id
            ORDER BY jsonb_array_length(r.permissions) DESC, r.name ASC
        ) AS rn,
        COUNT(*) OVER (
            PARTITION BY ur.user_id, jsonb_array_length(r.permissions)
        ) AS tie_count
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
)
UPDATE user_roles ur
SET is_primary = TRUE
FROM ranked rk
WHERE ur.user_id = rk.user_id
  AND ur.role_id = rk.role_id
  AND rk.rn = 1
  AND rk.tie_count = 1
  AND ur.is_primary = FALSE;

-- ── 4. DOWN (operativo, no se ejecuta en UP) ────────────────────────────────
-- DROP INDEX IF EXISTS ux_user_roles_one_primary_per_user;
-- ALTER TABLE user_roles DROP COLUMN IF EXISTS is_primary;