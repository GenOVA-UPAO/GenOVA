# HU-001: Registro de Cuenta de Usuario

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | HU-001 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 8 SP |
| Dependencia | EN-008 |
| Responsable | JUAN DIEGO CARRANZA JACINTO |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-05-07 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-10 |

## Ruta de guardado
`specs/HU-001_registro-cuenta-usuario.md`

## Historia de usuario
Como estudiante del curso de ML de UPAO, quiero poder crear una cuenta nueva en la plataforma utilizando mi correo electrónico y una contraseña segura, para tener un perfil propio donde se guarden todos mis OVAs generados y pueda acceder desde cualquier dispositivo.

## Alcance
Incluye:
- Vista de registro dedicada en frontend (`/register`).
- Validación en tiempo real de email y contraseña.
- Endpoint de registro en backend (`POST /auth/register` y `POST /api/auth/register`).
- Almacenamiento de contraseña encriptada con bcrypt.
- Verificación de correo obligatoria: tras registrarse se envía un enlace y la
  cuenta no puede iniciar sesión hasta confirmarlo.
- Normalización del correo (minúsculas, sin `+tag`; en Gmail sin puntos) para
  evitar cuentas duplicadas.
- Inicialización de campos de perfil extendidos (`university_id`, `gender`, `phone_number`) como vacíos o nulos en la base de datos (no son obligatorios en este paso).

No incluye:
- Recuperación de contraseña.
- Autenticación social (OAuth).

## Criterios de aceptación
1. El formulario valida en tiempo real el formato del correo electrónico.
2. La contraseña exige mínimo 8 caracteres con combinación alfanumérica.
3. La contraseña se almacena encriptada con bcrypt (nunca en texto plano).
4. Se muestra un mensaje de error claro si el correo ya está registrado.
5. Los campos adicionales de perfil (ID Universitario, Sexo, Teléfono) quedan sin asignar (`null`) para que sean configurados posteriormente por el usuario en su perfil o por el administrador.
6. Tras el registro exitoso se muestra un aviso para verificar el correo; el usuario NO inicia sesión hasta confirmarlo.
7. El endpoint `POST /auth/register` retorna 201 (sin JWT, con `email_verification_required`) o 400 con mensaje de error descriptivo.
8. El correo se normaliza antes de comparar/guardar para evitar duplicados por alias (`+tag`) o puntos en Gmail.
9. El enlace de verificación (`POST /auth/verify-email`) es de un solo uso, expira en 24h y, al confirmarse, inicia sesión automáticamente. Existe reenvío (`POST /auth/resend-verification`).

## Datos de entrada/salida
Entradas:
- `email` (string, requerido, formato válido).
- `password` (string, requerido, mínimo 8, alfanumérica).
- `full_name` (string, opcional).

Salidas:
- 201: `{ email_verification_required: true, message }` (sin JWT; sesión solo tras verificar).
- 400: `{ error, message }`.

## Flujos alternativos
- Email inválido: el botón de envío permanece deshabilitado y se muestra mensaje inline.
- Password inválida: se muestra guía del criterio de contraseña.
- Email existente: backend retorna 400 y frontend muestra mensaje.

## Escenarios BDD (Gherkin)
```gherkin
Feature: Registro de cuenta de usuario
  Como estudiante
  Quiero registrarme con email y contraseña
  Para acceder a mi perfil y OVAs

  Scenario: Registro exitoso con credenciales válidas
    Given que estoy en la página de registro
    When ingreso un correo válido y una contraseña alfanumérica de mínimo 8 caracteres
    And envío el formulario
    Then el sistema debe crear la cuenta sin verificar
    And los campos university_id, gender y phone_number deben crearse como NULL
    And debo ver un aviso para verificar mi correo
    And no debo iniciar sesión hasta verificar el correo

  Scenario: Registro fallido por email duplicado
    Given que el correo "estudiante@upao.edu" ya está registrado
    When intento registrarme con ese correo
    Then debo ver un mensaje indicando que el correo ya existe
    And no debo ser redirigido al dashboard
```

## Mockup ASCII - Registro
```
┌─────────────────────────────────────────┐
│  GENOVA                                  │
			├─────────────────────────────────────────┤
│  Crear cuenta                            │
│                                         │
│  Correo                                 │
│  [ estudiante@upao.edu              ]   │
│  (validación en tiempo real)            │
│                                         │
│  Contraseña                             │
│  [ •••••••••••••••••                 ]  │
│  (mín. 8, alfanumérica)                 │
│                                         │
│  [ Crear cuenta ]                        │
│                                         │
│  ¿Ya tienes cuenta? Iniciar sesión       │
└─────────────────────────────────────────┘
```
