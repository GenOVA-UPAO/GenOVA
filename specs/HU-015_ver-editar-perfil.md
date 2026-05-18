# Especificación Funcional y Técnica — HU-015: Ver y Editar Perfil de Usuario

Este documento define la especificación técnica y funcional completa para la historia de usuario **HU-015: Ver y Editar Perfil de Usuario**, siguiendo los lineamientos de la metodología de desarrollo estructurado (SDD).

---

## 1. Identificación de la Historia

- **ID**: HU-015
- **Nombre**: Ver y Editar Perfil de Usuario
- **Rol**: Usuario autenticado de la plataforma
- **Descripción**: Como usuario autenticado de la plataforma, quiero poder ver y editar mis datos de perfil (nombre y correo electrónico) desde una pantalla de configuración, para mantener mi información actualizada dentro del sistema.

---

## 2. Criterios de Aceptación

1. **Pantalla de Perfil**:
   - Se ubica en la ruta `/profile` y es accesible desde un botón "Mi Perfil" en la barra lateral o de cabecera de la aplicación (`AppLayout` y `AdminLayout`).
   - Muestra de forma destacada y amigable: Nombre Completo, Correo Electrónico y Fecha de Registro.
2. **Fecha de Registro de Solo Lectura**:
   - El campo que indica la fecha de creación de la cuenta (`created_at`) es puramente descriptivo y de **solo lectura**. Se muestra formateado localmente (ej: *Miembro desde el 18 de mayo, 2026*).
3. **Formulario de Edición y Validaciones**:
   - El usuario puede editar su Nombre Completo y Correo Electrónico.
   - El formulario cuenta con validación de formatos en tiempo real:
     - Nombre Completo: Requerido, entre 3 y 100 caracteres.
     - Correo Electrónico: Requerido, formato de correo válido.
4. **Verificación de Duplicados**:
   - Si el usuario edita su correo electrónico, el backend comprobará en la base de datos que el nuevo correo electrónico no esté registrado por **otro usuario**.
   - En caso de duplicidad, el servidor responderá con `400 Bad Request` y un mensaje de error explicativo.
5. **Persistencia y Actualización Reactiva**:
   - La confirmación de cambios se realiza mediante un botón "Guardar Cambios".
   - Al actualizar exitosamente, se despliega una notificación flotante o banner en color verde de éxito.
   - Los datos en memoria del frontend se actualizan reactivamente, refrescando el nombre de usuario desplegado en los layouts globales sin necesidad de cerrar e iniciar sesión nuevamente.

---

## 3. Escenarios Gherkin (BDD)

### Escenario 1: Actualización exitosa de nombre y correo electrónico
```gherkin
Dado que soy un usuario autenticado
Y me encuentro en la pantalla de perfil "/profile"
Cuando cambio mi nombre a "Carlos Pérez" y mi correo a "carlos.perez@genova.ai"
Y hago clic en "Guardar Cambios"
Entonces el sistema realiza una llamada PATCH a "/api/users/me" con los nuevos datos
Y el servidor retorna un código de estado 200 con la información del perfil actualizada
Y la interfaz despliega un mensaje de éxito: "¡Perfil actualizado con éxito!"
Y los menús de navegación reflejan el nuevo nombre "Carlos Pérez" al instante
```

### Escenario 2: Intento de cambiar a un correo que ya pertenece a otro usuario
```gherkin
Dado que soy un usuario autenticado con el ID "uuid-user-123" y correo "carlos@correo.com"
Y existe otra cuenta en el sistema registrada bajo "maria@correo.com"
Y me encuentro en la pantalla de perfil "/profile"
Cuando cambio mi correo electrónico a "maria@correo.com"
Y hago clic en "Guardar Cambios"
Entonces el servidor me retorna un código de estado 400 Bad Request
Y la interfaz despliega un mensaje de advertencia: "El correo electrónico ya está en uso por otro usuario."
Y mis datos de perfil se mantienen sin alteraciones en la base de datos
```

### Escenario 3: Validaciones de formato inválido en formulario de perfil
```gherkin
Dado que soy un usuario autenticado
Y me encuentro en la pantalla de perfil "/profile"
Cuando borro el campo de nombre completo dejándolo vacío
O ingreso un formato de correo inválido como "correo-invalido"
Entonces el botón "Guardar Cambios" se muestra deshabilitado o el frontend previene el envío
Y muestra mensajes de validación indicando los errores de formato en pantalla
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
|  |  [ carlos.perez@genova.ai                                               ]    |  |
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
- **Cabeceras**: `Authorization: Bearer <token>`
- **Cuerpo de Entrada (JSON)**:
```json
{
  "full_name": "Carlos Pérez",
  "email": "carlos.perez@genova.ai"
}
```
- **Respuesta Exitosa (200 OK)**:
```json
{
  "id": "e6a2b8e3-0d90-4c61-8cb9-a3e46b19741c",
  "email": "carlos.perez@genova.ai",
  "full_name": "Carlos Pérez",
  "created_at": "2026-05-18T12:30:00Z",
  "updated_at": "2026-05-18T14:30:00Z"
}
```
- **Respuesta de Error - Correo en uso (400 Bad Request)**:
```json
{
  "detail": "El correo electrónico ya está en uso por otro usuario."
}
```

---

## 6. Estrategia de Implementación Técnica

### Backend
1. **Modelo de Entrada Pydantic**:
   - Crearemos el modelo `UserProfileUpdate` en `backend/users/router.py`:
     ```python
     class UserProfileUpdate(BaseModel):
         full_name: str = Field(..., min_length=3, max_length=100)
         email: str = Field(..., description="Correo electrónico válido")
     ```
2. **Endpoint `PATCH /me`**:
   - Implementaremos la ruta `PATCH /me` protegida por `get_current_user` en el router de usuarios `backend/users/router.py`.
   - Valida el formato del correo.
   - Comprueba si el nuevo correo ingresado ya existe en otro usuario (`select(User).where(User.email == email, User.id != current_user.id)`). Si existe, lanza `HTTPException(400, "El correo electrónico ya está en uso por otro usuario.")`.
   - Modifica `current_user.full_name` y `current_user.email`.
   - Ejecuta `db.commit()` y refresca el registro.
   - Retorna la información actualizada.

### Frontend
1. **Creación de la Página `ProfilePage.jsx`**:
   - Ubicada en `frontend/src/pages/ProfilePage.jsx`.
   - Carga la información actual del usuario llamando a `GET /api/auth/me`.
   - Permite editar el nombre y correo con validaciones reactivas sencillas.
   - Al enviar, realiza el `PATCH /api/users/me`.
   - Si tiene éxito, actualiza los datos globales de sesión (o refresca el perfil del usuario llamando a la función correspondiente) para actualizar los nombres desplegados en las barras laterales de inmediato.
   - Muestra un banner verde de confirmación con micro-animaciones.
2. **Integración en Rutas (`frontend/src/App.jsx`)**:
   - Registraremos la ruta `/profile` vinculada a `ProfilePage` en el layout compartido (`AppLayout` y `AdminLayout`).
3. **Enlaces de Acceso en Menús**:
   - Colocaremos un enlace `"Configuración Perfil"` en la barra de navegación o de usuario de los layouts.
