# Sesión actual

> Este archivo se vacía al cerrar cada sesión y su contenido se mueve a `history.md`.
> Mantenlo actualizado en tiempo real mientras trabajas, no al final.

- **Feature en curso:** Importar product backlog Notion → `sdd/backlog.md` (Fase A)
- **Inicio:** 2026-06-04 | branch=feature/backlog_integration
- **Agente:** leader (transcripción directa, no es feature de código)

## Plan

Plan aprobado: `~/.claude/plans/mira-te-pase-todo-dreamy-thimble.md`.
Fase A (ahora): transcribir 62 capturas de `para_borrar/` a `sdd/backlog.md`
(índice + sección por ítem, metadata + descripción + criterios literales).
Fase B (después): specs vía spec_author, por ítem.

## Bitácora

- Esqueleto `sdd/backlog.md` creado (header + leyenda + índice).
- Transcripción de las 62 capturas en 5 lotes → `sdd/backlog.md` (índice por tipo + sección detalle por ítem con metadata, descripción y criterios literales).
- Corregido error de mapeo: `220047`=SP-009 (no DO-003); DO-003 reubicado en su posición real (`220447`).
- Verificado: 62 ítems detalle = 62 filas-ID, sin duplicados. EP=10, HU=19, EN=11, RN=4, TA=7, SP=8, DO=3.
- Huecos documentados en el índice: SP-008, HU-016, HU-017, EP-D (referenciados, sin captura).

## Fase A.2 — Organizar + huecos (COMPLETA)

- `sdd/backlog.md` reorganizado por **épica** (árbol: `## EP-x` + hijos `###` por tipo) + roadmap por sprint + índice por tipo.
- Huecos llenados: **SP-008** reescrito (buenos principios frontend para apps web), **HU-016** (Cambiar Contraseña, contenido del repo), **HU-017** (Eliminar/baja cuenta, borrador). **EP-D → EP-4** normalizado en deps de EN-007 y DO-002.
- Verificado: 65 ítems detalle = 65 IDs · 10 `## EP-` · 0 `EP-D` en deps · SP-008/HU-016/HU-017 presentes.

## Fase A.3 — Estandarización + nuevos ítems + limpieza (COMPLETA)

- `sdd/backlog.md` estandarizado: criterios → **bullets atómicos**; descripción → **Historia de usuario** (HU) / **Objetivo** (resto) + **Contexto**; roles unificados.
- HU-016/HU-017 con metadata completada (estimación/prioridad/dep/fechas, marcadas inferido/borrador).
- 11 ítems nuevos (roadmap editor OVA) en EP-3: HU-022…HU-030, EN-012, EN-013. + RN-005 (responsive, propuesto). shadcn FUERA del backlog (refactor).
- Limpieza: `para_borrar/` borrada; `.gitignore` sin `/para_borrar`, sin bloques duplicados.
- Verificado: 77 ítems = 77 IDs · 30 Historia de usuario · 47 Objetivo · 0 formato viejo · 0 EP-D en deps · 0 criterios en prosa.

## Fase B — Specs vía spec_author (EN CURSO)

**Setup (COMPLETO):**
- `sdd/spikes/` + `sdd/docs-specs/` creadas (README).
- `feature_list.json` → `spec_dirs` con SP→sdd/spikes/, DO→sdd/docs-specs/.
- `.claude/agents/spec_author.md` extendido: tipos SP/DO, rutas, lectura de `sdd/backlog.md`, bloque de metadata de 13 campos obligatorio, templates SP/DO, tablas de secciones obligatorias y status mapping (Closed→done, To Do→pending).

**Base mecánica (COMPLETA):**
- Step 5: `feature_list.json` reconciliado a 77 ítems (28 done / 49 pending, status mapeado Closed→done, To Do→pending; sin degradar los ya done). JSON validado, sin IDs duplicados.
- Step 4: bloque de metadata antepuesto a los 21 specs `done` (verificado 21/21).
- `verify.ps1 -Quick` verde.

**Pendiente (interactivo, por ítem, puerta humana):**
- Step 3: redactar specs de los 49 pending con spec_author (flujo 4 pasos). Para las features del editor OVA (HU-022…HU-030, EN-012/013) conviene `explorer` antes (pipeline de generación, versionado existente, storage).

## Fase B — redacción de specs (EN CURSO)

- `explorer` mapeó el sustrato del editor OVA (pipeline gen client-orquestado, versionado OVA-completo ya existe sin revert/diff, jobs in-memory, sin error log).
- **EN-013** spec redactada vía spec_author (4 pasos, asunciones aprobadas) → `spec_ready -> sdd/specs/EN-013_persistencia-estado-generacion.md`. feature_list actualizado.

- Corrección clave: **recurso = elemento generable dentro de una fase** (no la fase entera). EN-013 ajustado (`ova_job_resources` = 1 fila por recurso, con `resource_type`/`resource_order`).
- **HU-022** spec redactada (recurso parcial + Error ID + "X" por recurso + reintento individual y múltiple con "seleccionar todos los fallidos") → `spec_ready -> sdd/specs/HU-022_recuperar-recursos-parciales.md`. Incluye Mockup ASCII → aplica C8 (wireframe gate) en impl.

- **HU-023** spec redactada (background + reanudar desde Mis OVAs, polling, continuar interrumpido) → `spec_ready -> sdd/specs/HU-023_generacion-background-reanudacion.md`. Mockup ASCII → C8.

## Specs spec_ready (Fase B)
- EN-013 jobs · HU-022 recuperar parciales · HU-023 background/reanudar (trío job server-side, orden impl EN-013→HU-022→HU-023).
- HU-024 archivos estilo chat (UI, reusa HU-007).
- HU-025 workspace (cáscara split, Preview/Code, SCORM, anclajes HU-026/027/028).
- HU-026 editar por click (Regenerar/Editar/Eliminar + edición por código). Desgajó **HU-031** (granular sub-recurso, nuevo en backlog → 78 ítems).
- HU-027 seleccionar recursos como contexto del prompt.
- HU-028 versionado OVA (badge versión + historial + diff + revertir + "…" duplicar/eliminar). Backend nuevo revert/diff.

- HU-029 micro-versionado por recurso. **Esquema de versiones de 3 niveles**: major `vN` (generación completa, HU-028) · minor `vN.M` (recurso, HU-029) · patch `vN.M.P` (granular, HU-031). Cross-ref añadida a HU-028 y HU-031.
- HU-030 Mis OVAs→workspace + versión. EN-012 error log Supabase. HU-031 edición granular sub-recurso (patch).

## Bloque editor OVA — specs COMPLETO (16 spec_ready)
EN-012, EN-013, HU-022, HU-023, HU-024, HU-025, HU-026, HU-027, HU-028, HU-029, HU-030, HU-031, HU-032, HU-033, RN-005.
Backlog = 80 ítems. Reglas transversales: máx 4 recursos/fase · versionado 3 niveles · chat=editar · reordenar solo dentro de la fase · eliminar recurso = HU-026.

## Implementación (EN CURSO)

Commit hito specs: `2208230`. Orden de impl: **EN-012 → EN-013 → HU-022 → HU-023 → HU-024 → HU-025 → HU-026 → HU-027 → HU-032 → HU-033 → HU-028 → HU-029 → HU-030 → HU-031**.

- **EN-012** `in_progress` (primer feature, aislado): tabla `ova_error_logs` (migración 018) + helper `log_generation_error()` + sanitización + tests. EN-013 usará después su `error_id` (migración 019).

## EN-012 — Implementación (implementer, EN CURSO)

**Feature en curso:** EN-012 — Observabilidad de errores de generación en Supabase.
Spec sin `## Mockup ASCII` → sin wireframe gate. Backend puro (SQLAlchemy ya en uso,
sin librerías nuevas → sin ctx7).

**Plan (router → service → model + migración):**
1. Migración `backend/migrations/018_ova_error_logs.sql` (tabla `ova_error_logs`,
   PK `error_id`, columnas nullable para `ova_id`/`job_id`/`job_resource_id`).
2. Modelo `OvaErrorLog` en módulo nuevo `backend/ova/error_log_model.py` (models.py
   está a 188 líneas; añadirlo dentro lo pasaría de 200 → C3). `models.py` lo re-exporta
   para que `import models` lo registre en la metadata.
3. Service `backend/ova/error_log_service.py`: `log_generation_error(...)` genera UUID,
   sanea (R4), persiste con `commit_or_500()`, no rompe el flujo si falla (R7), devuelve `error_id`.
4. Sanitizador `_sanitize` (regex de keys/tokens/credenciales).
5. Tests BDD `backend/tests/step_defs/test_error_log_steps.py` + feature
   `tests/features/setup/EN-012_error-log.feature`, con SQLite in-memory (sin backend live).

**Decisiones:**
- No se wirea ningún consumidor (engage_router/explore_router) en EN-012 para no tocar
  el pipeline; EN-013/HU-022 lo conectarán (spec lo marca opcional y de riesgo).
- No hay endpoint nuevo: la consulta se hace en el dashboard de Supabase (fuera de alcance).

**COMPLETO (listo para review):**
- Migración 018, modelo `OvaErrorLog` (módulo aparte, re-export en models.py), service
  `log_generation_error()` con `_sanitize` (R4) + `commit_or_500` + try/except (R7).
- Tests BDD: `tests/features/setup/EN-012_error-log.feature` (4 esc.) +
  `backend/tests/step_defs/test_error_log_steps.py` (SQLite in-memory, sin backend live) → 4 passed.
- Mapa R1–R8 → test documentado en `sdd/progress/impl_en-012.md` (C5).
- `./verify.ps1` → PASA (ESLint, ruff, frontend unit BDD). Backend BDD SKIP (:8000 offline);
  los 4 tests EN-012 corren standalone y pasan.
- Dev-deps backend sincronizadas (`uv sync --extra dev`: faltaban pytest-bdd/pytest-cov).
- Archivos nuevos bajo 200 líneas (model 45 · service 96 · steps 198 · migración 21). EN-012 NO
  marcada `done` (lo hace el reviewer).

## EN-012 — Revisión (leader inline, APROBADO)

Reviewer subagente se cortó por límite de sesión → revisión hecha inline.
Veredicto: **APROBADO**. C1 tests 4/4 + verify unit · C2 ruff · C3 todos <200
(service 97 · model 45 · models.py 188 · tests 198) · C4 sanitización OK (sin
str(e)/tokens, commit_or_500, best-effort) · C5 R→test · C6 verify.ps1 · C7
service+model (sin router por diseño) · C8 N/A. **EN-012 → `done`** en feature_list.

## Próximo paso

⏸ Puerta humana. **EN-013** es el siguiente (migración 019, modelos OvaJob/
OvaJobResource, jobs_router/service, mover orquestación al server). Toca generación
en producción → confirmar antes de implementar.
