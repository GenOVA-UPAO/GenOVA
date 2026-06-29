# Sesión actual

**Fecha:** 2026-06-29
**Agente:** opencode (implementer)
**Sprint:** 3

## Resumen
Implementación de BU-002 — Sesión activa cambia de rol o cuenta al navegar.

## Hecho en esta sesión
- Feature en curso: BU-002 — cuenta_rol_cambia_navegacion
- Plan: migración 034 (user_roles.is_primary) + resolver rol primario en /api/auth/me + seed idempotente + consumir useCurrentUser() en Navbar/SidebarMenu/DashboardPage/AdminRoute + clearLocalCache en markLoggedIn + 6 escenarios BDD unit.

## Próximo paso
Revisar y ejecutar verify.ps1 -Quick tras implementar.