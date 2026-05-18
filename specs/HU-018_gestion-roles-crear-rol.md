# HU-018: Gestión de Roles — Crear Rol

## Ruta de guardado
`specs/HU-018_gestion-roles-crear-rol.md`

## Historia de usuario
Como administrador de la plataforma, quiero poder crear nuevos roles con permisos específicos, para definir qué acciones puede realizar cada tipo de usuario dentro del sistema.

## Alcance
Incluye:
- Panel de administración en `/admin` con layout propio, accesible únicamente para usuarios con rol `administrador`.
- Pantalla `/admin/roles` que lista todos los roles existentes (`GET /roles`).
- Formulario de creación de rol: nombre + lista de permisos seleccionables.
- Persistencia del nuevo rol en base de datos (`POST /roles`).
- Actualización inmediata de la lista tras la creación exitosa.
- Protección del endpoint en backend: solo tokens JWT con rol `administrador` pueden operar.

No incluye:
- Editar, eliminar ni asignar roles (HU-019, HU-020, HU-021).
- Creación o gestión de permisos personalizados (los permisos son una lista predefinida en el sistema).
- Acceso al panel `/admin` desde un link visible para usuarios con rol `usuario`.

## Configuración de Base de Datos y Siembra (Seeding)

Para garantizar la correcta ejecución de esta historia tanto en desarrollo como en producción, se ha estructurado una solución de base de datos híbrida (migración automatizada + script de siembra).

### 1. Migración SQL (`backend/migrations/004_roles_permissions.sql`)
Añade el campo `permissions` de tipo `JSONB` a la tabla `roles`:
```sql
ALTER TABLE roles ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]';
```

### 2. Script de Siembra Automático (`backend/seed.py`)
Para desarrollo, se ha diseñado un script idempotente (`seed_db()`) que pobla la base de datos automáticamente al iniciar el backend (evento `startup` en `backend/main.py`), garantizando la existencia de los roles de sistema y cuentas de prueba funcionales.

#### Roles Sembrados por Defecto:
*   **`administrador`**: Rol del sistema con acceso total.
*   **`usuario`**: Rol base para estudiantes y docentes.

#### Credenciales de Desarrollo & Pruebas Insertadas:
| Correo de Acceso | Contraseña | Rol Asignado | Permisos por Defecto |
| :--- | :--- | :--- | :--- |
| **`admin@genova.ai`** | `admin1234password` | **`administrador`** | `create_ova`, `view_ova`, `export_ova`, `manage_users`, `manage_roles` |
| **`user@genova.ai`** | `user1234password` | **`usuario`** | `create_ova`, `view_ova`, `export_ova` |

### 3. Inserción Manual en Producción (Prerequisito de Despliegue)
> ⚠️ Para entornos de producción donde el script de desarrollo está desactivado, el administrador de base de datos debe insertar manualmente los roles base antes de levantar el panel:
```sql
INSERT INTO roles (name, description, permissions) VALUES
  ('administrador', 'Rol del sistema con acceso total', '["create_ova", "view_ova", "export_ova", "manage_users", "manage_roles"]'::jsonb),
  ('usuario',       'Rol base para estudiantes y docentes', '["create_ova", "view_ova", "export_ova"]'::jsonb)
ON CONFLICT (name) DO NOTHING;
```

---

## Permisos seleccionables (lista predefinida)
Los permisos son strings fijos definidos en el sistema:

| Permiso           | Descripción                                |
|-------------------|--------------------------------------------|
| `create_ova`      | Crear nuevos OVAs                          |
| `view_ova`        | Ver OVAs propios                           |
| `export_ova`      | Exportar OVAs como paquete SCORM           |
| `manage_users`    | Ver y modificar usuarios registrados       |
| `manage_roles`    | Crear, editar y eliminar roles             |

> Esta lista puede extenderse sin cambios de esquema, ya que se almacena como `JSONB` en la tabla `roles`.

---

## Criterios de aceptación
1. Las pantallas de gestión de roles y usuarios están agrupadas en un panel `/admin` con su propio layout, accesible únicamente para usuarios con rol `administrador`. Los usuarios con rol `usuario` que intenten acceder son redirigidos al dashboard.
2. Existe una pantalla `/admin/roles` que muestra la lista de todos los roles existentes, cargada al montar la vista mediante `GET /roles`.
3. El formulario de creación solicita: nombre del rol (texto libre, máx. 64 caracteres) y lista de permisos seleccionables mediante checkboxes.
4. No se pueden crear dos roles con el mismo nombre; el backend retorna `409 Conflict` y se muestra un mensaje de error descriptivo.
5. Tras la creación exitosa, el nuevo rol aparece inmediatamente en la lista sin recargar la página.
6. El endpoint `POST /roles` retorna `201` con los datos del rol creado o el código de error correspondiente.
7. El endpoint `GET /roles` retorna `200` con la lista de roles o `403` si el token no pertenece a un administrador.

---

## Datos de entrada/salida

### POST /roles
**Entrada:**
```json
{
  "name": "string (requerido, máx. 64 chars)",
  "permissions": ["string", "..."]
}
```
**Salidas:**
- `201`: `{ id, name, permissions, created_at }`
- `400`: `{ error: "validation_error", message }` — nombre vacío o demasiado largo.
- `403`: `{ error: "forbidden", message }` — token sin rol administrador.
- `409`: `{ error: "role_exists", message }` — nombre de rol ya registrado.

### GET /roles
**Salidas:**
- `200`: `[ { id, name, permissions, created_at }, ... ]`
- `403`: `{ error: "forbidden", message }` — token sin rol administrador.

---

## Flujos alternativos
- **Nombre duplicado:** El backend responde `409`. El frontend muestra un error en línea bajo el campo nombre: *"Ya existe un rol con ese nombre."*
- **Usuario no administrador accede a `/admin`:** El frontend detecta el rol en el JWT y redirige a `/dashboard` antes de renderizar el panel.
- **Token expirado al intentar crear:** El backend responde `401`. El frontend limpia el token y redirige a `/login`.
- **Lista de roles vacía (solo roles del sistema):** La pantalla muestra los roles `administrador` y `usuario` ya sembrados. El botón "Nuevo rol" sigue disponible.

---

## Escenarios BDD (Gherkin)
```gherkin
Feature: Gestión de Roles — Crear Rol
  Como administrador
  Quiero crear nuevos roles con permisos específicos
  Para definir qué acciones puede realizar cada tipo de usuario

  Background:
    Given que estoy autenticado como usuario con rol "administrador"
    And que los roles del sistema "administrador" y "usuario" ya existen en la base de datos

  Scenario: Acceso al panel de administración
    Given que navego a "/admin"
    Then debo ver el panel de administración con su propio layout
    And debo ver la opción "Gestión de Roles" en el menú del panel

  Scenario: Acceso denegado a usuario sin rol administrador
    Given que estoy autenticado como usuario con rol "usuario"
    When navego a "/admin"
    Then debo ser redirigido al dashboard
    And no debo ver el panel de administración

  Scenario: Ver lista de roles existentes
    Given que estoy en "/admin/roles"
    Then debo ver la lista de roles registrados
    And debo ver al menos los roles "administrador" y "usuario"

  Scenario: Crear un nuevo rol exitosamente
    Given que estoy en "/admin/roles"
    When hago click en "Nuevo rol"
    And ingreso el nombre "docente"
    And selecciono los permisos "create_ova" y "view_ova"
    And envío el formulario
    Then el sistema debe crear el rol y retornar 201
    And el nuevo rol "docente" debe aparecer inmediatamente en la lista

  Scenario: Intentar crear un rol con nombre duplicado
    Given que existe un rol con nombre "docente"
    When intento crear otro rol con el mismo nombre "docente"
    Then el sistema retorna 409
    And debo ver el mensaje "Ya existe un rol con ese nombre"
    And el rol no debe duplicarse en la lista

  Scenario: Intentar crear un rol con nombre vacío
    Given que estoy en el formulario de creación de roles
    When dejo el campo nombre vacío
    And envío el formulario
    Then debo ver un mensaje de error indicando que el nombre es obligatorio
    And el formulario no debe enviarse al backend
```

---

## Mockup ASCII — Panel `/admin/roles`
```
┌─────────────────────────────────────────────────────────┐
│  GENOVA Admin                          [Cerrar sesión]   │
├──────────────┬──────────────────────────────────────────┤
│  Admin Menu  │  Gestión de Roles                         │
│              │                                          │
│  > Roles     │  [ + Nuevo rol ]                         │
│    Usuarios  │                                          │
│              │  ┌────────────────────────────────────┐  │
│              │  │ Nombre        │ Permisos  │ Acciones│  │
│              │  ├───────────────┼───────────┼─────────┤  │
│              │  │ administrador │ todos     │ —       │  │
│              │  │ usuario       │ create... │ —       │  │
│              │  │ docente       │ view_ova  │ ✏️  🗑️  │  │
│              │  └────────────────────────────────────┘  │
└──────────────┴──────────────────────────────────────────┘

  Modal: Nuevo Rol
  ┌────────────────────────────────────┐
  │  Crear nuevo rol                   │
  │                                    │
  │  Nombre del rol                    │
  │  [ docente                      ]  │
  │                                    │
  │  Permisos                          │
  │  [x] create_ova   [ ] manage_users │
  │  [x] view_ova     [ ] manage_roles │
  │  [x] export_ova                    │
  │                                    │
  │  [ Cancelar ]   [ Crear rol ]      │
  └────────────────────────────────────┘
```
