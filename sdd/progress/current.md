# Sesión actual

**Fecha:** 2026-06-23
**Agente:** opencode (leader)
**Sprint:** 3 (iniciado 2026-06-23)

## Resumen

Sesión de auditoría y limpieza del repositorio. verify.ps1 PASA (lint + 63 BDD
unit). Working tree limpio en `develop`.

## Hecho en esta sesión

- **feature_list.json**: eliminados 12 IDs duplicados (EN-001…EN-012 aparecían
  dos veces). Bloque duplicado (líneas 72-82) removido; se conservó el bloque
  completo que incluye EN-013, EN-015, EN-016, EN-017.
- **HU-036** (vinculación usuarios permisos granulares): marcada `done` con
  `merge_commit: b22339b`. Estaba `in_progress` pero el código está completo
  — `backend/users/settings/links_router.py`, modelo `UserLink`, permisos
  `users:link` / `users:link:admin`, frontend `UserLinksPage.jsx` con ruta
  `/vinculacion`. Tests/trazabilidad no verificados en esta sesión.
- **sprint.md**: cerrado Sprint 2 (fin 2026-06-21), iniciado Sprint 3
  (2026-06-23 → 2026-07-20).
- **history.md**: añadida entrada 2026-06-20→23 documentando ~45 commits no
  registrados desde la última entrada (2026-06-20).
- **Backend BDD CI roto arreglado** (23 tests → 0 fallos):
  - `test_auth_steps.py`: DDL SQLite faltaba `resource_configs`,
    `platform_config`, `roles`, `user_roles` (refactors de modo tesis no
    actualizados en tests).
  - `test_jobs_steps.py`: `from prometheus import graph` →
    `prometheus.engine.graph` (refactor Prometheus).
  - `test_db_api_keys_steps.py`: `patch("database.SessionLocal")` →
    `core.database.SessionLocal`; `llm.router._get_provider_key` →
    `llm.clients.clients._get_provider_key` (refactor LLM clients).
  - `test_nodes_config_steps.py`: import `platform_settings_router` →
    `nodes_config_router` (split de routers en commit cf12e91).
  - `test_ova_critic_steps.py`: stub `_dispatch` con 6 params → 7 params
    (runtime pasó a pasar `per_config` como 7º arg).
  - Suite completa: 64 passed, 0 failed. verify.ps1 -Quick PASA.

## Carryovers de Sprint 2 por resolver

El usuario indica que hay errores hechos en Sprint 2 que deben resolverse en
Sprint 3. Pendiente de identificar con el usuario cuáles son. Candidatos
detectados en la auditoría:

- **main está 106 commits detrás de develop**: hace falta merge/PR a main
  (solo 4 merge commits adelante).
- **3 PRs de dependabot abiertos sin atender** (#76 actions/checkout 6→7,
  #77 npm group 5 updates, #78 python group 3 updates). Requieren verificación
  de CI antes de fusionar.
- **HU-036 sin tests/trazabilidad verificada**: la implementación existe pero
  no se verificó el mapa R<n> → test ni si hay BDD scenarios para
  vinculacion. Posible backlog de spec-sync.
- **Rama local stale `feat/wireframe-navbar-redesign`**: último commit
  2026-06-16, ya mergeada vía PR #75 (commit 2e4ea66). Candidata a eliminar.
- **15 items `pending` sin spec ni progreso**: EP-1…EP-10, HU-005 (SUS),
  EN-007 (Canvas), TA-003/004/005, SP-008, DO-001/002/003, RN-001 (latencia
  ≤278ms). Decidir cuáles entran a Sprint 3.

## Próximo paso

Esperar que el humano identifique los "errores de Sprint 2" concretos a
resolver, o confirmar si los candidatos listados arriba son el scope.
