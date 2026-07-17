# Sesión actual

**Fecha:** 2026-07-16
**Agente:** leader (Claude Code)
**Sprint:** 2

## Resumen

Auditoría visual E2E del despliegue local (16 interfaces, 3 viewports, generación real)
y remediación completa el mismo día vía plan-ledger con subagentes.

## Hecho

- **Auditoría**: `sdd/audits/2026-07-16-auditoria-visual-e2e.md` — 3 ALTA + ~10 media + bajas.
- **Remediación** (`sdd/plans/2026-07-16-remediacion-auditoria-visual.md`, 9/10 done, task-files T1-T10):
  - MO-01: grid `grid-cols-1` + acciones en grid 2-col en cards (mis-ovas/papelera responsive).
  - WS-01: cadena de altura `:host flex` en workspace-page/edit-view/creation-view + fix
    `class=` vs `className=` del iframe de preview (default 150px).
  - CR-02: modales /crear unificados sobre gn-dialog + `ModalStackService` (Escape solo
    cierra el superior; signals en vez de booleanos planos; exclusión mutua).
  - GN-01/02, WS-02: labels de recursos humanizados (nunca "Recurso N"), iconos Phosphor
    en vez de emojis, tabs de fase desambiguados ("Fase — Tipo (2)").
  - GN-03: stall UI en frontend + backend sweep extendido — `queued` estancado (900s) y
    barrido en `list_ovas` (zombis sanan al listar; verificado en vivo: 105→0 "Generando").
  - GN-05: worker con stdout/stderr UTF-8 (UnicodeEncodeError cp1252 enmascaraba errores).
  - G-01: dark mode completo — `ThemeService` (light/dark/system + localStorage +
    prefers-color-scheme), init temprano, toggle cíclico en menú de usuario.
  - T9: batch a11y (accnames sidebar/models/checkboxes/radios, botón anidado eliminado),
    profile tabs scrolleables + tab Configuración oculto sin permiso, toast en /analytics,
    reset-password sin token muestra panel de enlace inválido, 404 serif, view transitions
    retiradas (InvalidStateError).
  - T10: acentos, des-ML (badge, copys), card register alineado, placeholder.
- **Falsos positivos del harness de browser**: DB-06 (menú usuario) y LG-02 (Enter en login)
  — el pane no entregaba clicks/keydown reales; documentado en audit + ledger.
- **Fix de paso**: `test_registro_exitoso` rojo pre-existente — el BDD ahora fija
  `EMAIL_VERIFICATION_ENABLED=1` (default de settings es False).
- **Verificación**: verify.ps1 completo PASA; backend BDD 51/51; frontend 95/95;
  runtime browser: menú+logout E2E, responsive 375px, modales, sweep, dark mode.

## Próximo paso

- Commit pendiente de aprobación del humano (propuesto en chat).
- Backlog consciente: MO-03 (paginación), DB-03 (botón duplicado), CR-05 (fases 5E en
  inglés), MD-03 (heading /models), y 409 de `POST /jobs/{id}/resume` con job `running`
  (limitación anotada en T6).
