# Especificación Funcional y Técnica — HU-021: Gestión de Roles — Asignar Rol a Usuario

Este documento define la especificación técnica y funcional completa para la historia de usuario **HU-021: Gestión de Roles — Asignar Rol a Usuario**, siguiendo los lineamientos de la metodología de desarrollo estructurado (SDD).

---

## 1. Identificación de la Historia

- **ID**: HU-021
- **Nombre**: Gestión de Roles — Asignar Rol a Usuario
- **Rol**: Administrador de la plataforma
- **Descripción**: Como administrador de la plataforma, quiero poder asignar o cambiar el rol de cualquier usuario registrado, para controlar qué funcionalidades tiene disponibles cada persona dentro del sistema.

---

## 2. Criterios de Aceptación

1. **Ubicación y Seguridad de la Interfaz**:
   - La pantalla de gestión de usuarios se encuentra en `/admin/users`.
   - Está protegida tanto en el frontend como en el backend; usuarios normales (`usuario` u otros no-administradores) que intenten ingresar verán denegado su acceso o serán redirigidos a `/dashboard`.
2. **Pantalla de Gestión de Usuarios**:
   - Muestra una tabla paginada con los usuarios registrados en el sistema.
   - La tabla incluirá campos como: Nombre Completo, Email, Fecha de Creación y Rol Actual.
   - Contará con controles de paginación (*Anterior*, *Siguiente*, indicador de página actual y total).
3. **Selector Desplegable de Roles**:
   - Cada fila de usuario tiene un control `<select>` con la lista de todos los roles disponibles en el sistema (obtenidos dinámicamente de `GET /api/roles`).
   - Al seleccionar un rol distinto en el desplegable, se realiza una petición al API y el rol del usuario se actualiza inmediatamente en el backend y frontend.
4. **Protección contra Bloqueo de Cuenta Propia**:
   - El administrador actual con la sesión activa **no puede cambiarse su propio rol**.
   - En el frontend, el selector de rol para la fila del administrador actual estará **deshabilitado** (`disabled`) y mostrará un indicador de `"Tú (Sesión activa)"`.
   - En el backend, el endpoint validará el ID del usuario objetivo. Si coincide con el ID del administrador autenticado que hace la petición, retornará un error `400 Bad Request` indicando la imposibilidad de auto-modificarse el rol.
5. **Persistencia e Inmediatez**:
   - El endpoint `PATCH /users/{id}/role` persiste los cambios en la base de datos de manera atómica (remueve la relación antigua en `user_roles` e inserta la nueva).
   - Como la capa de seguridad (`require_admin` en FastAPI) consulta el rol del usuario directamente de la base de datos en cada petición, la asignación y pérdida de permisos surte efecto de forma **inmediata** para todas las llamadas API protegidas del usuario afectado.
   - El cambio se refleja en caliente en el panel de administración.

---

## 3. Escenarios Gherkin (BDD)

### Escenario 1: Asignación exitosa de rol a un usuario por un Administrador
```gherkin
Dado que soy un usuario autenticado con el rol "administrador"
Y me encuentro en la pantalla de gestión de usuarios "/admin/users"
Cuando cambio el valor del selector de rol del usuario "user@genova.ai" de "usuario" a "administrador"
Entonces el sistema realiza una llamada PATCH a "/api/users/{id}/role" con el ID del rol "administrador"
Y el servidor retorna un código de estado 200 con la información del usuario actualizada
Y el estado local en el frontend se actualiza reflejando el nuevo rol "administrador" en su fila
```

### Escenario 2: Intento de cambiar el rol propio por el Administrador actual
```gherkin
Dado que soy el administrador autenticado con ID "uuid-admin-123" y correo "admin@genova.ai"
Y me encuentro en la pantalla de gestión de usuarios "/admin/users"
Cuando busco mi propia fila en la lista de usuarios
Entonces el selector de rol correspondiente a mi fila se muestra deshabilitado (disabled)
Y no puedo alterar su valor
Y si intento enviar manualmente una petición PATCH a "/api/users/uuid-admin-123/role" con un rol diferente
Entonces el backend me retorna un código de estado 400 Bad Request con el mensaje "No puedes cambiar tu propio rol para prevenir la pérdida de acceso administrativo"
```

### Escenario 3: Intento de acceso no autorizado por un usuario con rol "usuario"
```gherkin
Dado que soy un usuario autenticado con el rol "usuario"
Cuando intento ingresar directamente a la ruta "/admin/users"
Entonces el frontend me redirige automáticamente a la pantalla de "/dashboard"
Y si intento realizar una petición GET a "/api/users"
Entonces el backend retorna un código de estado 403 Forbidden
```

---

## 4. Diseño de Interfaz (Mockup ASCII)

```
+------------------------------------------------------------------------------------+
| GENOVA ADMIN  |  [Proyectos]   [Modelos]   [Roles]   [*Usuarios*]     (admin@genova.ai) |
+------------------------------------------------------------------------------------+
|                                                                                    |
|  Gestión de Usuarios                                                               |
|  Administra las cuentas registradas y asigna sus roles correspondientes.           |
|                                                                                    |
|  +------------------------------------------------------------------------------+  |
|  | Nombre Completo      | Correo Electrónico | Creado el   | Rol Asignado       |  |
|  +----------------------+--------------------+-------------+--------------------+  |
|  | Admin Genova         | admin@genova.ai    | 18/05/2026  | [Administrador v]* |  |  * (Selector Deshabilitado - "Tú")
|  | Juan Pérez           | juan@correo.com    | 17/05/2026  | [Usuario       v]  |  |
|  | María López          | maria@docencia.com | 15/05/2026  | [Docente       v]  |  |  * (Rol personalizado)
|  | Carlos Gómez         | carlos@user.com    | 10/05/2026  | [Usuario       v]  |  |
|  +----------------------+--------------------+-------------+--------------------+  |
|                                                                                    |
|  Pagina 1 de 3   << Anterior   [ 1 ]   2   3   Siguiente >>                        |
|                                                                                    |
+------------------------------------------------------------------------------------+
```

---

## 5. Contratos de Entrada/Salida de la API

### 1. `GET /api/users` (Listado Paginado de Usuarios)
- **Método**: `GET`
- **Cabeceras**: `Authorization: Bearer <token>`
- **Query Params**:
  - `page`: `int` (Opcional, por defecto `1`)
  - `limit`: `int` (Opcional, por defecto `10`)
- **Respuesta Exitosa (200 OK)**:
```json
{
  "total_items": 25,
  "total_pages": 3,
  "page": 1,
  "limit": 10,
  "users": [
    {
      "id": "2b8c94bf-8876-4235-b0fa-3eaaa385e74c",
      "email": "admin@genova.ai",
      "full_name": "Admin Genova",
      "role": {
        "id": "f50b92e3-2849-41aa-850c-3ee7e914041b",
        "name": "administrador"
      },
      "created_at": "2026-05-18T12:30:00Z"
    },
    {
      "id": "e6a2b8e3-0d90-4c61-8cb9-a3e46b19741c",
      "email": "juan@correo.com",
      "full_name": "Juan Pérez",
      "role": {
        "id": "7bf394e3-3849-45aa-950c-3ee7e914041c",
        "name": "usuario"
      },
      "created_at": "2026-05-17T09:15:00Z"
    }
  ]
}
```

### 2. `PATCH /api/users/{id}/role` (Modificar Rol del Usuario)
- **Método**: `PATCH`
- **Cabeceras**: `Authorization: Bearer <token>`
- **URL Params**: `id` (UUID del usuario objetivo)
- **Cuerpo de Entrada (JSON)**:
```json
{
  "role_id": "7bf394e3-3849-45aa-950c-3ee7e914041c"
}
```
- **Respuesta Exitosa (200 OK)**:
```json
{
  "id": "e6a2b8e3-0d90-4c61-8cb9-a3e46b19741c",
  "email": "juan@correo.com",
  "full_name": "Juan Pérez",
  "role": {
    "id": "7bf394e3-3849-45aa-950c-3ee7e914041c",
    "name": "usuario"
  },
  "updated_at": "2026-05-18T14:00:00Z"
}
```
- **Respuesta de Error - Auto-Modificación (400 Bad Request)**:
```json
{
  "detail": "No puedes cambiar tu propio rol para prevenir la pérdida de acceso administrativo."
}
```
- **Respuesta de Error - Acceso Denegado (403 Forbidden)**:
```json
{
  "detail": "Acceso denegado: se requieren privilegios de administrador."
}
```

---

## 6. Estrategia de Implementación Técnica

### Backend
1. **Creación del Módulo `users`**:
   - Crearemos la carpeta `backend/users/` y el archivo `backend/users/router.py`.
   - Implementaremos el modelo de entrada Pydantic `UserRoleUpdate` que valida que `role_id` sea un UUID válido.
   - Crearemos la ruta `GET /` con paginación usando consultas SQLAlchemy que cuenten registros y apliquen `limit` / `offset`.
   - Crearemos la ruta `PATCH /{id}/role`. Verificará que el ID objetivo no sea el del usuario actual, validará la existencia del rol, ejecutará la actualización atómica en `user_roles` y retornará 200 con el objeto de usuario y su nuevo rol mapeado.
2. **Registro de Rutas en `backend/main.py`**:
   - Registraremos el `users_router` bajo los prefijos `/api/users` y `/users`.

### Frontend
1. **Creación de la Página `AdminUsersPage.jsx`**:
   - Ubicada en `frontend/src/pages/AdminUsersPage.jsx`.
   - Tendrá estados para: `users`, `roles`, `loading`, `error`, `currentPage`, `totalPages`, `isUpdatingUserId`.
   - Realizará llamadas `GET /api/users?page=...&limit=...` y `GET /api/roles` en el montaje (`useEffect`).
   - Mapeará los usuarios en una tabla responsiva con un selector dropdown `<select>` por cada usuario.
   - El selector del administrador logueado estará deshabilitado.
   - Al cambiar la selección, llamará a `PATCH /api/users/{userId}/role` y actualizará el estado en memoria para reflejar el nuevo rol y permisos.
2. **Integración en Rutas (`frontend/src/App.jsx`)**:
   - Registraremos la ruta `/admin/users` vinculada a `AdminUsersPage` dentro del Layout de administración seguro.
   - Agregaremos un botón "Usuarios" en la barra lateral/navegación de `AdminLayout.jsx` para acceso directo del administrador.
