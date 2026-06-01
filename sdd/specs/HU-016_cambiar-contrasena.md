# Especificación Funcional y Técnica — HU-016: Cambiar Contraseña desde el Perfil

Este documento define la especificación técnica y funcional completa para la historia de usuario **HU-016: Cambiar Contraseña desde el Perfil**, siguiendo los lineamientos de la metodología de desarrollo estructurado (SDD).

---

## 1. Identificación de la Historia

- **ID**: HU-016
- **Nombre**: Cambiar Contraseña desde el Perfil
- **Rol**: Usuario autenticado de la plataforma
- **Descripción**: Como usuario autenticado de la plataforma, quiero poder cambiar mi contraseña desde la pantalla de perfil (estando logueado), para mantener la seguridad de mi cuenta de forma proactiva sin necesidad de pasar por el flujo de recuperación.

---

## 2. Criterios de Aceptación

1. **Ubicación del Formulario**:
   - Se ubica en la pantalla de perfil `/profile`, justo debajo del bloque de datos personales en una sección llamada **"Seguridad de la Cuenta"**.
2. **Campos Requeridos**:
   - El formulario solicita obligatoriamente:
     - **Contraseña Actual** (`current_password`)
     - **Nueva Contraseña** (`new_password`)
     - **Confirmar Nueva Contraseña** (`confirm_password`)
3. **Verificación de Contraseña Actual**:
   - El backend utiliza `verify_password` para comprobar que la contraseña actual sea la correcta frente al hash bcrypt guardado en la base de datos.
   - Si no coincide, retorna `400 Bad Request` indicando: *"La contraseña actual ingresada es incorrecta."*.
4. **Validación de Formato de la Nueva Contraseña**:
   - Debe cumplir con los mismos requisitos del registro de usuario: mínimo 8 caracteres, conteniendo letras y números (alfanumérica).
   - Si no los cumple, muestra errores descriptivos en la interfaz y el backend la rechaza con `400 Bad Request`.
5. **Validación de Confirmación**:
   - La contraseña nueva y su confirmación deben coincidir exactamente.
6. **Éxito y Limpieza**:
   - Al cambiar exitosamente la contraseña, el sistema muestra un mensaje verde flotante de éxito: *"¡Contraseña actualizada con éxito!"*.
   - El formulario se **limpia por completo** (vacía sus campos) para prevenir clicks accidentales repetidos.
   - El usuario mantiene su sesión abierta con su token actual.

---

## 3. Escenarios Gherkin (BDD)

```gherkin
Feature: Cambiar Contraseña desde el Perfil

  Scenario: Cambio de contraseña exitoso
    Given que soy un usuario autenticado
    And me encuentro en la pantalla de perfil "/profile"
    When ingreso mi contraseña actual "PasswordOld1"
    And coloco mi nueva contraseña "PasswordNew2" y su confirmación "PasswordNew2"
    And hago clic en "Actualizar Contraseña"
    Then el sistema realiza una llamada POST a "/api/users/me/change-password"
    And el servidor retorna un código de estado 200 OK
    And la interfaz despliega un mensaje verde: "¡Contraseña actualizada con éxito!"
    And todos los campos del formulario de contraseña se vacían automáticamente

  Scenario: Intento con contraseña actual incorrecta
    Given que soy un usuario autenticado
    And me encuentro en la pantalla de perfil "/profile"
    When ingreso una contraseña actual errónea como "Incorrecta123"
    And coloco mi nueva contraseña "PasswordNew2" y su confirmación "PasswordNew2"
    And hago clic en "Actualizar Contraseña"
    Then el servidor me retorna un código de estado 400 Bad Request
    And la interfaz despliega una alerta de error: "La contraseña actual ingresada es incorrecta."
    And los campos de texto mantienen sus valores intactos para corrección del usuario

  Scenario: Error de formato en la nueva contraseña
    Given que soy un usuario autenticado
    And me encuentro en la pantalla de perfil "/profile"
    When ingreso una contraseña nueva débil como "123" o "sololetras"
    Then el botón "Actualizar Contraseña" se muestra deshabilitado o el frontend muestra errores de validación
    And previene la llamada al servidor hasta cumplir las políticas de seguridad
```

---

## 4. Diseño de Interfaz (Mockup ASCII)

```
+------------------------------------------------------------------------------------+
|  Configuración de Perfil                                                           |
|                                                                                    |
|  +------------------------------------------------------------------------------+  |
|  |  [ Foto/Iniciales: CP ]                                                      |  |
|  |  Nombre Completo: [ Carlos Pérez ]   Correo: [ carlos.perez@genova.ai ]      |  |
|  +------------------------------------------------------------------------------+  |
|                                                                                    |
|  Seguridad de la Cuenta                                                            |
|  Actualiza tu contraseña para mantener tu acceso protegido.                        |
|                                                                                    |
|  +------------------------------------------------------------------------------+  |
|  |  Contraseña Actual:                                                          |  |
|  |  [ **********                                                          ]    |  |
|  |                                                                              |  |
|  |  Nueva Contraseña:                                                           |  |
|  |  [ **********                                                          ]    |  |
|  |  (Mínimo 8 caracteres, al menos 1 letra y 1 número)                         |  |
|  |                                                                              |  |
|  |  Confirmar Nueva Contraseña:                                                 |  |
|  |  [ **********                                                          ]    |  |
|  |                                                                              |  |
|  |  [ Actualizar Contraseña ]                                                   |  |
|  +------------------------------------------------------------------------------+  |
|                                                                                    |
+------------------------------------------------------------------------------------+
```

---

## 5. Contratos de Entrada/Salida de la API

### `POST /api/users/me/change-password` (Cambiar contraseña de cuenta logueada)
- **Método**: `POST`
- **Cabeceras**: `Authorization: Bearer <token>`
- **Cuerpo de Entrada (JSON)**:
```json
{
  "current_password": "PasswordOld1",
  "new_password": "PasswordNew2",
  "confirm_password": "PasswordNew2"
}
```
- **Respuesta Exitosa (200 OK)**:
```json
{
  "message": "Contraseña actualizada con éxito."
}
```
- **Respuesta de Error - Contraseña actual incorrecta (400 Bad Request)**:
```json
{
  "detail": "La contraseña actual ingresada es incorrecta."
}
```
- **Respuesta de Error - Formatos no válidos (400 Bad Request)**:
```json
{
  "detail": "La nueva contraseña debe tener al menos 8 caracteres y contener letras y números."
}
```

---

## 6. Estrategia de Implementación Técnica

### Backend
1. **Modelo de Entrada Pydantic**:
   - Crearemos `UserPasswordChange` en `backend/users/router.py`:
     ```python
     class UserPasswordChange(BaseModel):
         current_password: str = Field(..., description="Contraseña actual")
         new_password: str = Field(..., min_length=8, description="Nueva contraseña alfanumérica")
         confirm_password: str = Field(..., min_length=8, description="Confirmación de nueva contraseña")
     ```
2. **Endpoint `POST /me/change-password`**:
   - Mapeado en `backend/users/router.py` protegido por `get_current_user`.
   - Verifica que `new_password == confirm_password` (sino, `400 Bad Request`).
   - Comprueba que la nueva contraseña tenga formato alfanumérico (ej: `any(c.isalpha() for c in new_password) and any(c.isdigit() for c in new_password)`).
   - Valida la contraseña actual contra el hash guardado usando `verify_password(current_password, current_user.password_hash)`. Si es incorrecta, lanza `HTTPException(400, "La contraseña actual ingresada es incorrecta.")`.
   - Hashea la contraseña nueva mediante `hash_password(new_password)` y actualiza `current_user.password_hash`.
   - Ejecuta `db.commit()` y retorna `{"message": "Contraseña actualizada con éxito."}`.

### Frontend
1. **Formulario en `ProfilePage.jsx`**:
   - Añadiremos una sección `"Seguridad de la Cuenta"` al final de la página.
   - Estados locales: `currentPassword`, `newPassword`, `confirmPassword`.
   - Validaciones de formato y coincidencia en tiempo real.
   - Envía los datos al endpoint `POST /api/users/me/change-password` con token de sesión en cabeceras.
   - Si tiene éxito, limpia los campos del formulario de contraseña y despliega un banner de éxito verde por 5 segundos.
