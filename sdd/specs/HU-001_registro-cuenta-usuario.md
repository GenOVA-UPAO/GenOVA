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
- Redirección al dashboard tras registro exitoso.
- Inicialización de campos de perfil extendidos (`university_id`, `gender`, `phone_number`) como vacíos o nulos en la base de datos (no son obligatorios en este paso).

No incluye:
- Verificación por correo electrónico.
- Recuperación de contraseña.
- Autenticación social (OAuth).

## Criterios de aceptación
1. El formulario valida en tiempo real el formato del correo electrónico.
2. La contraseña exige mínimo 8 caracteres con combinación alfanumérica.
3. La contraseña se almacena encriptada con bcrypt (nunca en texto plano).
4. Se muestra un mensaje de error claro si el correo ya está registrado.
5. Los campos adicionales de perfil (ID Universitario, Sexo, Teléfono) quedan sin asignar (`null`) para que sean configurados posteriormente por el usuario en su perfil o por el administrador.
6. Tras el registro exitoso el usuario es redirigido automáticamente al dashboard.
7. El endpoint `POST /auth/register` retorna 201 con JWT o 400 con mensaje de error descriptivo.

## Datos de entrada/salida
Entradas:
- `email` (string, requerido, formato válido).
- `password` (string, requerido, mínimo 8, alfanumérica).
- `full_name` (string, opcional).

Salidas:
- 201: `{ access_token, token_type }`.
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
    Then el sistema debe crear la cuenta
    And los campos university_id, gender y phone_number deben crearse como NULL
    And debo ser redirigido al dashboard
    And debo recibir un JWT

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
