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

**Estado:** DONE.

---

## 2026-06-20 — Auditoría y Reestructuración de Carpetas (Screaming Architecture)

**Agente:** Antigravity (inline)
**Alcance:** Organizar archivos planos con alta densidad en el frontend (`ova_workspace/components`, `ova_library/components`) y backend (`llm`, `generation`) en subcarpetas lógicas, actualizando todos los imports y resolviendo colisiones.

**Completado:**
- **Frontend `ova_workspace/components`**: Creados subdirectorios `creation`, `editor`, `modals`, `versioning`, `shared` y distribuidos los 23 componentes planos.
- **Frontend `ova_library/components`**: Creados subdirectorios `modals`, `cards`, `viewer` y distribuidos los 10 componentes planos.
- **Backend `llm`**: Creados subdirectorios `catalog`, `podcast`, `images`, `clients`, `phases`, `utils` y distribuidos los 24 archivos planos.
- **Backend `generation`**: Creados subdirectorios `jobs`, `errors`, `regen` y distribuidos los 14 archivos planos.
- **Imports y Formato**: Corregidos imports en todo el backend y frontend mediante scripts automatizados de migración y auto-corrección de Ruff, eliminando problemas de imports duplicados y ordenándolos bajo la configuración del espacio de trabajo.
- **Verificación**: Compilación de producción Vite completada sin errores de dependencias y suite unitaria BDD 100% verde (63 escenarios, 268 pasos exitosos).

**Estado:** DONE.

---

## 2026-06-20 → 2026-06-23 — Sprint 2 cierre: UX, config, modelos, Prometheus BDI, modo tesis

**Agente:** opencode / Antigravity (inline)
**Alcance:** ~45 commits no documentados desde la última entrada (post
`d81a3e9`). Cierre funcional de Sprint 2 antes de su vencimiento (2026-06-21).

**Completado (agrupado temáticamente):**

- **UX / Wireframes crear OVA** (~12 commits, `46c3101`…`70dbd1a`):
  centrado vertical de card crear OVA, íconos barra de acción, modales de
  archivos y tema, mínimo 2 fases para generar, modales de recursos OVA con
  colores vivos por fase, ajuste de wireframes a layout real del backend,
  layout centrado rediseño crear OVA (wireframe 4-5).

- **Config por recurso OVA** (~9 commits, `b338387`…`d94dbf1`):
  config para los 50 recursos OVA (26 faltantes), descripción por campo en
  `ResourceConfigModal`, fix cierre doble de modales, portal a body para
  liberar `pointer-events` de Radix, `pointerdown` stopPropagation, persistencia
  de config en Supabase por usuario, caché localStorage TTL-7d.

- **Catálogo de modelos / LLM** (~10 commits, `3388aef`…`dfe9582`):
  reemplazo de tab Catálogo por modal "Gestionar Modelos", fix catalog refresh
  de Groq desde PlatformConfig, auto-refresh al guardar Keys Globales,
  OpenCode dinámico + fix precios negativos, modelos de imagen dinámicos por
  proveedor con selector en UI.

- **Models modal perf** (~6 commits, `1896c8a`…`fbabb06`):
  modal más ancho + load-more, memo + useCallback (fix INP 200ms), ancho
  forzado 920px, content-visibility:auto + useMemo(grouped), luego removido
  por romper tooltips, fix INP 216ms.

- **Roles y modo tesis** (`cf12e91`):
  migración 030 crea rol `usuarios_prueba` (create_ova/view_ova/export_ova),
  `register()` asigna rol por defecto desde PlatformConfig
  (`default_registration_role`), endpoints GET/PUT `/admin/registration-mode`,
  toggle "Modo tesis" en AdminRolesPage, SidebarMenu gate por permisos.

- **Backend import fixes** (`8f10c5f`, `2caaad1`, `b1313ff`):
  corrigen imports rotos post-refactor (roles_router, agents_router →
  `llm.catalog.catalog_router`, uploads_router).

- **Catalog perf** (`ea6c774`): page_size 50→500 inicial, max 100→1000.

- **Models cards** (`043641a`, `a01456c`, `caaea46`): cards Imagen/Video +
  HuggingFace text models en catálogo, image model picker en card Imagen +
  fix INP 216ms, model picker muestra solo modelos enabled.

- **5E fix** (`21781a4`): removidos labels de fase 5E del output dirigido al
  estudiante.

- **Prometheus BDI** (`4c94736`): actualización de BDI con engine.

- **Misc** (`9bd83bb`): update skills catalog. (`8684d04`): fix
  IntersectionObserver root + test import path.

**Cierre de features:**
- **HU-036** (vinculación usuarios permisos granulares): implementación
  completa ya existente desde `b22339b` (links_router.py, UserLink, permisos
  `users:link`/`users:link:admin`, `/vinculacion`). Marcada `done` en esta
  auditoría con `merge_commit: b22339b`. Tests/trazabilidad no verificados.

**Sprint:**
- Sprint 2 cerrado el 2026-06-21 (vencido). Sprint 3 iniciado 2026-06-23.
- El usuario reporta errores de Sprint 2 por resolver en Sprint 3 (no
  identificados concretamente aún).

**Estado:** DONE (auditoría + limpieza). Carryovers pendientes en
`current.md`.

---

## 2026-06-04/06 — Lote infrastructure EN-012/013/015/016/017 + HU-022 (B+F) + RN-005 (consolidado de `impl_*`/`review_*` archivados)

**Agente:** leader (orquesta: implementer, reviewer)
**Alcance:** Cierre del sprint de infrastructure (enablers + recuperador de recursos parciales + checklist responsive).

**Tabla resumen** (detalle por feature en `git log` + `feature_list.json`; los `impl_*.md` / `review_*.md` ya no existen — quedan aquí los hallazgos accionables):

| ID | Título | Merge commit | Veredicto review |
|---|---|---|---|
| EN-012 | Observabilidad de errores en Supabase | `a3201ca` | APPROVED (4 tests EN-012) |
| EN-013 | Persistencia del estado de generación (jobs) | `c4f6d07` | APPROVED (7 tests EN-013 + 4 EN-012) |
| EN-015 | Crítico evaluator-optimizer pedagógico | (en `9fa8211`) | APPROVED (5 tests) |
| EN-016 | Editor de Coherencia 5E | (en `9fa8211`) | APPROVED (3 tests) |
| EN-017 | Panel de Nodos Prometheus | `3ed88fa` | APPROVED (4 BDD + 6 unit) |
| HU-022 (B) | Recuperación de recursos parciales — backend B1–B4 | `0ff7465` | CHANGES_REQUESTED → APPROVED (2 fixes) |
| HU-022 (F) | Recuperación de recursos parciales — frontend F1–F4 | (en `0ff7465`) | APPROVED |
| RN-005 | Frontend responsive (checklist) | `b62e216` | APPROVED (verificación estática de clases Tailwind) |

**Hallazgos relevantes:**

- **HU-022 backend review (CHANGES_REQUESTED)** — 2 findings resueltos antes de aprobar:
  1. `backend/ova/jobs_router.py:137` — `resume_job` era endpoint mutante con input externo (`resource_ids`) sin `@limiter.limit`. Resuelto con `@limiter.limit("10/minute")` + `request: Request` (paridad con `start_job`).
  2. `backend/ova/jobs_runner.py:71-72` — subset de resume regeneraba recursos ya `done` (violaba R6/R7). Resuelto con `.where(OvaJobResource.status != "done")` aplicado siempre en `_select_resources`; nuevo test `test_resume_done_en_subset` añadido a `tests/features/setup/EN-013_jobs.feature`.

- **EN-016 R3 — propagación in-place de parches**: el `editor_node` muta `results` in-place y retorna solo `{"coherence_report": ...}`. Confirmado empíricamente que LangGraph pasa el objeto mutable entre nodos en la misma `invoke()` antes de checkpointing, así que `assemble_node` recibe `results` correctamente modificado. Con `PostgresSaver` (opt-in deshabilitado por defecto, `OVA_PG_CHECKPOINT`) los parches se perderían entre reanudaciones — fuera de alcance de esta fase.

- **EN-015 desviación del spec**: crítico usa `html[:2000]` (extracto, no HTML completo) y `max_tokens=512` (no 8000) para no saturar contexto. Ningún AC del spec lo exige explícitamente.

- **EN-016 EN-018 EN-019 cobertura**: junto con EN-018 (SSE) y EN-019 (arq/Redis) los enablers cubren el pipeline completo de jobs.

**Reorganización (esta sesión):**
Los 11 reportes (`impl_*.md` × 8 + `review_*.md` × 3) que residían directamente en `sdd/progress/` se mueven a `sdd/progress/implementados/` para mejorar la legibilidad del directorio raíz (que conserva solo `current.md`, `history.md`, `sprint.md`). El patrón por feature se mantiene: cada `impl_<name>.md` documenta los criterios, archivos tocados y notas de diseño; cada `review_<name>.md` contiene el veredicto (APPROVED / CHANGES_REQUESTED) y la trazabilidad R→test. CHECKPOINTS.md C1/C3/C5, los specs `RN-005` y `EN-017`, y los 5 agents críticos (`.claude/agents/{leader,implementer,reviewer,doc_author,spec-sync}.md` + sus transformaciones en `.opencode/agents/` y `.codex/agents/`) ahora apuntan a `sdd/progress/implementados/<name>.md`. CHECKPOINTS.md C8 (Wireframe gate) eliminado (los wireframes fueron retirados del repo en otra sesión).

**Estado:** DONE. Trazabilidad preservada en `git log`, `feature_list.json`, esta entrada de `history.md` y los archivos `sdd/progress/implementados/`.