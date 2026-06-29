# Sesión actual

**Fecha:** 2026-06-29
**Agente:** opencode (implementer — re-aplicado por hallazgos del reviewer)
**Sprint:** 3
**Feature:** BU-001 — Sesión expirada no redirige a pantalla de inicio de sesión

## Resumen

Re-aplicación tras CHANGES_REQUESTED del reviewer. Cierra los 4 hallazgos:

- #1 (ALTA) LoginPage ahora consume `consumeSessionExpiredFlag` y muestra
  toast.info (sonner). El flag ya no es código muerto.
- #2 (MEDIA) Nuevo escenario BDD que verifica el contrato end-to-end de la
  flag (AuthGate → sessionStorage → LoginPage) + import estático de
  `consumeSessionExpiredFlag` en LoginPage.
- #3 (MEDIA) Doble `<AuthGate>` eliminado. AppLayout ya no envuelve en
  AuthGate; gating centralizado en `ProtectedLayout` y `FullBleedProtectedLayout`
  en App.tsx. Rutas `fullBleed` siguen cubiertas.
- #4 (BAJA) Plan de split de `SidebarMenu.tsx` documentado en
  `impl_BU-001_sesion-expirada.md` § Pendientes.

## Archivos EDIT (re-aplicación)

- `frontend/src/features/auth/pages/LoginPage.tsx` (187→198) — consume flag + toast.
- `frontend/src/core/layouts/shells/AppLayout.tsx` (31→31) — AuthGate removido.
- `frontend/src/App.tsx` (174→182) — `FullBleedProtectedLayout` añadido; rutas fullBleed reagrupadas.
- `tests/features/auth/BU-001_sesion-expirada.feature` (30→40) — nuevo escenario end-to-end.
- `tests/steps/unit/sesion_expirada_unit.steps.js` (122→215) — stepdefs del nuevo escenario.
- `sdd/progress/implementados/impl_BU-001_sesion-expirada.md` — sección "Pendientes / Trabajo futuro".

## Pendiente (BU-002)

Sin cambios respecto a sesión anterior.