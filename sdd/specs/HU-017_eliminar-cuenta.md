# HU-017: Eliminar / dar de baja cuenta

> Metadata:

| Campo | Valor |
|---|---|
| ID | HU-017 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP2: Plataforma Web y Autenticación |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Media |
| Estimación | 3 SP |
| Dependencia | HU-008 |
| Responsable | — |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-06-16 |
| Fecha actualización | — |
| Fecha Fin (info) | — |

## Historia de Usuario

Como **usuario autenticado**, quiero eliminar o dar de baja mi cuenta desde
el perfil, para retirar mis datos del sistema cuando ya no use la plataforma.

## Contexto

El backlog define: botón en perfil → modal de confirmación → verificación de
identidad → eliminación/anonimización → cierre de sesión → redirección. El
sistema ya tiene perfil (HU-015), cambio de contraseña (HU-016) y gestión de
usuarios admin (HU-021). La eliminación será soft-delete (desactivación +
anonimización) para mantener integridad referencial con OVAs.

## Alcance

### Incluye
- Endpoint `DELETE /api/users/me` que desactiva la cuenta y anonimiza datos
  personales (nombre, email, teléfono, código UPAO).
- Verificación de contraseña actual en el body antes de proceder.
- Soft-delete: `is_active = false`, campos personales reemplazados por
  `[eliminado]` y sufijo UUID para unicidad.
- Los OVAs del usuario se mantienen en BD pero quedan huérfanos (sin owner
  activo); no se eliminan físicamente.
- Botón "Eliminar cuenta" en la sección de seguridad del perfil.
- Modal de confirmación con input de contraseña actual.
- Tras eliminación exitosa: invalidar JWT, cerrar sesión, redirigir al login.
- Toast de confirmación antes de la redirección.

### No incluye
- Eliminación física (hard delete) de datos.
- Período de gracia para reactivar la cuenta.
- Eliminación de OVAs asociados (quedan huérfanos).
- Que un admin elimine cuentas de otros (eso ya existe en HU-021 como
  desactivar).

## Dependencias

- **HU-008**: autenticación con JWT.
- **HU-015**: página de perfil donde se ubica el botón.

## Reglas de negocio

1. **R1** — La eliminación requiere verificación de contraseña actual (bcrypt
   check) en el body del request.
2. **R2** — La eliminación es soft-delete: `is_active = false`, email →
   `deleted_<uuid>@removed.local`, nombre → `[eliminado]`, teléfono → `null`,
   código UPAO → `null`.
3. **R3** — Los OVAs del usuario permanecen en la BD pero sin owner activo.
4. **R4** — Un administrador no puede eliminar su propia cuenta si es el único
   admin (prevención de lockout).
5. **R5** — Tras eliminación exitosa, el JWT actual se invalida y el usuario
   es redirigido al login.
6. **R6** — El endpoint retorna 200 si éxito, 400 si contraseña incorrecta,
   403 si es último admin.

## Criterios de aceptación

- Botón "Eliminar cuenta" visible en la sección de seguridad del perfil.
- Al hacer click aparece modal con campo de contraseña y botón de confirmación.
- Con contraseña correcta: cuenta desactivada, datos anonimizados, sesión
  cerrada, redirección al login. **(R1, R2, R5)**
- Con contraseña incorrecta: error 400 con mensaje descriptivo. **(R1)**
- OVAs del usuario no se eliminan. **(R3)**
- Si es último admin: error 403 con mensaje explicativo. **(R4)**
- `verify.ps1 -Quick` pasa.

## Escenarios BDD (Gherkin)

```gherkin
Feature: Eliminar cuenta de usuario (HU-017)

  Scenario: Eliminación exitosa con contraseña válida
    Given un usuario autenticado con contraseña "MiPass123"
    When envía DELETE /api/users/me con password "MiPass123"
    Then recibe 200
    And la cuenta queda desactivada y anonimizada
    And el JWT actual es inválido

  Scenario: Eliminación con contraseña incorrecta
    Given un usuario autenticado
    When envía DELETE /api/users/me con password incorrecto
    Then recibe 400 con mensaje "Contraseña incorrecta"
    And la cuenta permanece activa

  Scenario: Último administrador no puede eliminar su cuenta
    Given un administrador que es el único con rol "administrador"
    When envía DELETE /api/users/me con password correcto
    Then recibe 403 con mensaje de prevención de lockout

  Scenario: OVAs quedan huérfanos
    Given un usuario con 3 OVAs creados
    When elimina su cuenta exitosamente
    Then los 3 OVAs siguen existiendo en la BD
    And no tienen owner activo
```

## Notas de implementación

- Añadir endpoint en `backend/users/profile_router.py` o
  `backend/auth/router.py` — el que sea más coherente con la arquitectura.
- La anonimización debe ser atómica (una sola transacción).
- En frontend, añadir sección en `ProfilePage` con el botón y un `Dialog`
  de shadcn/Radix para el modal de confirmación.
- Usar `authService.logout()` existente tras la eliminación.
