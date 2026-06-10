# Especificación Funcional y Técnica — HU-021: Gestión de Usuarios y Roles

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | HU-021 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | HU-018 |
| Responsable | JUAN DIEGO CARRANZA JACINTO |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-05-17 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-18 |

Este documento define la especificación técnica y funcional completa para la historia de usuario **HU-021: Gestión de Usuarios y Roles**, siguiendo los lineamientos de la metodología de desarrollo estructurado (SDD) y las políticas de seguridad jerárquica del sistema.

---

## 1. Identificación de la Historia

- **ID**: HU-021
- **Nombre**: Gestión de Usuarios y Roles
- **Rol**: Administrador de la plataforma o usuario con el permiso `"manage_users"`
- **Descripción**: Como administrador de la plataforma, quiero poder visualizar la lista de usuarios, editar sus perfiles extendidos (ID Universitario, Sexo y Teléfono), cambiar sus roles, activar/desactivar sus cuentas, desbloquearlas e iniciar el restablecimiento de contraseñas por correo y WhatsApp, para gestionar integralmente el acceso de las personas en el sistema.

---

## 2. Criterios de Aceptación

### 1. Ubicación y Seguridad de la Interfaz
- La pantalla de gestión de usuarios se encuentra en `/admin/users`.
- Está protegida tanto en el frontend como en el backend. 
- En lugar de validar únicamente si el rol se llama `"administrador"`, el backend comprobará de forma dinámica si el rol del usuario autenticado contiene el permiso `"manage_users"`. Los usuarios normales sin este permiso serán redirigidos a `/dashboard` en el frontend y recibirán un error `403 Forbidden` en el backend.

### 2. Tabla Paginada de Usuarios
- Muestra una tabla paginada con los campos: 
  *   **Nombre Completo:** Nombre ingresado por el usuario o administrador.
  *   **Correo Electrónico:** Dirección de correo institucional.
  *   **Código UPAO:** Código universitario. Si el valor matemático guardado es menor a 9 dígitos, se le agregará dinámicamente padding de ceros a la izquierda (ej: `257022` se muestra como `000257022`).
  *   **Sexo:** Categórico (`"masculino"`, `"femenino"`, `"otro"`).
  *   **Teléfono:** Almacenado como texto.
  *   **Miembro desde:** Fecha de registro formateada.
  *   **Estado:** Activo, Inactivo o Bloqueado (según `is_active` y `locked_until`).
  *   **Rol Asignado:** Menú desplegable para cambiar el rol.

### 3. Acciones de Administración (Menú desplegable en cada fila)
Cada fila de usuario (a excepción del propio usuario logueado) contará con un menú de acciones que permitirá:
*   **Editar Perfil:** Abre un modal con campos para Nombre Completo, Email, Código UPAO, Sexo (dropdown) y Teléfono. Queda estrictamente excluido el campo de contraseña.
*   **Desactivar / Activar Cuenta:** Modifica el atributo `is_active`. Si está inactivo, el usuario no podrá iniciar sesión en la plataforma.
*   **Desbloquear Cuenta:** Habilitado únicamente si el usuario está bloqueado por demasiados intentos fallidos. Resetea `failed_login_attempts` a `0` y limpia `locked_until`.
*   **Restablecer por Correo (SMTP):** Genera un token temporal en la tabla `PasswordResetToken` y envía de manera automática un correo electrónico usando el SMTP de Gmail de la aplicación (`soporte.genova.upao@gmail.com`) con un enlace para que el usuario restablezca su clave de forma autónoma.
*   **Restablecer por WhatsApp (wa.me):** Genera un token de reset internamente (nunca expuesto al cliente) y devuelve una `wa_url` con el enlace de restablecimiento preformateado. El frontend abre esa URL en una pestaña nueva para que el administrador envíe el mensaje manualmente desde su cliente de WhatsApp. El teléfono se normaliza automáticamente en el frontend eliminando caracteres no numéricos y anteponiendo el código de país peruano ("51") si se ingresó un número de 9 dígitos.


### 4. Protección contra Escalada de Privicios y Seguridad Jerárquica
*   El administrador actual no puede cambiarse su propio rol ni desactivarse su cuenta.
*   Un usuario con permiso `"manage_users"` pero que **no** posea el rol literal `"administrador"` (por ejemplo, un rol personalizado "coordinador"):
    *   **No** puede editar la cuenta ni cambiarle el rol a un usuario que tenga el rol `"administrador"`. Su fila correspondiente tendrá el menú de acciones deshabilitado.
    *   **No** puede cambiar el rol de ningún usuario al rol `"administrador"`. La opción `"administrador"` estará omitida o deshabilitada en el dropdown de roles para él.
    *   Si intenta saltarse el frontend y enviar una petición manual al API para alterar a un administrador o asignar dicho rol, el backend retornará `403 Forbidden`.

---

## 3. Escenarios Gherkin (BDD)

```gherkin
Feature: Gestión de Usuarios y Roles

  Scenario: Asignación exitosa de rol a un usuario por un Administrador
    Given que soy un usuario autenticado con el rol "administrador"
    And me encuentro en la pantalla de gestión de usuarios "/admin/users"
    When cambio el valor del selector de rol del usuario "user@genova.ai" de "usuario" a "docente"
    Then el sistema realiza una llamada PATCH a "/api/users/{id}/role" con el ID del rol "docente"
    And el servidor retorna un código de estado 200 con la información del usuario actualizada
    And el estado local en el frontend se actualiza reflejando el nuevo rol "docente" en su fila

  Scenario: Intento de cambiar el rol propio por el Administrador actual
    Given que soy el administrador autenticado con ID "uuid-admin-123" y correo "admin@genova.ai"
    And me encuentro en la pantalla de gestión de usuarios "/admin/users"
    When busco mi propia fila en la lista de usuarios
    Then el selector de rol correspondiente a mi fila se muestra deshabilitado
    And el menú de acciones para mi usuario está inactivo o deshabilitado
    And si intento enviar manualmente una petición PATCH a "/api/users/uuid-admin-123/role"
    Then el backend me retorna un código de estado 400 Bad Request

  Scenario: Prevención de escalada de privilegios por un rol "coordinador"
    Given que estoy autenticado con un rol "coordinador" que posee el permiso "manage_users"
    And existe un usuario "admin@genova.ai" con el rol "administrador"
    When intento abrir el modal de edición o cambiar el rol de "admin@genova.ai" desde la interfaz
    Then las acciones están deshabilitadas
    And si intento enviar manualmente un PATCH al endpoint para cambiar su rol
    Then el backend responde con 403 Forbidden indicando "No puedes modificar a un usuario administrador"

  Scenario: Restablecimiento de contraseña por correo (SMTP automático)
    Given que soy un administrador en la pantalla de gestión de usuarios
    When hago clic en la opción "Restablecer por Correo" del usuario "estudiante@upao.edu.pe"
    Then el backend genera un token de restablecimiento único internamente
    And el servidor envía un correo electrónico automático a "estudiante@upao.edu.pe"
    And el frontend muestra una notificación de éxito indicando que el correo fue enviado
    And la respuesta del servidor NO contiene el token de restablecimiento

  Scenario: Restablecimiento de contraseña por WhatsApp (link manual)
    Given que soy un administrador en la pantalla de gestión de usuarios
    And el usuario "estudiante@upao.edu.pe" tiene teléfono registrado
    When hago clic en la opción "Restablecer por WhatsApp"
    Then el backend genera un token internamente y retorna una wa_url de WhatsApp
    And el frontend abre la URL de WhatsApp para que el administrador envíe el mensaje manualmente
    And la respuesta del servidor NO contiene el token de restablecimiento
```

---

## 4. Diseño de Interfaz (Mockup ASCII)

```
+---------------------------------------------------------------------------------------------------+
| GENOVA ADMIN  |  [Proyectos]   [Modelos]   [Roles]   [*Usuarios*]                 (admin@genova.ai) |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  Gestión de Usuarios                                                                              |
|  Administra las cuentas registradas y gestiona sus datos de perfil y seguridad.                   |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  | Nombre Completo | Correo             | Código UPAO | Teléfono    | Rol          | Acciones  |  |
|  +-----------------+--------------------+-------------+-------------+--------------+-----------+  |
|  | Admin Genova    | admin@genova.ai    | 000000001   | +5198765432 | [Admin    v]*| [Acción]  |  |  * (Deshabilitado)
|  | Juan Pérez      | juan@correo.com    | 000257022   | +5198728599 | [Usuario  v] | [Acción  ]v |  --> [✏️ Editar]
|  | María López     | maria@docencia.com | 000015367   | +5195544332 | [Docente  v] | [Acción  ]  |      [🚫 Desactivar]
|  | Carlos Gómez    | carlos@user.com    | --          | --          | [Usuario  v] | [Acción  ]  |      [✉️ Enviar Correo]
|  +-----------------+--------------------+-------------+-------------+--------------+-----------+  |      [💬 WhatsApp Link]
|                                                                                                   |
|  Pagina 1 de 1   << Anterior   [ 1 ]   Siguiente >>                                               |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+

Modal: Editar Perfil de Usuario
+------------------------------------------+
|  Editar Perfil: Juan Pérez               |
|                                          |
|  Nombre Completo:                        |
|  [ Juan Pérez                        ]   |
|  Correo Electrónico:                     |
|  [ juan@correo.com                   ]   |
|  Código Universitario (UPAO):            |
|  [ 257022                            ]   |  * (Solo enteros, se autocompleta con ceros al mostrar)
|  Sexo:                                   |
|  ( ) Masculino  ( ) Femenino  ( ) Otro   |
|  Teléfono de contacto:                   |
|  [ +5198728599                       ]   |
|                                          |
|  [ Guardar Cambios ]  [ Cancelar ]       |
+------------------------------------------+
```

---

## 5. Contratos de Entrada/Salida de la API

### 1. `GET /api/users` (Listado Paginado de Usuarios)
- **Cabeceras**: `Authorization: Bearer <token>`
- **Query Params**: `page` (int), `limit` (int)
- **Respuesta (200 OK)**:
```json
{
  "total_items": 3,
  "total_pages": 1,
  "page": 1,
  "limit": 10,
  "users": [
    {
      "id": "e6a2b8e3-0d90-4c61-8cb9-a3e46b19741c",
      "email": "juan@correo.com",
      "full_name": "Juan Pérez",
      "university_id": 257022,
      "gender": "masculino",
      "phone_number": "+51987285992",
      "is_active": true,
      "locked_until": null,
      "role": {
        "id": "7bf394e3-3849-45aa-950c-3ee7e914041c",
        "name": "usuario"
      },
      "created_at": "2026-05-17T09:15:00Z"
    }
  ]
}
```

### 2. `PATCH /api/users/{id}` (Actualizar Datos de Perfil)
- **Cuerpo de Entrada (JSON)**:
```json
{
  "full_name": "Juan Pérez Modificado",
  "email": "juan.mod@correo.com",
  "university_id": 257022,
  "gender": "masculino",
  "phone_number": "+51987285992"
}
```
- **Respuesta Exitosa (200 OK)**: Retorna los datos del usuario actualizados.

### 3. `PATCH /api/users/{id}/status` (Activar o Desactivar Cuenta)
- **Cuerpo de Entrada (JSON)**:
```json
{
  "is_active": false
}
```
- **Respuesta (200 OK)**: `{ "id": "...", "is_active": false }`

### 4. `POST /api/users/{id}/unlock` (Desbloquear Cuenta Bloqueada)
- **Respuesta (200 OK)**: `{ "id": "...", "message": "Cuenta desbloqueada con éxito." }`

### 5. `POST /api/users/{id}/reset-password-email` (Enviar Correo SMTP)
- **Respuesta (200 OK)**: `{ "message": "Correo de restablecimiento enviado exitosamente." }`

### 6. `POST /api/users/{id}/reset-password-whatsapp` (Generar link WhatsApp para reset)
- **Respuesta (200 OK)**:
```json
{
  "wa_url": "https://api.whatsapp.com/send?phone=51987285992&text=Hola%2C+tu+enlace+de+recuperaci%C3%B3n+en+GenOVA+es%3A+..."
}
```
> **Seguridad**: El token de restablecimiento se genera internamente y **nunca se devuelve al cliente**. Solo se expone la URL de WhatsApp para que el administrador la comparta manualmente. El token vive en `PasswordResetToken` y se consume en `POST /api/auth/reset-password`.
