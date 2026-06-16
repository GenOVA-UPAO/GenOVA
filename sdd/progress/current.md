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
