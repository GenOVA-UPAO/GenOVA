# Documentación GenOVA

Referencia profunda del proyecto. El [README raíz](../README.md) es el overview;
estos documentos cubren el detalle. La genera/actualiza el agente `doc_author`.

| Doc | Tema | Feature | Actualizado |
|---|---|---|---|
| [api.md](api.md) | Referencia REST completa (~70 endpoints) | — | 2026-07-15 |
| [database.md](database.md) | Esquema de BD (tablas, índices, pgvector, migraciones 001–034) | — | 2026-07-15 |
| [deployment.md](deployment.md) | Deploy cloud (Vercel/Render/Supabase) + env vars | — | 2026-09-07 |
| [runbook-despliegue-render.md](runbook-despliegue-render.md) | Runbook paso a paso: levantar backend en Render + repuntar Vercel (sin Redis/worker) | — | 2026-09-07 |
| [testing.md](testing.md) | Estrategia BDD (unit/backend/e2e) + CI | — | 2026-06-03 |
| [pruebas/](pruebas/README.md) | Documentación de pruebas: caja negra, funcionales, carga, BDD/E2E | — | 2026-07-14 |
| [fases-5e.md](fases-5e.md) | Catálogo de los 50 recursos 5E + plantillas de prompt por fase | EN-003, SP-002, SP-003 | 2026-07-15 |
| [generacion-5e.md](generacion-5e.md) | Flujo de generación 5E (jobs, planes, validación) | EP-5 | 2026-07-15 |
| [prometheus.md](prometheus.md) | Motor multi-agente Prometheus (work-pool + BDI) sobre LangGraph | EP-5 | 2026-07-15 |
| [arquitectura-equipo-editorial.md](arquitectura-equipo-editorial.md) | Equipo editorial pedagógico (Crítico + Repair + Editor 5E), implementado | EP-5, EN-015, EN-016 | 2026-07-15 |
| [workspace.md](workspace.md) | Workspace unificado crear/editar OVA | HU-025, HU-030, EN-013 | 2026-07-15 |
| [catalogo-modelos.md](catalogo-modelos.md) | Catálogo de modelos LLM (curado + APIs + enable/disable + asignación por tarea) | HU-034, HU-035 | 2026-07-15 |
| [matriz-trazabilidad.md](matriz-trazabilidad.md) | Matriz specs ↔ features ↔ estado (autogenerada, no editar a mano) | — | 2026-07-08 |
| [mejoras-infra-2026-06.md](mejoras-infra-2026-06.md) | Registro histórico: error boundaries, SSE, arq/Redis, Logfire, redacción PII | EN-018…022 | 2026-06-26 |
| [roadmap-futuro.md](roadmap-futuro.md) | Backlog especulativo de mejoras futuras | — | 2026-07-15 |

Carpetas auxiliares:

- [informe/](informe/) — material de trabajo del informe técnico (TDDR, charter, plantillas, bibliografía); no es documentación del sistema.
- [assets/](assets/) — capturas usadas por la documentación (p. ej. `caja-negra/`).
- [wireframes/](wireframes/) — wireframes HTML de diseño previos a implementación.
