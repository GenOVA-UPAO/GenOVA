# Sesión actual

> Este archivo se vacía al cerrar cada sesión y su contenido se mueve a `history.md`.
> Mantenlo actualizado en tiempo real mientras trabajas, no al final.

## Lote EP-3 — Workspace + spec_ready features (iniciado 2026-06-06)

- **Puerta humana**: aprobada (batch mode, una puerta única al inicio).
- **Plan**: `C:\Users\JeffryRU\.claude\plans\ya-est-instalado-revisa-idempotent-wren.md`
- **Orden**: HU-024 → HU-023 → HU-025 → HU-030 → HU-033 → HU-026 → HU-028 → HU-027 → HU-029 → HU-032 → HU-031 → RN-005

### Progreso del lote

| # | Feature | SP | Estado |
|---|---|---|---|
| 1 | HU-024 — Archivos chat-style | 3 | ⏳ en curso |
| 2 | HU-023 — Background + resume | 13 | pendiente |
| 3 | HU-025 — Workspace split panel | 13 | pendiente |
| 4 | HU-030 — Mis OVAs → workspace | 3 | pendiente |
| 5 | HU-033 — Reordenar recursos | 5 | pendiente |
| 6 | HU-026 — Click-to-edit | 8 | pendiente |
| 7 | HU-028 — Versionado OVA | 8 | pendiente |
| 8 | HU-027 — Selección recursos contexto | 5 | pendiente |
| 9 | HU-029 — Micro-versionado recurso | 5 | pendiente |
| 10 | HU-032 — Añadir recurso | 5 | pendiente |
| 11 | HU-031 — Edición granular | 8 | pendiente |
| 12 | RN-005 — Responsive checklist | — | pendiente |

### HU-024 — Archivos chat-style (3 SP)

- **Spec**: `sdd/specs/HU-024_archivos-contextuales-chat.md`
- **Scope**: PromptPanel ya tiene ícono + FileChip + drag-drop. Solo: quitar texto "RAG:" (R3), fix title del botón.
- **Archivos**: `frontend/src/components/crear/PromptPanel.jsx`
