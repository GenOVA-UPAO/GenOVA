# Plan-ledger — Remediación auditoría visual E2E (2026-07-16)

**Fuente**: `sdd/audits/2026-07-16-auditoria-visual-e2e.md` (auditoría del mismo día).
**Alcance aprobado**: dark mode completo · generalizar copys "ML" · incluir 2 fixes backend.
**Plan detallado**: aprobado en sesión (diagnósticos archivo:línea incluidos).

## Tabla de tareas

| ID | Tarea | Sev. origen | Modelo | Depende de | Estado |
|---|---|---|---|---|---|
| T1 | Menú de usuario: ARIA + entradas + Escape (DB-06 re-diagnosticado como falso positivo del harness — el menú siempre funcionó) | ALTA→media | sonnet | — | done |
| T2 | Responsive /mis-ovas y cards (grid-cols-1, flex-wrap) | ALTA (MO-01) | sonnet | — | done |
| T3 | Workspace mobile en blanco (cadena de altura :host) | ALTA (WS-01) | sonnet | — | done |
| T4 | Modales /crear coherentes (Escape, signals, stack) | media (CR-02) | sonnet | — | done |
| T5 | Enter envía el login | media (LG-02) | — | — | **cancelada**: falso positivo del harness (el pane no entrega keydown reales; instrumentación demostró 0 keydown en la página). El form es correcto estáticamente. |
| T6 | Labels recursos + iconos Phosphor + stall UI | media (GN-01/02/03, WS-02, CR-01) | sonnet | — | done |
| T7 | Backend: sweep zombis (queued + listado) + logging UTF-8 worker | media (GN-03/05) | sonnet | — | done |
| T8 | Dark mode completo (service + toggle + init) | media (G-01) | sonnet | T1 | done |
| T9 | Batch a11y + guards + estados + quitar view transitions | media (DB-07, MD-01, EX-01, PF-01/02, AN-01, RP-01, NF-01, G-02) | sonnet | — | done |
| T10 | Copys, ortografía, card register, des-ML | baja (varias) | haiku | — | done |

## Olas

1. **Ola 1** (paralelo): T2, T3, T4, T7, T10
2. **Ola 2** (paralelo): T1, T5, T6, T9
3. **Ola 3**: T8 (tras T1)

## Protocolo

- Cada subagente escribe evidencia/decisiones en `sdd/plans/2026-07-16-remediacion-auditoria-visual/tasks/T<n>.md` antes de terminar y devuelve receipt de una línea (`done -> …` / `blocked -> …`).
- Verificación runtime en browser la hace el hilo principal (los subagentes no tienen browser pane).
- `./verify.ps1` completo al cierre de cada ola; commit solo con aprobación explícita.

## Cierre (2026-07-16)

- 9/10 tareas done; T5 cancelada (falso positivo del harness de browser: el pane no
  entrega keydown reales a la página — instrumentación mostró 0 keydown; el form de
  login es correcto). DB-06 también resultó falso positivo (mismo harness): el menú
  siempre abrió; T1 se redujo a ARIA + entradas (Vinculación/Analítica por permiso) +
  cierre con Escape.
- Verificación runtime (browser, 375px y 1280px): menú+logout E2E, /mis-ovas y
  workspace sin overflow y con contenido, modales con Escape/stack/exclusión mutua,
  sweep sanando zombis al listar (página 1: 0 "Generando"; dashboard "En Progreso 0"),
  dark mode aplicando `.dark` por prefers-color-scheme y toggle ciclando+persistiendo.
- `verify.ps1` completo PASA; backend BDD 51/51 manual (el health check del script
  coincidió con un reload de uvicorn). Fix extra de paso: `test_registro_exitoso`
  rojo pre-existente — el BDD asumía verificación de correo activa y el default de
  settings es False; el test ahora fija `EMAIL_VERIFICATION_ENABLED=1`.

## Fuera de alcance (consciente)

MO-03 (paginación con salto), DB-03 (botón Crear OVA duplicado), CR-05 (fases 5E en inglés), MD-03 (heading /models en card). Limpieza de datos zombis en DB la efectúa el sweep de T7.
