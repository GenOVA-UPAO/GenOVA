# HU-019: Gestión de Roles — Editar Rol

## Ruta de guardado
`specs/HU-019_gestion-roles-editar-rol.md`

## Historia de usuario
Como administrador de la plataforma, quiero poder editar el nombre y los permisos de un rol existente, para ajustar las capacidades de los usuarios sin necesidad de eliminar y recrear roles.

## Alcance
Incluye:
- Pantalla de edición de roles integrada en el panel `/admin/roles` mediante un modal de edición interactivo.
- Botón "Editar" en la tabla de roles por cada rol personalizado creado.
- Precarga automática de los datos actuales (nombre y permisos asignados) al abrir el modal.
- Endpoint `PATCH /roles/{id}` para procesar y persistir la actualización en la base de datos.
- Validación de rol e ID: sólo administradores pueden operar; los roles del sistema no pueden modificarse.
- Reflejo inmediato del cambio de permisos para todos los usuarios con ese rol asignado.

No incluye:
- Eliminar roles (HU-020) ni asignar roles a usuarios (HU-021).
- Modificar el nombre o los permisos de los roles del sistema (`administrador` y `usuario`).

## Reglas de Negocio Específicas
1. **Inmutabilidad del Sistema**: Los roles predefinidos (`administrador`, `usuario`) son de solo lectura. El botón "Editar" no estará disponible para ellos.
2. **Validación de Identidad**: Si un usuario con rol `usuario` intenta enviar una petición directa de actualización (`PATCH`), el backend responderá con `403 Forbidden`.
3. **Validación de Nombre**: El nombre del rol sigue sujeto a un máximo de 64 caracteres, formato no vacío, y unicidad en la base de datos (con exclusión del rol que se está editando).

---

## Criterios de aceptación
1. La pantalla de edición de roles está ubicada dentro del panel de administración (`/admin`), inaccesible para usuarios con rol `usuario`.
2. Existe un botón "Editar" por cada rol en la lista de gestión de roles (con excepción de `administrador` y `usuario` que muestran la etiqueta "Sistema").
3. Al hacer clic en "Editar", se abre un modal que precarga exactamente el nombre actual del rol y marca los checkboxes de los permisos que tiene asignados.
4. El cambio de nombre está sujeto a validación de unicidad: si coincide con otro rol existente, el backend responde `409` y el frontend muestra un error descriptivo.
5. Los cambios en el nombre o permisos se reflejan inmediatamente en la base de datos, afectando al instante el control de accesos de los usuarios que tengan ese rol.
6. No se puede editar el nombre ni los permisos de los roles del sistema (`administrador`, `usuario`) bajo ninguna circunstancia.
7. El endpoint `PATCH /roles/{id}` retorna `200 OK` con los datos actualizados del rol.

---

## Datos de entrada/salida

### PATCH /roles/{id}
**Entrada (URL Parameter):**
- `{id}`: UUID del rol a modificar (requerido).

**Entrada (Body JSON):**
```json
{
  "name": "string (opcional, máx. 64 chars)",
  "description": "string (opcional)",
  "permissions": ["string", "..."]
}
```

**Salidas:**
- `200 OK`: `{ id, name, description, permissions, created_at }`
- `400 Bad Request`: `{ error: "validation_error", message }` — Nombre vacío o de longitud superior a 64.
- `401 Unauthorized`: `{ error: "unauthorized", message }` — Token expirado o inválido.
- `403 Forbidden`: `{ error: "forbidden", message }` — Usuario sin rol administrador, o intento de modificar un rol del sistema (`administrador` / `usuario`).
- `404 Not Found`: `{ error: "role_not_found", message }` — El UUID provisto no corresponde a ningún rol.
- `409 Conflict`: `{ error: "role_exists", message }` — El nombre ingresado ya está asignado a otro rol.

---

## Flujos alternativos
- **Edición de nombre sin cambios**: Si el administrador abre el modal de edición y guarda sin cambiar el nombre, el backend no debe arrojar error de duplicado (la unicidad excluye al mismo registro por ID).
- **Intento de Bypass del API**: Si un usuario malintencionado intenta enviar un `PATCH /api/roles/{id_admin}` para modificar el rol de administrador, el backend intercepta la petición, valida si el ID corresponde a un rol del sistema y bloquea la operación retornando `403 Forbidden` con mensaje descriptivo.

---

## Escenarios BDD (Gherkin)
```gherkin
Feature: Gestión de Roles — Editar Rol
  Como administrador
  Quiero editar el nombre y permisos de un rol existente
  Para ajustar el control de acceso sin crear nuevos roles

  Background:
    Given que estoy autenticado como usuario con rol "administrador"
    And que existe un rol personalizado con ID "123" y nombre "docente"

  Scenario: Precarga de datos en el modal de edición
    Given que estoy en la pantalla "/admin/roles"
    When hago click en el botón "Editar" del rol "docente"
    Then debo ver abrirse el modal "Editar Rol"
    And el campo de texto "Nombre del rol" debe mostrar "docente"
    And los permisos asignados a "docente" deben estar pre-seleccionados

  Scenario: Modificación exitosa del rol
    Given que tengo el modal de edición del rol "docente" abierto
    When cambio el nombre a "instructor"
    And selecciono el permiso "export_ova"
    And hago click en "Guardar cambios"
    Then el sistema debe actualizar el rol en la base de datos y retornar 200
    And el modal debe cerrarse automáticamente
    And el rol "instructor" con sus nuevos permisos debe listarse inmediatamente en la tabla

  Scenario: Bloqueo de edición para roles de sistema
    Given que estoy en la lista de roles
    Then para la fila "administrador" no debe mostrarse el botón "Editar"
    And para la fila "usuario" no debe mostrarse el botón "Editar"
    And en su lugar debe aparecer el texto descriptivo "Sistema"

  Scenario: Nombre duplicado al intentar editar
    Given que existe otro rol con nombre "supervisor"
    And que tengo abierto el modal de edición del rol "docente"
    When cambio el nombre del rol a "supervisor"
    And hago click en "Guardar cambios"
    Then el sistema debe retornar un código 409
    And debo ver el mensaje de error "Ya existe un rol con ese nombre"
    And el modal debe permanecer abierto
```

---

## Mockup ASCII — Modal de Edición
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
│              │  │ administrador │ todos     │ Sistema │  │
│              │  │ usuario       │ create... │ Sistema │  │
│              │  │ docente       │ view_ova  │ ✏️  🗑️  │  │
│              │  └────────────────────────────────────┘  │
└──────────────┴──────────────────────────────────────────┘

  Modal: Editar Rol [docente]
  ┌────────────────────────────────────┐
  │  Editar rol: docente               │
  │                                    │
  │  Nombre del rol                    │
  │  [ instructor                   ]  │
  │                                    │
  │  Permisos                          │
  │  [x] create_ova   [ ] manage_users │
  │  [x] view_ova     [ ] manage_roles │
  │  [x] export_ova                    │
  │                                    │
  │  [ Cancelar ]   [ Guardar ]        │
  └────────────────────────────────────┘
```
