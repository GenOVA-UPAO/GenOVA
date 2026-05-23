# HU-1: Registro de Usuarios con Nombre y Rol por Defecto

## Descripción
Modificar el formulario y proceso de registro para solicitar el nombre completo de los usuarios al crear una cuenta. Además, se garantiza que al registrarse se asigne físicamente el rol de `"usuario"` al nuevo usuario en la base de datos (relación en la tabla `user_roles`), asegurando que no se creen cuentas sin rol o con roles administrativos por error.

---

## Criterios de Aceptación

### 1. Frontend (React)
- **Modificación de Formulario:**
  - Agregar un campo obligatorio de tipo texto para el "Nombre completo" (`full_name`) en la parte superior del formulario de `/register` (antes del campo de Correo).
  - El campo de texto debe tener el mismo estilo, tipografía, placeholders y clases de Tailwind CSS que los inputs ya existentes en el formulario.
- **Validación del Cliente:**
  - Validar en tiempo real que el nombre completo no esté vacío y tenga una longitud mínima de 3 caracteres y un máximo de 100 caracteres.
  - Mostrar un mensaje de error descriptivo debajo del input si el nombre no cumple las condiciones (ej. `"El nombre completo debe tener al menos 3 caracteres."`).
  - Deshabilitar el botón de "Crear cuenta" si el nombre no es válido (en conjunto con las validaciones existentes de correo y contraseña).
- **Petición al Servidor:**
  - Enviar el parámetro `"full_name"` en el cuerpo del JSON (body payload) en la llamada a `POST /auth/register`.

### 2. Backend (FastAPI)
- **Validación del Servidor:**
  - El esquema de entrada del endpoint `POST /api/auth/register` debe incluir el campo `full_name`.
  - Validar que el `full_name` no sea nulo, no esté en blanco, tenga al menos 3 caracteres y no exceda 100 caracteres. De lo contrario, responder con `400 Bad Request`.
- **Persistencia en Base de Datos:**
  - Crear el registro de `User` asignando el valor de `full_name`.
  - Buscar en la base de datos el rol con nombre `"usuario"`.
  - Crear e insertar un registro en la tabla `user_roles` que vincule al usuario con el rol `"usuario"` encontrado.
  - Si el rol `"usuario"` no existe en la base de datos, el backend debe cancelar la transacción (rollback) y retornar un error `500 Internal Server Error` indicando que el rol base del sistema no está configurado (asegurando consistencia de roles).

---

## Datos de entrada/salida

### POST /api/auth/register
- **Entrada (Body JSON):**
  ```json
  {
    "full_name": "Juan Diego CJ",
    "email": "estudiante@upao.edu",
    "password": "Password123"
  }
  ```
- **Salida (Body JSON - Exitoso 201):**
  ```json
  {
    "status": "success",
    "user": {
      "id": "uuid-generado",
      "email": "estudiante@upao.edu",
      "full_name": "Juan Diego CJ",
      "role": "usuario"
    }
  }
  ```

---

## Flujos alternativos

### Flujo Alternativo 1: Rol "usuario" inexistente en BD
Si por problemas de siembra de base de datos el rol `"usuario"` no está registrado al momento del registro, el backend cancelará la inserción del usuario, realizará un rollback, registrará un log de error y responderá con `500 Internal Server Error`. El frontend mostrará un mensaje descriptivo al usuario: `"Error del sistema: Rol por defecto no configurado."`.

---

## BDD / Gherkin

```gherkin
Feature: Registro de Usuarios con Nombre y Rol por Defecto
  Como un nuevo usuario de la plataforma GenOVA
  Quiero registrarme ingresando mi nombre completo, correo y contraseña
  Para acceder al sistema de forma segura con el rol de usuario asignado

  Scenario: Registro exitoso de un nuevo usuario
    Given que el usuario está en la página de registro
    When ingresa su nombre completo "Juan Diego CJ"
    And ingresa su correo electrónico "estudiante@upao.edu"
    And ingresa su contraseña "Estudiante123"
    And hace clic en "Crear cuenta"
    Then el sistema debe guardar el usuario en la base de datos con nombre "Juan Diego CJ"
    And debe asignarle físicamente el rol "usuario" en la tabla user_roles
    And debe iniciar sesión automáticamente configurando la cookie de sesión "genova_token"
    And debe redirigir al usuario al Dashboard "/dashboard"

  Scenario: Intento de registro con datos inválidos (nombre muy corto)
    Given que el usuario está en la página de registro
    When ingresa su nombre completo "JD"
    And ingresa su correo electrónico "estudiante@upao.edu"
    And ingresa su contraseña "Estudiante123"
    Then el botón de "Crear cuenta" debe estar deshabilitado
    And debe mostrar un mensaje de error indicando "El nombre completo debe tener al menos 3 caracteres."
```

---

## Mockups en ASCII

```
+------------------------------------------------------+
|                    Crear cuenta                      |
|    Regístrate para guardar y acceder a tus OVAs.     |
|                                                      |
|    Nombre completo                                   |
|    [ Juan Diego CJ                                 ] |
|                                                      |
|    Correo                                            |
|    [ estudiante@upao.edu                           ] |
|                                                      |
|    Contraseña                                        |
|    [ ••••••••                                      ] |
|    Usa al menos 8 caracteres con letras y números.   |
|                                                      |
|    [                 Crear cuenta                  ] |
|                                                      |
|             ¿Ya tienes cuenta? Iniciar sesión        |
+------------------------------------------------------+
```
