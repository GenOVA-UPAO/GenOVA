# Sesión actual

> Este archivo se vacía al cerrar cada sesión y su contenido se mueve a `history.md`.
> Mantenlo actualizado en tiempo real mientras trabajas, no al final.

## 2026-06-07 — Unificar crear+editar OVA en un solo workspace + arreglar generación/SCORM

**Agente:** leader (inline) + spec-sync (chip, HU-011/HU-013)
**Alcance:** finalizar HU-025 (superficie única crear+editar) + corregir generación EXPLORE y habilitación de SCORM.

### Unificación crear+editar (frontend)
- `OvaWorkspacePage` ahora es un shell: `ovaId` → `OvaEditView`, sin id → `OvaCreationView`. `/crear-ova` y `/ova/:id/workspace` renderizan el mismo componente → transición create→edit **en sitio** (sin página aparte).
- Nuevos: `components/workspace/OvaCreationView.jsx`, `OvaEditView.jsx`.
- `useOvaWorkspace`: fix bug poll (`'success'` no `'done'` → ya no poll infinito tras regen); `regenProgress` (stage+%), `regenAll` (regenerar OVA completo desde prompt original), `toggleSelectAll`; estado `generating` + auto-poll cuando el OVA aún se genera (handoff 409 → ya no error seco).
- `WorkspaceChatPanel`: barra de progreso de regen, botón "Regenerar OVA completo", "Seleccionar todas".
- Borrado legacy huérfano: `CrearOvaPage`, `EditarOvaPage`, `PhaseCard`, `VersionHistory`, `useRegenEditor`, `useRegenConfirmModal` (rescatadas sus funciones útiles). `ConfirmModal` conservado (PapeleraPage).
- `backend/ova/duplicate_router.py`: `edit_url` → `/ova/{id}/workspace` (ruta `/editar` eliminada).
- Specs/features actualizados por spec-sync: HU-003, HU-011 (SUPERSEDED), HU-013.

### Generación EXPLORE + SCORM (backend)
- `agents/llm_router.py`: task `codigo` usaba `deepseek/deepseek-v4-flash:free` (ID **inexistente** → 404); corregido a `deepseek/deepseek-v4-flash` (válido). Timeout por-llamada 30→120s (`LLM_TIMEOUT_S`). Timeouts/desconexiones ahora recuperables (avanzan la cadena de fallback).
- `ova/jobs_runner.py`: budget por-recurso desacoplado del timeout por-llamada → `RESOURCE_TIMEOUT_S=240` (env), `MAX_ATTEMPTS` env.
- `ova/jobs_materialize.py`: si **todos** los recursos del job están `done` → OVA `listo` (antes siempre `borrador` → SCORM nunca se habilitaba); parcial (HU-022) sigue `borrador`.
- `tests/step_defs/test_jobs_steps.py`: scenario 10 (fallo total) alineado al comportamiento HU-023 (placeholder OVA marcado `error`, nada materializado).

### Validación en vivo (backend+frontend reales)
- Crear OVA → genera engage+explore → transición en sitio → estado "Generando" + auto-poll → carga workspace completo. OVA final `listo`, **SCORM habilitado**. Preview renderiza micro-podcast (audio+transcripción).

### Verificación
- FE: ESLint ✓ · unit BDD 52/52 ✓ · build ✓
- BE: ruff ✓ · jobs BDD 14/14 ✓

**Estado:** completo. Pendiente: commit (2) + cierre.
