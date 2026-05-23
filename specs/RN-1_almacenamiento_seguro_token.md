# RN-1: Almacenamiento Seguro de Token de Sesión

## Descripción
Migrar el almacenamiento del JWT (`access_token`) desde el almacenamiento local (`LocalStorage` / `Application`) en el navegador del cliente a una Cookie gestionada por el backend con la propiedad `HttpOnly`. Esto mitiga las vulnerabilidades de XSS (Cross-Site Scripting) al evitar que scripts maliciosos de JavaScript accedan al token de sesión. El response de los endpoints de autenticación no expondrá el token en el cuerpo del JSON.

---

## Criterios de Aceptación

### 1. Backend (FastAPI)
- **Emisión del Token en Cookie:**
  - Al autenticarse exitosamente en `POST /api/auth/login` y `POST /api/auth/register`, el token se debe inyectar directamente en las cabeceras de respuesta mediante `Set-Cookie` con la clave `genova_token`.
  - La cookie debe configurarse con los siguientes parámetros de seguridad obligatorios:
    - `httponly=True` (Bloquea el acceso al token desde JavaScript en el navegador).
    - `secure=True` (Asegura el envío solo mediante HTTPS. Debe configurarse para soportar `localhost` en desarrollo).
    - `samesite="lax"` (Protección contra CSRF mientras permite la usabilidad en navegaciones).
    - `max_age=JWT_EXPIRES_MINUTES * 60` (Sincronizado con la duración del token en segundos, 24 horas).
  - El cuerpo de la respuesta del login/registro ya no debe retornar la clave `access_token`. Debe retornar un estado de éxito y los datos del perfil de usuario:
    ```json
    {
      "status": "success",
      "user": {
        "id": "uuid",
        "email": "correo@upao.edu",
        "role": "usuario"
      }
    }
    ```

- **Extracción de Token (Dependencia):**
  - La dependencia de FastAPI `get_current_user` debe modificarse para buscar el token en la cookie `genova_token` enviada por el navegador.
  - Para soporte de desarrollo interactivo (Swagger `/docs`) y compatibilidad temporal, si el token no se encuentra en las cookies, se debe permitir extraerlo desde el header `Authorization: Bearer <token>` como fallback secundario.

- **Endpoint de Cierre de Sesión:**
  - Crear el endpoint `POST /api/auth/logout`.
  - Este endpoint debe eliminar la cookie `genova_token` configurándola con un valor vacío y `max_age=0` (u expiración en el pasado).

### 2. Frontend (React)
- **Interceptor Global de Fetch:**
  - Patchear globalmente `window.fetch` en el punto de entrada de la aplicación (`main.jsx`) para interceptar todas las peticiones salientes.
  - Configurar por defecto `credentials: 'include'` en todas las opciones de fetch, asegurando que el navegador envíe cookies en peticiones CORS/mismo-origen.
  - Filtrar las cabeceras `Authorization: Bearer null` o `Authorization: Bearer undefined` para evitar que se envíen si `getToken()` ya no retorna un string.
  - Interceptar respuestas `401 Unauthorized` (excepto para el login/registro en sí): si ocurre un 401, limpiar el estado de sesión local y redirigir inmediatamente a `/login`.

- **Control de Estado de Sesión Local:**
  - Descontinuar el almacenamiento de JWT en `localStorage`.
  - Almacenar un flag booleano no sensible `genova_is_authenticated = 'true'` en `localStorage` al iniciar sesión. Esto servirá para decidir de forma optimista si se renderizan las vistas protegidas antes de consultar al servidor.
  - El hook `clearToken` debe remover el flag `genova_is_authenticated` y realizar una petición `POST /api/auth/logout` para limpiar la cookie en el backend.
  - Modificar las rutas protegidas (`ProtectedLayout` y `AdminRoute`) para validar la autenticación de forma optimista usando el flag local `isAuthenticated()` y cargando los datos usando `/api/auth/me`.

- **Heartbeat de Sesión:**
  - En la raíz del frontend (`App.jsx`), implementar un chequeo periódico (heartbeat) cada 60 segundos que haga una petición a `/api/auth/me`. Si el backend responde 401 (debido a que la cookie expiró), se limpia la sesión en el cliente y se redirige a `/login`.

---

## Datos de entrada/salida

### POST /api/auth/login
- **Entrada (Body JSON):**
  ```json
  {
    "email": "estudiante@upao.edu",
    "password": "Password123"
  }
  ```
- **Cabeceras de Respuesta:**
  ```http
  Set-Cookie: genova_token=<JWT_TOKEN_STRING>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400
  ```
- **Salida (Body JSON):**
  ```json
  {
    "status": "success",
    "user": {
      "id": "d09b62fb-0ea6-42d7-a5c6-b48ffdf908b8",
      "email": "estudiante@upao.edu",
      "role": "usuario"
    }
  }
  ```

### POST /api/auth/logout
- **Entrada:** Ninguna
- **Cabeceras de Respuesta:**
  ```http
  Set-Cookie: genova_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0
  ```
- **Salida (Body JSON):**
  ```json
  {
    "message": "Sesión cerrada correctamente."
  }
  ```

---

## Flujos alternativos

### Flujo Alternativo 1: Expiración natural de la cookie
Si el usuario deja la aplicación abierta y el JWT expira por tiempo límite en el backend (o la cookie expira), el siguiente fetch periódico (heartbeat de 60 segundos) recibirá un status `401 Unauthorized`. El interceptor global de fetch detectará el 401, removerá el flag local `genova_is_authenticated` y redirigirá al usuario a `/login`.

### Flujo Alternativo 2: Cierre de pestaña y expiración posterior
Si el usuario cierra la pestaña del navegador y la sesión expira en el servidor antes de que vuelva a ingresar, al reabrir la app, el frontend verá el flag `genova_is_authenticated = 'true'` y renderizará la ruta protegida optimistamente. Sin embargo, al dispararse el primer fetch de datos (como `/api/auth/me` para validar al usuario), el servidor responderá `401 Unauthorized` debido a que la cookie ya no es válida. El interceptor global capturará el error, limpiará el LocalStorage y redirigirá a `/login`.
