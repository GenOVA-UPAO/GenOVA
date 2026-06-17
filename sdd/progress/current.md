# Sesión actual

Feature en curso: EN-017 — Panel de Nodos/Agentes Prometheus + Nodo Video + Nodo Imágenes

Estado: IMPLEMENTADO — verify.ps1 -Quick PASA, 49 backend tests PASAN, 63 frontend unit tests PASAN.
Refactor post-advisor: nodesConfigDraft.js helpers importados en PlatformNodesCard + PhaseSelectModal; spec stub creado en sdd/specs/EN-017_panel-nodos-prometheus.md.

Pendiente: revisión por reviewer, marcar done en feature_list.json.

Ver detalles en: sdd/progress/impl_panel-nodos-prometheus.md

---

Solicitud nueva: rediseño frontend basado en wireframes.

Estado: SPECS GENERADAS — RN-006, HU-035 y HU-036 creadas en `sdd/specs/` y registradas como `spec_ready` en `feature_list.json`.

Pendiente: aprobación humana de specs antes de implementar. EN-017 sigue `in_progress`, por lo que la implementación del rediseño no debe mezclarse hasta cerrar o pausar explícitamente esa feature.

RN-006 aprobado e implementado parcialmente como primera fase del lote:
- Shell autenticado rediseñado con header compacto, sidebar seccionado, drawer móvil y menú de usuario.
- Dashboard rediseñado con métricas y OVAs recientes usando endpoints existentes.
- Ajustes visuales suaves en Mis OVAs, Papelera, Perfil, Admin Roles, Admin Usuarios, Admin Plataforma y WorkspaceLayout.
- Validación: `pnpm --filter frontend lint` PASA, `pnpm --filter frontend build` PASA, `pnpm test:unit` PASA, `./verify.ps1` PASA (backend BDD skip por backend offline).

Pendiente RN-006: revisión humana/commit antes de avanzar a HU-035 para no mezclar diffs de features.

RN-006 commit: `c807892` — `feat(frontend): unify app shell visual design`.

HU-035 aprobado e implementado:
- Rutas reales `/modelos` y `/fallback` agregadas al router protegido.
- Sidebar ahora incluye seccion Configuracion con Modelos y Fallback.
- `/modelos` reutiliza `LlmSettingsCard`, catalogo, API keys y asignacion por tarea.
- `/fallback` reutiliza `useAdminLlmConfig`, `LlmTaskRow` y `llmConfigDraft`; admin edita fallback global, usuario no admin ve estado informativo.
- Perfil queda centrado en datos/API keys/imagenes y enlaza hacia `/modelos`.
- Validacion: `pnpm --filter frontend lint` PASA, `pnpm --filter frontend build` PASA, `./verify.ps1` PASA (backend BDD skip por backend offline).

Pendiente HU-035: commit separado antes de iniciar HU-036.

---

Lote specs overdue Sprint 1 (sesión Antigravity):

Estado: SPECS GENERADAS y APROBADAS — HU-009, HU-017, EN-001, EN-002 creadas en `sdd/specs/` y registradas como `spec_ready` en `feature_list.json`.

TA-001 y TA-002 formalizados y cerrados como `done` (ya implementados de facto).

Auditoría completa de Sprint 1 y Sprint 2: 36 done, 2 in_progress (EN-017, HU-036), 4 spec_ready (HU-009, HU-017, EN-001, EN-002), 1 spec_ready Sprint 2 (RN-002).

Pendiente: implementación en lote de specs aprobadas.
