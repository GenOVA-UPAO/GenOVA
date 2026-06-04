# Especificación Funcional y Técnica — HU-015: Ver y Editar Perfil de Usuario

Este documento define la especificación técnica y funcional completa para la historia de usuario **HU-015: Ver y Editar Perfil de Usuario**, siguiendo los lineamientos de la metodología de desarrollo estructurado (SDD).

---

## 1. Identificación de la Historia

- **ID**: HU-015
- **Nombre**: Ver y Editar Perfil de Usuario
- **Rol**: Usuario autenticado de la plataforma
- **Descripción**: Como usuario autenticado de la plataforma, quiero poder ver y editar mis datos de perfil (nombre, correo electrónico, código universitario, sexo y teléfono) desde una pantalla de configuración, para mantener mi información actualizada dentro del sistema.

---

## 2. Criterios de Aceptación

### 1. Pantalla de Perfil
- Se ubica en la ruta `/profile` y es accesible desde un botón "Mi Perfil" en la barra lateral o de cabecera de la aplicación (`AppLayout` y `AdminLayout`).
- Muestra de forma destacada y amigable: Nombre Completo, Correo Electrónico, Código Universitario (UPAO), Sexo, Teléfono y la Fecha de Registro (Miembro desde).

### 2. Campos de Solo Lectura
- El campo que indica la fecha de creación de la cuenta (`created_at`) y el rol asignado son puramente descriptivos y de **solo lectura**. 

### 3. Formulario de Edición y Validaciones
El usuario puede editar los siguientes campos:
*   **Nombre Completo:** Requerido, entre 3 y 100 caracteres.
*   **Correo Electrónico:** Requerido, formato de correo válido.
*   **Código Universitario:** Opcional. Debe ser un entero positivo. En la interfaz se mostrará formateado con ceros a la izquierda hasta 9 dígitos (ej. `257022` se muestra como `000257022`).
*   **Sexo:** Opcional. Opciones: `"masculino"`, `"femenino"`, `"otro"`. Se representa como un selector desplegable.
*   **Teléfono:** Opcional. Admite dígitos numéricos y opcionalmente el signo `+` al inicio.

### 4. Verificación de Duplicados
- Si el usuario edita su correo electrónico o su número de teléfono, el backend comprobará en la base de datos que el nuevo valor no esté registrado por **otro usuario**.
- En caso de duplicidad, el servidor responderá con `400 Bad Request` y un mensaje de error explicativo.

### 5. Persistencia y Actualización Reactiva
- Los cambios se aplican al hacer clic en "Guardar Cambios".
- Al actualizar exitosamente, se despliega una notificación flotante en color verde de éxito.
- Los datos de sesión en memoria del frontend se actualizan al instante, refrescando el nombre de usuario desplegado en los layouts globales sin necesidad de cerrar e iniciar sesión.

---

## 3. Escenarios Gherkin (BDD)

```gherkin
Feature: Ver y Editar Perfil de Usuario

  Scenario: Actualización exitosa del perfil completo
    Given que soy un usuario autenticado
    And me encuentro en la pantalla de perfil "/profile"
    When cambio mi nombre a "Carlos Pérez", mi correo a "carlos.perez@upao.edu.pe", mi código UPAO a "257022", mi sexo a "masculino" y mi teléfono a "+51987285992"
    And hago clic en "Guardar Cambios"
    Then el sistema realiza una llamada PATCH a "/api/users/me" con los nuevos datos
    And el servidor retorna un código de estado 200 con la información del perfil actualizada
    And la interfaz despliega un mensaje de éxito: "¡Perfil actualizado con éxito!"

  Scenario: Intento de cambiar a un correo o teléfono que ya pertenece a otro usuario
    Given que soy un usuario autenticado con el ID "uuid-user-123" y correo "carlos@correo.com"
    And existe otra cuenta en el sistema registrada bajo "maria@correo.com"
    And me encuentro en la pantalla de perfil "/profile"
    When cambio mi correo electrónico a "maria@correo.com"
    And hago clic en "Guardar Cambios"
    Then el servidor me retorna un código de estado 400 Bad Request
    And la interfaz despliega un mensaje de advertencia: "El correo electrónico ya está en uso por otro usuario."
```

---

## 4. Diseño de Interfaz (Mockup ASCII)

```
+------------------------------------------------------------------------------------+
| GENOVA APP  |  [Proyectos]   [Modelos]                                 (Carlos P. v) |
+------------------------------------------------------------------------------------+
|                                                                                    |
|  Configuración de Perfil                                                           |
|  Administra tu información personal de contacto y visualiza tu cuenta.             |
|                                                                                    |
|  +------------------------------------------------------------------------------+  |
|  |                                                                              |  |
|  |  [ Foto/Iniciales: CP ]                                                      |  |
|  |  Miembro desde: 18 de mayo, 2026 (Lectura)                                   |  |
|  |                                                                              |  |
|  |  Nombre Completo:                                                            |  |
|  |  [ Carlos Pérez                                                         ]    |  |
|  |                                                                              |  |
|  |  Correo Electrónico:                                                         |  |
|  |  [ carlos.perez@upao.edu.pe                                             ]    |  |
|  |                                                                              |  |
|  |  Código Universitario (UPAO):                                                |  |
|  |  [ 000257022                                                            ]    |  |
|  |                                                                              |  |
|  |  Sexo:                                                                       |  |
|  |  [ Masculino                                                            ]v   |  |
|  |                                                                              |  |
|  |  Teléfono de contacto:                                                       |  |
|  |  [ +51987285992                                                         ]    |  |
|  |                                                                              |  |
|  |  [ Guardar Cambios ]  [ Cancelar ]                                           |  |
|  |                                                                              |  |
|  +------------------------------------------------------------------------------+  |
|                                                                                    |
+------------------------------------------------------------------------------------+
```

---

## 5. Contratos de Entrada/Salida de la API

### `PATCH /api/users/me` (Actualizar perfil del usuario autenticado)
- **Método**: `PATCH`
- **Cuerpo de Entrada (JSON)**:
```json
{
  "full_name": "Carlos Pérez",
  "email": "carlos.perez@upao.edu.pe",
  "university_id": 257022,
  "gender": "masculino",
  "phone_number": "+51987285992"
}
```
- **Respuesta Exitosa (200 OK)**:
```json
{
  "id": "e6a2b8e3-0d90-4c61-8cb9-a3e46b19741c",
  "email": "carlos.perez@upao.edu.pe",
  "full_name": "Carlos Pérez",
  "university_id": 257022,
  "gender": "masculino",
  "phone_number": "+51987285992",
  "created_at": "2026-05-18T12:30:00Z",
  "updated_at": "2026-05-18T14:30:00Z"
}
```
- **Respuesta de Error - Teléfono o Correo Duplicado (400 Bad Request)**:
```json
{
  "detail": "El correo electrónico o número de teléfono ya está en uso por otro usuario."
}
```
