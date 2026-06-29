# EN-012 — Observabilidad de errores de generación en Supabase (impl)

Feature: EN-012 · Tipo: Habilitador · Estado: listo para review (NO marcar `done` aquí).
Spec: `sdd/specs/EN-012_observabilidad-errores-supabase.md`. Sin `## Mockup ASCII` → sin wireframe gate.

## Archivos creados / modificados

| Archivo | Acción | Notas |
|---|---|---|
| `backend/migrations/018_ova_error_logs.sql` | nuevo | Tabla `ova_error_logs`, PK `error_id` (UUID, `gen_random_uuid()`), `ova_id`/`user_id` con FK `ON DELETE SET NULL`, `job_id`/`job_resource_id` UUID sin FK (sus tablas llegan con EN-013/019). Índices por `ova_id` y `created_at DESC`. |
| `backend/ova/error_log_model.py` | nuevo | Modelo ORM `OvaErrorLog` + `ERROR_CATEGORIES` + `DEFAULT_CATEGORY`. En módulo aparte para no pasar `models.py` de 200 líneas (C3). |
| `backend/models.py` | editado | Re-exporta `OvaErrorLog` (`import models` registra la tabla en `Base.metadata`). 188 líneas. |
| `backend/ova/error_log_service.py` | nuevo | Helper `log_generation_error(...)` + `_sanitize()` + `_normalize_category()`. 96 líneas. |
| `tests/features/setup/EN-012_error-log.feature` | nuevo | 4 escenarios Gherkin (3 del spec + 1 de categoría inválida). |
| `backend/tests/step_defs/test_error_log_steps.py` | nuevo | Steps pytest-bdd, SQLite in-memory (sin backend HTTP). 198 líneas. |

## Diseño

- **PK = Error ID**: `error_id` UUID v4 generado en Python (`uuid.uuid4`) por el service y
  devuelto al caller → mismo ID que EN-013 guardará y HU-022 mostrará (R2, R5).
- **Sanitización (R4)**: `_sanitize()` aplica regex contra `api_key=`, `token`, `secret`,
  `password`, `authorization`/`Bearer`, prefijos `sk-`/`rk-`/`pk-`, claves Google `AIza…`,
  tokens GitHub `gh[pousr]_…` y JWTs `eyJ….….…` → `[REDACTED]`; recorta a 2000 chars.
- **No rompe el flujo (R7)**: todo el `add+commit` va en `try/except`; usa `commit_or_500()`
  (helper existente en `users/admin_helpers.py`) y, si lanza, se traga la excepción, hace
  rollback best-effort y aún devuelve el `error_id`.
- **No expone interno al cliente (R6)**: el service no devuelve el mensaje, solo `error_id`;
  no se añadió endpoint (consulta vía dashboard de Supabase, fuera de alcance).
- **Sin wiring de consumidores**: por seguridad NO se invoca desde `engage_router`/`explore_router`
  (el spec lo marca opcional y de riesgo); EN-013/HU-022 lo conectarán.

## Mapa R → test (C5)

| Regla | Cubierta por |
|---|---|
| R1 — existe tabla `ova_error_logs`, PK = Error ID (UUID) | migración 018 + modelo; test `test_registrar_error_con_id` (`fila_creada` valida fila + UUID parseable) |
| R2 — helper sanea, persiste y devuelve `error_id` | `test_registrar_error_con_id` (`registra_error` recibe el id) + `test_no_filtra_secretos` |
| R3 — registro incluye id/ova_id/job_resource_id/user_id/categoría/mensaje/created_at; categoría válida | `test_registrar_error_con_id` (`registro_incluye_contexto`) + `test_categoria_invalida` (categoría desconocida → `other`) |
| R4 — sin API keys/tokens/credenciales en el registro | `test_no_filtra_secretos` (`registro_sin_secretos`: API key, `Bearer …`, `GEMINI_API_KEY=` ausentes; `[REDACTED]` presente; también valida `_sanitize` directo) |
| R5 — Error ID guardado coincide con el expuesto | `test_registrar_error_con_id` (`error_id_coincide`) |
| R6 — cliente nunca recibe `str(e)`/stack/mensaje interno, solo `error_id` | el service devuelve solo `str(error_id)` (sin endpoint); `test_fallo_no_interrumpe` (`helper_devuelve_error_id`) confirma que el retorno es un UUID, no el mensaje |
| R7 — registro no rompe el flujo si falla | `test_fallo_no_interrumpe` (`_BrokenSession.commit` lanza → el helper no propaga, el flujo continúa y devuelve Error ID) |
| R8 — ningún archivo nuevo > 200 líneas | model 45 · service 96 · steps 198 · migración 21 (verificado con `wc -l`) |

## Verificación

- `./verify.ps1` → PASA (ESLint, ruff `All checks passed!`, frontend unit BDD 7/7).
  Backend BDD se SKIP-ea porque `:8000` no está arriba; los 4 tests EN-012 corren con
  SQLite in-memory y pasan: `uv run pytest tests/step_defs/test_error_log_steps.py` → 4 passed.
- `uv run pytest tests/step_defs/ --collect-only` → 19 tests, sin errores de import (mis 4 incluidos).

## Decisiones / notas para el reviewer

- Las dev-deps de backend se sincronizaron con `uv sync --extra dev` (faltaban `pytest-bdd`,
  `pytest-cov` en el `.venv`); no cambia `pyproject.toml`.
- Los tests EN-012 no dependen de backend live (a diferencia del resto de `step_defs`, basados
  en HTTP). Usan engine SQLite propio y DDL compatible; en Postgres aplica la migración 018.
