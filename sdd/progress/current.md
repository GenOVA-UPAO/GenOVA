# Sesión actual

**Fecha:** 2026-06-29
**Agente:** opencode (leader)
**Sprint:** 3

## Resumen

Deprecación completa del módulo **Labs** (sandbox de iteración de prompts) — eliminada por motivos de seguridad y para reducir superficie de ataque. Decisión del usuario con aprobación explícita de saltarse la fase de spec (regla dura "no saltar spec" sustituida por aprobación humana explícita del usuario).

## Hecho en esta sesión

### Alcance de la eliminación
- **Backend Python**: borrada carpeta `backend/labs/` (9 archivos)
- **Backend CLI**: borrada carpeta `backend/tools/` (4 archivos + `winners/`, `__pycache__/`, `__init__.py`)
- **Frontend React**: borrada carpeta `frontend/src/features/labs/` (11 archivos)
- **BD**: creada migration `033_drop_lab_results.sql` (DROP POLICY + DROP TABLE CASCADE)
- **Routers**: quitados de `main.py` líneas 27-28, 57 (exclusion latency), 288-289
- **Models registry**: quitado `LabResult` de `backend/models.py:22, 33`
- **App.tsx**: quitado lazy import `LabsPage` (líneas 68-72) y ruta `/admin/labs` (línea 184)
- **Tests**: editado `tests/steps/unit/quality_unit.steps.js` — quitado import y scenarios de `checkHtmlQuality` (mantenido ESLint scenario independiente)
- **Docs**: borrado `docs/labs.md`, editados `docs/api.md`, `docs/database.md`, `docs/catalogo-modelos.md`, `docs/mejoras-infra-2026-06.md`, `README.md`, `tests/playwright-smoke/SMOKE_TESTS.md`, `CHECKPOINTS.md`
- **Histórico preservado**: NO se tocan `000_schema_complete.sql`, `008_labs.sql`, `009_drop_prompt_versions.sql`, `018_enable_rls.sql`, `028_rls_policies.sql` (decisiones del pasado quedan como están; el comentario "lab_results is kept" de `009` queda como testimonio histórico)
- **`feature_list.json`**: nuevo item `EN-023` (deprecación Labs) marcado `done`

### Decisiones SDD explícitas
- El usuario pidió saltarse la fase de spec para esta eliminación. Se documenta esta excepción (puerta humana explícita).
- Se conserva el flujo de implementación + verify (lint, ruff, BDD unit) sin saltar esos gates.

## Próximo paso
1. `verify.ps1 -Quick` — confirmar verde tras borrados
2. Commit + push
3. Continuar con resto del plan de seguridad (rotación API keys, eliminación de Labs var en Railway, etc.)

## Pendiente del plan seguridad original
- Revisar `LABS_MAX_WORKERS` en Railway (variables del servicio)
- Continuar con la siguiente capa de "reforzar seguridad" (rotación de claves, etc.)
