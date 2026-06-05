# HU-020: Gestión de Roles — Eliminar Rol

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | HU-020 |
| Tipo | Historia de Usuario |
| Épica/Tema | EP2: Plataforma Web y Autenticacion |
| Sprint | Sprint 1 |
| Status | Closed |
| Prioridad | Media |
| Estimación | 3 SP |
| Dependencia | HU-018 |
| Responsable | JUAN DIEGO CARRANZA JACINTO |
| Fase | SDD - Plan + Implement |
| Fecha creación | 2026-05-17 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-18 |

## Ruta de guardado
`specs/HU-020_gestion-roles-eliminar-rol.md`

## Historia de usuario
Como administrador de la plataforma, quiero poder eliminar roles que ya no sean necesarios, para mantener el sistema de permisos ordenado y sin roles obsoletos.

## Alcance
Incluye:
- Botón "Eliminar" en la tabla del panel `/admin/roles` para roles personalizados.
- Modal de confirmación dinámico en el frontend al hacer clic en "Eliminar".
- Validación del conteo de usuarios afectados:
  - Si el rol **no tiene** usuarios: Confirmación de borrado directo irreversible.
  - Si el rol **tiene** usuarios: Advertencia que muestra la cantidad de usuarios asignados y despliega un selector (`<select>`) para elegir un rol de destino para la reasignación de dichos usuarios.
- Endpoint `DELETE /roles/{id}` que acepta de manera opcional el query param `?reassign_to_id={uuid_rol_destino}`.
- Borrado atómico transaccional en base de datos.
- Eliminación del rol borrado del estado local de React al instante sin recarga de pantalla.

No incluye:
- Desvincular usuarios de forma individual (esto se gestiona en la HU-021).
- Modificar o eliminar permisos fijos del sistema.

## Reglas de Negocio Específicas
1. **Inmutabilidad Absoluta**: Los roles del sistema (`administrador` y `usuario`) no se pueden eliminar. El botón "Eliminar" estará completamente oculto en el frontend. En el backend, cualquier intento de eliminar estos roles retornará `403 Forbidden`.
2. **Reasignación Atómica Obligatoria**: Si un rol con usuarios activos se elimina y no se provee un `reassign_to_id`, la transacción abortará, retornando `409 Conflict`. Si se provee, la reasignación de los registros en `user_roles` y el borrado del rol ocurrirán en una sola transacción SQL.
3. **Control de Roles Disponibles**: El rol de destino para la reasignación no puede ser el mismo rol que se está eliminando.

---

## Criterios de aceptación
1. La pantalla de eliminación de roles está ubicada dentro del panel de administración (`/admin`), inaccesible para usuarios con rol `usuario`.
2. Existe un botón "Eliminar" por cada rol en la lista, excepto para los roles del sistema (`administrador`, `usuario`) que muestran la etiqueta `"Sistema"`.
3. Al hacer clic en "Eliminar", el sistema muestra un modal de confirmación indicando cuántos usuarios serían afectados por el borrado.
4. Si el rol tiene usuarios asignados, solicita obligatoriamente reasignarlos a otro rol seleccionable antes de permitir la eliminación. El botón de confirmación permanece bloqueado hasta elegir un rol válido.
5. El endpoint `DELETE /roles/{id}` retorna `204 No Content` en caso de borrado exitoso, o `409 Conflict` si tiene usuarios asignados sin especificar un rol de reasignación válido.

---

## Datos de entrada/salida

### DELETE /roles/{id}
**Entrada (URL Parameters):**
- `{id}`: UUID del rol a eliminar (requerido).
- `reassign_to_id` (Query Param, opcional): UUID del rol de destino para migrar los usuarios asignados antes del borrado.

**Salidas:**
- `204 No Content`: Eliminación (y posible reasignación) completada de forma exitosa y atómica.
- `400 Bad Request`: `{ error: "validation_error", message }` — Parámetros inválidos o intento de reasignar al mismo rol en eliminación.
- `401 Unauthorized`: `{ error: "unauthorized", message }` — Token expirado o inválido.
- `403 Forbidden`: `{ error: "forbidden", message }` — Usuario sin privilegios de administrador, o intento de borrar un rol del sistema (`administrador` / `usuario`).
- `404 Not Found`: `{ error: "role_not_found", message }` — El UUID del rol a eliminar o el de reasignación no existen.
- `409 Conflict`: `{ error: "role_has_users", message, user_count }` — El rol tiene usuarios asignados y no se proporcionó el parámetro `reassign_to_id`.

---

## Flujos alternativos
- **Reasignación al mismo rol**: Si por error de red o manipulación se pasa el mismo UUID en `id` y `reassign_to_id`, el backend aborta la transacción y responde con `400 Bad Request`.
- **Eliminación limpia sin reasignación**: Si el conteo de usuarios vinculados es exactamente `0`, el modal de confirmación en el frontend no muestra la sección de reasignación ni solicita la selección de rol, permitiendo el borrado directo.

---

## Escenarios BDD (Gherkin)
```gherkin
Feature: Gestión de Roles — Eliminar Rol
  Como administrador
  Quiero eliminar roles obsoletos
  Para mantener el orden de perfiles y accesos del sistema

  Background:
    Given que estoy autenticado como usuario con rol "administrador"
    And que existe un rol personalizado con ID "111" y nombre "auxiliar"

  Scenario: Bloqueo de eliminación para roles de sistema
    Given que estoy en la pantalla "/admin/roles"
    Then no debo ver el botón "Eliminar" para el rol "administrador"
    And no debo ver el botón "Eliminar" para el rol "usuario"
    And en su lugar debe figurar el texto "Sistema"

  Scenario: Eliminar un rol sin usuarios asignados
    Given que el rol "auxiliar" tiene 0 usuarios vinculados
    And que estoy en la pantalla "/admin/roles"
    When hago click en el botón "Eliminar" de "auxiliar"
    Then debo ver un modal de confirmación simple
    And debo ver la advertencia de que la acción es irreversible
    When hago click en "Confirmar eliminación"
    Then el sistema debe eliminar el rol retornando 204
    And el rol "auxiliar" debe desaparecer de la tabla local de inmediato

  Scenario: Intentar eliminar un rol con usuarios sin especificar reasignación
    Given que el rol "auxiliar" tiene 3 usuarios asignados
    When envío un request directo DELETE a "/api/roles/111" sin query parameters
    Then el sistema retorna un código 409
    And responde con el mensaje "El rol tiene usuarios asignados"

  Scenario: Eliminar un rol con usuarios especificando reasignación
    Given que el rol "auxiliar" tiene 3 usuarios asignados
    And que estoy en la pantalla "/admin/roles"
    When hago click en el botón "Eliminar" de "auxiliar"
    Then debo ver un modal indicando "Este rol tiene 3 usuarios asignados"
    And debo ver un selector de roles para reasignación
    When selecciono el rol "usuario" como destino
    And hago click en "Reasignar y eliminar"
    Then el sistema debe actualizar la tabla user_roles migrando los 3 usuarios a "usuario"
    And debe eliminar el rol "auxiliar" de la base de datos
    And el rol "auxiliar" debe desaparecer de la tabla de inmediato
```

---

## Mockups ASCII — Modales de Confirmación

### Caso A: Rol Sin Usuarios Asignados (Confirmación Simple)
```
  Modal: Eliminar Rol [auxiliar]
  ┌────────────────────────────────────┐
  │  ¿Eliminar rol: auxiliar?           │
  │                                    │
  │  ⚠️ Esta acción es permanente e    │
  │  irreversible. Se borrarán todas   │
  │  las configuraciones del rol.      │
  │                                    │
  │  [ Cancelar ]   [ Eliminar rol ]   │
  └────────────────────────────────────┘
```

### Caso B: Rol Con Usuarios (Reasignación Requerida)
```
  Modal: Eliminar Rol [auxiliar]
  ┌────────────────────────────────────┐
  │  ¿Eliminar rol: auxiliar?           │
  │                                    │
  │  ⚠️ Este rol tiene 3 usuarios       │
  │  asignados actualmente.            │
  │                                    │
  │  Para continuar, debes reasignar a │
  │  los usuarios a otro rol activo:   │
  │                                    │
  │  Reasignar usuarios a:             │
  │  [ Selecciona un rol           v ] │
  │                                    │
  │  [ Cancelar ]  [ Reasignar y Borrar]│ (Deshabilitado hasta elegir rol)
  └────────────────────────────────────┘
```
