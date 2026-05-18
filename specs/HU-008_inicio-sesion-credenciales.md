# HU-008: Inicio de Sesión con Credenciales

## Ruta de guardado
`specs/HU-008_inicio-sesion-credenciales.md`

## Historia de usuario
Como estudiante del curso de ML de UPAO, quiero iniciar sesión con mi correo y contraseña para acceder a la plataforma y mis proyectos. La sesión debe mantenerse activa entre visitas y existir protección básica contra intentos de acceso no autorizados.

## Alcance
Incluye:
- Inicio de sesión con correo y contraseña desde la vista `/login`.
- Validación de credenciales en backend con respuesta JWT.
- Persistencia de sesión en cliente con token almacenado en localStorage.
- Bloqueo temporal tras 5 intentos fallidos consecutivos por 15 minutos.
- Cierre de sesión que elimina el token y redirige a `/login`.
- Redirección automática al login cuando el token expire.

No incluye:
- Refresh tokens.
- Autenticación social (OAuth).
- Verificación por email o MFA.

## Criterios de aceptación
1. El inicio de sesión exitoso genera un token JWT con tiempo de expiración de 24 horas.
2. El token se almacena de forma segura en el cliente (localStorage).
3. Tras 5 intentos fallidos consecutivos la cuenta queda bloqueada temporalmente (15 minutos).
4. El botón de cerrar sesión elimina el token del cliente y redirige al login.
5. Si el token expira, el usuario es redirigido al login automáticamente.
6. El endpoint `POST /auth/login` retorna 200 con JWT o 401 con mensaje descriptivo.

## Datos de entrada/salida
Entradas:
- `email` (string, requerido, formato válido).
- `password` (string, requerido).

Salidas:
- 200: `{ access_token, token_type, expires_in }`.
- 401: `{ error, message }`.
- 403 (bloqueo): `{ error, message, retry_after_minutes }`.

## Flujos alternativos
- Credenciales inválidas: respuesta 401 con mensaje descriptivo genérico.
- Usuario bloqueado: respuesta 403 indicando tiempo restante de bloqueo.
- Token expirado: el cliente elimina el token y redirige a `/login`.

## Escenarios BDD (Gherkin)
```gherkin
Feature: Inicio de sesión con credenciales
  Como estudiante
  Quiero iniciar sesión con mi correo y contraseña
  Para acceder a la plataforma y mis proyectos

  Scenario: Login exitoso
    Given que estoy en la página de login
    When ingreso un correo registrado y contraseña válida
    And envío el formulario
    Then debo recibir un JWT con expiración de 24 horas
    And debo ser redirigido al dashboard

  Scenario: Credenciales inválidas
    Given que estoy en la página de login
    When ingreso un correo o contraseña inválidos
    And envío el formulario
    Then debo recibir un error descriptivo
    And no debo acceder al dashboard

  Scenario: Bloqueo tras intentos fallidos
    Given que realizo 5 intentos fallidos consecutivos
    When intento iniciar sesión nuevamente
    Then la cuenta debe quedar bloqueada por 15 minutos
    And debo recibir un mensaje indicando el bloqueo

  Scenario: Token expirado
    Given que tengo un token expirado en el cliente
    When intento acceder a una ruta protegida
    Then debo ser redirigido automáticamente al login

  Scenario: Cerrar sesión
    Given que tengo una sesión activa
    When hago click en "Cerrar sesión"
    Then el token debe eliminarse del cliente
    And debo ser redirigido al login
```

## Mockup ASCII - Login
```
┌─────────────────────────────────────────┐
│  GENOVA                                  │
├─────────────────────────────────────────┤
│  Iniciar sesión                          │
│                                         │
│  Correo                                 │
│  [ estudiante@upao.edu              ]   │
│                                         │
│  Contraseña                             │
│  [ •••••••••••••••••                 ]  │
│                                         │
│  [ Iniciar sesión ]                      │
│                                         │
│  Mensaje: Credenciales inválidas         │
│                                         │
│  ¿No tienes cuenta? Crear cuenta         │
└─────────────────────────────────────────┘
```
