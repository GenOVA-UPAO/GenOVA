# Historial de sesiones

> Bitácora append-only. Cada entrada es el resumen de una sesión completada,
> copiado desde `progress/current.md` al cerrar.

---

## 2026-05-28 — Harness Engineering + SDD

**Agente:** leader (setup inicial)
**Alcance:** Instalación completa del harness — specs fijados, agentes creados,
hooks configurados, verify.ps1, CLAUDE.md y README actualizados.

**Completado:**
- Fase 0: Fix specs INC-001 a INC-007, eliminado TA-BDD-incompatibilidades.md
- Fase 1: progress/, feature_list.json, AGENTS.md, CHECKPOINTS.md
- Fase 2: .claude/agents/ (leader, spec_author, implementer, reviewer)
- Fase 3: .claude/hooks/, verify.ps1, .claude/settings.json actualizado
- Fase 4: CLAUDE.md slim, README.md actualizado

**Estado:** DONE

---

## 2026-06-04/05 — Import backlog Notion + specs editor OVA + impl EN-012/EN-013

**Agente:** leader (orquesta: explorer, spec_author inline, implementer, reviewer inline)
**Alcance:** Importar el product backlog de Notion al repo, estandarizarlo, redactar
las specs del editor avanzado de OVA y empezar la implementación.

**Completado:**
- **Fase A**: transcripción fiel de 62 capturas (`para_borrar/`) → `sdd/backlog.md`.
- **Fase A.2**: reorganización por épica + huecos (SP-008 reescrito, HU-016/HU-017, EP-D→EP-4).
- **Fase A.3**: estandarización (criterios = bullets atómicos; descripción = Historia/Objetivo+Contexto; roles unificados); limpieza `para_borrar/` + `.gitignore`. shadcn FUERA del backlog.
- **Fase B setup**: `sdd/spikes/` + `sdd/docs-specs/`, `spec_author` extendido (SP/DO + metadata), `feature_list` reconciliado (80 ítems), metadata antepuesta a 21 specs `done`.
- **Specs editor OVA (15 `spec_ready`)**: EN-012, EN-013, HU-022…HU-033, RN-005. Commit `2208230`. Reglas transversales: máx 4 recursos/fase · versionado 3 niveles (vN/vN.M/vN.M.P) · chat=editar · reordenar intra-fase · eliminar=HU-026.
- **Implementación**: **EN-012** error log Supabase (`a3201ca`) + **EN-013** jobs server-side + persistencia (`c4f6d07`). 11 tests verdes, verify.ps1 PASA. Backend del editor listo (aditivo, no toca generación en prod). Frontend pendiente (HU-022/HU-023).
- CHECKPOINTS C3: el límite <200 líneas **no aplica a tests** (decisión del usuario).

**Estado:** PAUSADO. Pendiente: HU-023/HU-022 (frontend que consume jobs) y resto del editor (HU-024…033, versionado). Backlog en `sdd/backlog.md`; 80 ítems, 30 done.

---

## 2026-06-05/06 — HU-022 frontend + lote EP-3 iniciado

**Agente:** leader (orquesta: implementer, reviewer)
**Alcance:** Frontend HU-022 (F1-F4) completado. Inicio lote EP-3 (12 features spec_ready).

**Completado:**
- **HU-022 frontend F1-F4**: `ovaCreationService.js` (startJob/getJobStatus/getResourceContent/resumeJob), `useOvaJob.js` (165 líneas, polling + viewmodel + retry), `useOvaCreation.js` adelgazado a 68 líneas, `useResourceContent.js`, `lib/ovaJobViewModel.js`, componentes `ResourceList`/`ProgressPanel`/`ResourcePreview`/`TotalFailurePanel`, `CrearOvaPage` reescrito. 5 BDD scenarios HU-022 verdes.
- **Migración shadcn/ui completa**: Button, Badge, Checkbox, Input, Textarea, Select, Label, Dialog, Alert, Table — todos los archivos frontend migrados, `frontend/README.md` actualizado, `AGENTS.md` 4 fixes aplicados.
- **HU-022 done**: `merge_commit: 0ff7465`, verify.ps1 PASA (12/12 unit BDD).
- Lote EP-3 aprobado: HU-024→HU-023→HU-025→HU-030→HU-033→HU-026→HU-028→HU-027→HU-029→HU-032→HU-031→RN-005.

**Estado:** LOTE EP-3 en ejecución.

---

## 2026-06-06 — Lote EP-3 parte 2 (HU-033/026/028/027/029/032/031 + RN-005)

**Agente:** leader (orquesta: implementer, reviewer inline)
**Alcance:** 8 features restantes del lote EP-3 — workspace editor completo.
**Commit:** `b62e216`

**Completado:**

**Backend (nuevos routers + endpoints):**
- `PATCH /{ova_id}/fases/reorder` — reordenar fases intra-tipo (HU-033)
- `DELETE /{ova_id}/fases/{fase_id}` — eliminar fase + nueva versión (HU-026)
- `POST /{ova_id}/versiones/{v}/revert` + `GET /versiones/diff` (HU-028)
- `OvaPhaseVersion` model + migración 020 + micro-versioning en save/regen (HU-029)
- `POST /{ova_id}/fases` — añadir recurso, máx 4 por tipo (HU-032)
- `PATCH /{ova_id}/fases/{fase_id}/subelementos/{sub_id}` — 501 fallback (HU-031)
- Todos los endpoints nuevos: `@limiter.limit` + `commit_or_500`

**Frontend (nuevos componentes y hooks):**
- `WorkspacePhaseItem` — drag handle + edit/regen/delete/history por fase
- `WorkspaceResourceList` — agrupado por phase_type + botón Añadir
- `PhaseVersionHistory` — dialog micro-versiones por recurso
- `VersionHistoryPanel` — diff + revertir a nivel OVA
- `AddResourceModal` — modal de prompt con guard max-4
- `useOvaWorkspace` ampliado: reorderWithinPhase, deleteOvaPhase, addOvaPhase, revertVersion, getDiff, selectionMode, togglePhaseSelection
- `WorkspaceChatPanel` — modo selección + checkboxes por fase (HU-027)
- Drag-drop nativo HTML5 con optimistic update + rollback

**Tests:** 7 .feature + 7 step files — 52 scenarios, 171 steps verdes.

**RN-005:** checklist responsivo documentado en `sdd/progress/impl_RN-005.md`. Workspace usa `sm:` breakpoint → mobile tabs Chat|Preview.

**Verificación:** `verify.ps1 -Quick` PASA (ESLint + ruff + 52 BDD unit).

**Estado:** EP-3 lote completo. Todas las features `done`.

---

## 2026-06-07 — Unificar crear+editar OVA en workspace + arreglar generación/SCORM

**Agente:** opencode (inline)
**Alcance:** HU-025 workspace unificado — crear y editar OVA en un solo panel dividido. Fix generación EXPLORE completa y exportación SCORM habilitada.

**Completado:**
- `CrearOvaPage` → workspace full-bleed split-panel (preview izquierda, chat derecha)
- `WorkspaceHtmlPreview` reemplaza `OvaFiveEViewer` (fix preview en blanco)
- OVA placeholder creado al inicio del job → aparece en Mis OVAs inmediatamente
- EXPLORE generation completa + SCORM export habilitado (`52242dd`)
- HU-025: `merge_commit: ff3b7b7` (conjunto de commits `c701602`…`52242dd`)

**Verificación:** verify.ps1 PASA.

**Estado:** DONE.

---

## 2026-06-08 — Catálogo unificado de modelos (HU-034)

**Agente:** opencode (inline)
**Alcance:** Catálogo ~300 modelos con fetch de APIs OpenRouter/Groq, pricing en UI, enable/disable por usuario, infinite scroll y filtro por categoría.

**Completado:**
- `GET /catalog/all` — agrega OpenRouter + Groq (~300 modelos), deduplica por ID
- `frontend/src/pages/CatalogPage.jsx` — búsqueda, filtro categoría, infinite scroll, toggle enable/disable
- Fix `catalog_all` — colisión de keys en dict causaba retorno de solo 2 modelos
- Pre-populate catálogo curado para evitar UI vacía en entornos sin API keys
- `merge_commit: f143a76`

**Verificación:** verify.ps1 PASA.

**Estado:** DONE.

---

## 2026-06-08 — Arquitectura Multi-Agente Prometheus con LangGraph (EN-003 / EP-5)

**Agente:** opencode (inline)
**Alcance:** Implementar arquitectura multi-agente Prometheus sobre LangGraph. Refactorizar ENGAGE/EXPLORE, añadir 3 fases 5E faltantes (EXPLAIN, ELABORATE, EVALUATE) con 10 recursos cada una (50 recursos total).

**Completado:**

**Nuevo paquete `backend/prometheus/` (14 archivos):**
- `state.py`: `OvaGenerationState` TypedDict compartido
- `graph.py`: `StateGraph` con 8 nodos + conditional edges (concierge → fases → validate → next/retry → assemble)
- `checkpointer.py`: `PostgresSaver` con fallback `MemorySaver`
- `nodes/`: concierge, engage, explore, explain, elaborate, evaluate, validate, assemble
- `tools/`: `llm_generate.py`, `rag_search.py`
- `plans/`: `two_step.py`, `direct_code.py`, `podcast.py`

**Nuevos prompts (3 archivos, ~400 líneas):**
- `explain_prompts.py`: Video, Lectura, Mapa Conceptual, FAQ, Demo, Glosario, Timeline, Diagrama, Tabla, Infografía
- `elaborate_prompts.py`: Caso, Ejercicio, Proyecto, Simulación, Análisis, Escenario, Lab, Problemas, Estrategia, Reto
- `evaluate_prompts.py`: Quiz, Rúbrica, Desafío, Examen, Completar, Relacionar, Crucigrama, Desarrollo, Simulación, Diploma

**Integraciones (6 archivos modificados):**
- `jobs_runner.py`: loop manual → `invoke_ova_generation()` con LangGraph checkpointing
- `jobs_helpers.py`: `_DEFAULT_PLAN` + `_PHASE_ORDER` extendidos a 5 fases
- `regen_agents.py`: dispatch a 5 fases + mappings name→id
- `jobs_materialize.py`: `_resolve_type` maneja 5 fases
- `requirements.txt`: + `langgraph>=0.6.0`, `langgraph-checkpoint-postgres>=2.0.0`

**Flujo:** `concierge → engage|explore|explain|elaborate|evaluate → validate → next/retry → assemble → END`

- `merge_commit: 9fa8211`

**Verificación:** verify.ps1 PASA (ESLint + ruff + 52 BDD unit).

**Estado:** DONE.

---

## 2026-06-16 — Completado lote de implementaciones y validaciones

**Agente:** leader (orquesta: implementer)
**Alcance:** Completar las especificaciones y características pendientes que estaban en estado spec_ready (principalmente Gherkin, Autenticación y métricas de rendimiento).

**Completado:**
- **EN-017** → done (ya implementado, commit 3ed88fa)
- **EN-001** → done (features Gherkin ya existentes por dominio en tests/features/)
- **EN-002** → done (step definitions y CI ya existentes en backend/tests/step_defs/ y verify.ps1)
- **HU-009** → done (Recuperación de contraseña, commit 1fc42f1)
- **HU-017** → done (Eliminar cuenta, commit a1de6dc)
- **RN-002** → done (Tiempo de generación ≤ 180s, validado por RN-004)

**Estado:** DONE. Lote finalizado con éxito.
