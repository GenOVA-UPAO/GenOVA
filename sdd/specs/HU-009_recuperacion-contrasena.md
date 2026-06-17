# HU-009: Recuperación de contraseña

> Metadata:

| Campo | Valor |
|---|---|
| ID | HU-009 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP2: Plataforma Web y Autenticación |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Media |
| Estimación | 8 SP |
| Dependencia | HU-008 |
| Responsable | — |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-06-16 |
| Fecha actualización | — |
| Fecha Fin (info) | — |

## Historia de Usuario

Como **estudiante del curso de ML de UPAO**, quiero recuperar mi cuenta
mediante mi correo si olvido la contraseña, para no perder acceso a mis OVAs.

## Contexto

El backlog define un flujo: solicitar reset → recibir correo con enlace →
ingresar nueva contraseña con validaciones → confirmación visual → redirección
al login. El sistema ya tiene autenticación JWT (HU-008), bcrypt para hashing
(HU-001) y la tabla `password_reset_tokens` creada por EN-008.

## Alcance

### Incluye
- Endpoint `POST /auth/forgot-password` que genera un token UUID v4 con
  caducidad de 1 hora y lo almacena en `password_reset_tokens`.
- Endpoint `POST /auth/reset-password` que valida token, actualiza contraseña
  y marca el token como usado.
- Envío de email con enlace de reset vía SMTP configurable (variables de
  entorno `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`).
- Plantilla HTML básica para el correo con enlace directo al frontend.
- Página frontend `/recuperar-contrasena` con formulario de email.
- Página frontend `/reset-password?token=...` con formulario de nueva contraseña.
- Validaciones de nueva contraseña iguales a las de registro (mín 8, alfanumérica).
- Fallback: si SMTP no está configurado, el endpoint retorna 200 igual (no revela
  si el email existe) y loggea el enlace en consola (dev-friendly).

### No incluye
- Recuperación por WhatsApp (eso es funcionalidad admin en HU-021).
- Rate limiting avanzado (puede añadirse después).
- Verificación de email al registrarse.

## Dependencias

- **HU-008**: autenticación con JWT y login.
- **EN-008**: tabla `password_reset_tokens` ya creada.

## Reglas de negocio

1. **R1** — El endpoint `POST /auth/forgot-password` siempre retorna 200 con
   mensaje genérico, incluso si el email no existe (prevención de enumeración).
2. **R2** — El token es UUID v4, de un solo uso, almacenado en BD con
   `expires_at = now() + 1 hora`.
3. **R3** — `POST /auth/reset-password` valida: token existe, no usado, no
   expirado. Si inválido → 400 con mensaje genérico.
4. **R4** — La nueva contraseña cumple los requisitos de registro: mínimo 8
   caracteres, combinación alfanumérica.
5. **R5** — Tras reset exitoso, el token se marca como usado (no reutilizable).
6. **R6** — La nueva contraseña se hashea con bcrypt antes de almacenar.
7. **R7** — Si SMTP no está configurado (variables vacías), se loggea el enlace
   de reset en consola y no se envía email. El endpoint retorna 200 igual.

## Criterios de aceptación

- `POST /auth/forgot-password` con email existente genera token y envía email
  (o loggea enlace si no hay SMTP). **(R1, R2, R7)**
- `POST /auth/forgot-password` con email inexistente retorna 200 sin error
  visible. **(R1)**
- `POST /auth/reset-password` con token válido actualiza la contraseña y marca
  token como usado. **(R3, R5, R6)**
- `POST /auth/reset-password` con token expirado o ya usado retorna 400. **(R3)**
- La nueva contraseña cumple validaciones de registro. **(R4)**
- Página `/recuperar-contrasena` permite ingresar email y muestra confirmación.
- Página `/reset-password?token=...` permite ingresar nueva contraseña con
  confirmación y redirige al login tras éxito.
- `verify.ps1 -Quick` pasa.

## Escenarios BDD (Gherkin)

```gherkin
Feature: Recuperación de contraseña (HU-009)

  Scenario: Solicitud de reset con email válido
    Given un usuario registrado con email "test@upao.edu.pe"
    When envía POST /auth/forgot-password con ese email
    Then recibe 200 con mensaje genérico
    And se genera un token de reset con caducidad de 1 hora

  Scenario: Solicitud de reset con email inexistente
    Given no existe usuario con email "noexiste@upao.edu.pe"
    When envía POST /auth/forgot-password con ese email
    Then recibe 200 con mensaje genérico
    And no se genera ningún token

  Scenario: Reset exitoso con token válido
    Given un token de reset válido y no expirado
    When envía POST /auth/reset-password con el token y nueva contraseña "NuevaPass123"
    Then recibe 200
    And la contraseña del usuario se actualiza
    And el token queda marcado como usado

  Scenario: Reset con token expirado
    Given un token de reset expirado
    When envía POST /auth/reset-password con ese token
    Then recibe 400 con error descriptivo

  Scenario: Reset con contraseña débil
    Given un token de reset válido
    When envía POST /auth/reset-password con contraseña "123"
    Then recibe 400 con error de validación de contraseña
```

## Notas de implementación

- Reutilizar `backend/auth/` para los endpoints (misma arquitectura que login/register).
- El modelo `PasswordResetToken` ya debería existir en `backend/users/models.py`
  o `backend/auth/models.py` — verificar.
- Para el envío de email, crear `backend/auth/email.py` con función
  `send_reset_email(to, token, base_url)` que usa `smtplib` o similar.
- En frontend, crear `frontend/src/pages/ForgotPasswordPage.jsx` y
  `frontend/src/pages/ResetPasswordPage.jsx`.
- Añadir rutas públicas (sin auth) en el router de React.
