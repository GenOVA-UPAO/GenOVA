# GENOVA

Monorepo base del proyecto GENOVA.

## Estructura principal

```text
GENOVA/
├── frontend/
├── backend/
├── docs/
├── specs/
├── deploy/
└── scorm-template/
```

## Workspace con pnpm

Se usa `pnpm-workspace.yaml` para gestionar paquetes del monorepo:
- `frontend`
- `backend`

## Frontend base

Stack actual del frontend:
- React + Vite
- Tailwind CSS (vía `@tailwindcss/vite`)
- ESLint + Prettier
- React Router

## Backend base (EN-011)

Stack backend inicial:
- FastAPI
- Uvicorn
- CORS habilitado para frontend local

Estructura backend:

```text
backend/
├── agents/
│   └── router.py
├── rag/
│   └── router.py
├── scorm/
│   └── router.py
├── main.py
├── requirements.txt
├── Dockerfile
└── Dockerfile.prod
```

Endpoints de salud:
- `GET /health`
- `GET /api/health`
- `GET /api/agents/health`
- `GET /api/rag/health`
- `GET /api/scorm/health`

## HU-004 implementada

Se dejó configurada la base del monorepo y arquitectura de frontend:
- Carpetas `frontend/`, `backend/`, `docs/`
- Workspace de pnpm en raíz
- React + Tailwind operativo
- ESLint con regla estricta `max-lines` en error (`max: 200`)
- Prettier configurado

## HU-010 implementada

Se maquetó el layout principal y enrutamiento modular:

### Rutas base
- `/login`
- `/dashboard`
- `/crear-ova`

### Layout responsivo
- `Navbar`
- `Sidebar`
- `MainContainer`

### Modularidad
Los componentes del layout están separados en módulos pequeños dentro de:
- `frontend/src/layout/components/`
- `frontend/src/layout/navigation/`
- `frontend/src/layouts/`

Ningún componente de layout supera el umbral de líneas definido por ESLint.

## Orquestación Docker (EN-011)

### Entorno local
Archivo: `docker-compose.yml`

Servicios:
- `frontend` (Vite, puerto `5173`)
- `backend` (FastAPI, puerto `8000`)

Comando:

```bash
pnpm dev:docker
```

### Entorno productivo inicial (opción 3)
Archivo: `docker-compose.prod.yml`

Servicios:
- `frontend` (build estático servido por Nginx interno)
- `backend` (FastAPI en modo prod)
- `nginx` gateway externo con reverse proxy

Reglas de enrutamiento del gateway:
- `/api/*` -> backend
- `/*` -> frontend

Comando:

```bash
pnpm prod:docker
```

Configuración de gateway:
- `deploy/nginx/default.conf`

## Scripts desde raíz

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm format
pnpm dev:docker
pnpm prod:docker
```

## HU-004 exportación SCORM (entregable Canvas)

Se implementó exportación SCORM 1.2 de prueba desde la vista `/crear-ova`.

### Frontend
- Botón visible: **Exportar SCORM**
- Ubicación: `frontend/src/pages/CrearOvaPage.jsx`
- Acción: llama `POST http://localhost:8000/api/scorm/export` y descarga `ova-scorm.zip`

### Backend
- Endpoint: `POST /api/scorm/export`
- Módulo: `backend/scorm/router.py`
- Servicio generador zip en memoria: `backend/scorm/service.py`

### Estructura del zip generado
```text
ova-scorm.zip
├── imsmanifest.xml
├── index.html
└── resources/
    ├── content.html
    ├── styles.css
    ├── scorm.js
    └── app.js
```

### Registro de progreso LMS
`resources/scorm.js` y `resources/app.js` incluyen comunicación básica SCORM 1.2:
- `LMSInitialize`
- `LMSSetValue` (`cmi.core.lesson_status`, `cmi.core.score.raw`)
- `LMSCommit`
- `LMSFinish`

Esto deja el paquete listo para validación formal en **TA-005 (SCORM Cloud)**.

## SCORM template

Se mantiene una plantilla base en `scorm-template/` con `imsmanifest.xml`, `index.html` y `resources/styles.css` para empaquetado SCORM posterior.

## EN-008 implementada

Se habilitó la base de datos para gestión de usuarios con Supabase (PostgreSQL) y SQLAlchemy.

Incluye:
- Modelos ORM para tablas: `users`, `ovas`, `sessions`, `roles`, `user_roles`, `password_reset_tokens`.
- Migración SQL inicial en `backend/migrations/001_init.sql`.
- Conexión ORM desde `backend/database.py` (usa `DATABASE_URL` desde `.env`).
- Endpoint de verificación DB: `GET /api/db/health`.

Variables de entorno (ejemplo):
- Backend: `backend/.env.example`.
- Frontend (Vite + Supabase): `frontend/.env.example`.

## HU-001 implementada

Se implementó el registro de cuentas de usuario en la plataforma.

Incluye:
- **Frontend**: Vista de registro en `/register` ([RegisterPage.jsx]) con validaciones visuales de contraseñas seguras y campos obligatorios.
- **Backend**: Endpoint de registro `POST /api/auth/register` en [backend/auth/router.py], que realiza hashing seguro de contraseña con `bcrypt` e ingresa al usuario a la base de datos de manera única.

## HU-008 implementada

Se implementó el inicio de sesión de usuarios con credenciales y gestión de perfil activo.

Incluye:
- **Frontend**: Vista de inicio de sesión en `/login` ([LoginPage.jsx]) con almacenamiento seguro del token JWT en `localStorage`.
- **Backend**:
  - Endpoint de autenticación `POST /api/auth/login` en [backend/auth/router.py] que valida credenciales y retorna un token JWT firmado.
  - Endpoint de perfil `/api/auth/me` para obtener los datos de la cuenta autenticada y su rol activo.

## HU-018, HU-019, HU-020, HU-021 implementadas (Gestión de Roles y Permisos)

Se implementó el sistema completo de administración de roles, permisos de plataforma y asignación a cuentas individuales desde el panel de control del administrador.

Incluye:
- **HU-018 (Crear Rol)**:
  - Formulario de creación de roles en el panel `/admin/roles` ([AdminRolesPage.jsx]).
  - Endpoint `POST /api/roles` en [backend/roles/router.py] que valida nombres y persiste permisos.
- **HU-019 (Editar Rol)**:
  - Modal adaptativo que precarga datos y permisos actuales del rol para su actualización en caliente en la misma interfaz.
  - Endpoint `PATCH /api/roles/{id}` con validación estricta de nombres duplicados e inmutabilidad de roles del sistema.
- **HU-020 (Eliminar Rol)**:
  - Modal interactivo de borrado simple (si tiene 0 usuarios) o de reasignación obligatoria (si tiene > 0 usuarios).
  - Endpoint `DELETE /api/roles/{id}` que realiza una transacción atómica migrando usuarios del rol viejo al nuevo de forma segura en `user_roles` antes de eliminar el registro de rol para evitar inconsistencias.
- **HU-021 (Asignar Rol a Usuario)**:
  - Pantalla de administración de usuarios en `/admin/users` ([AdminUsersPage.jsx]) que muestra una tabla paginada con selectores desplegables inteligentes por cada usuario.
  - Endpoint `PATCH /api/users/{id}/role` en [backend/users/router.py] que asocia el nuevo rol al usuario en la base de datos de manera atómica.
  - **Seguridad Activa**: Mecanismo de auto-bloqueo en frontend y backend que impide que el administrador en sesión se despoje de su propio rol administrativo por error.
- **Seeder de Desarrollo**:
  - Script automático `backend/seed.py` para poblar roles de sistema por defecto (`administrador`, `usuario`) y cuentas de prueba de desarrollo.

## HU-015 implementada

Se implementó la configuración del perfil personal para todos los usuarios registrados en la plataforma.

Incluye:
- **Frontend**: Vista de perfil en `/profile` ([ProfilePage.jsx]) que permite editar el Nombre Completo y Correo Electrónico. Presenta iniciales de avatar dinámicas y validaciones locales.
- **Backend**: Endpoint de perfil `PATCH /api/users/me` en [backend/users/router.py] que procesa y valida los cambios de forma segura, con verificación de unicidad de correo.
- **Navegación**: Enlaces de navegación unificados en [navLinks.js] y barra del administrador en [AdminLayout.jsx].

## HU-016 implementada

Se implementó el cambio de contraseña en caliente desde la pantalla del perfil personal del usuario.

Incluye:
- **Frontend**: Formulario dedicado en la sección "Seguridad de la Cuenta" dentro de `/profile` ([ProfilePage.jsx]) que solicita contraseña actual, nueva contraseña y confirmación. Realiza validaciones alfanuméricas de formato locales y limpia todos los campos tras completarse con éxito.
- **Backend**: Endpoint seguro `POST /api/users/me/change-password` en [backend/users/router.py] que comprueba la contraseña actual mediante comparaciones de hash bcrypt y guarda de forma atómica el nuevo hash en base de datos.
## Mejoras de UX/UI: Sistema de Notificaciones Toast (Sonner)

Se implementó un sistema unificado y moderno para el *feedback* visual de operaciones en la plataforma (éxitos, errores) reemplazando alertas antiguas e intrusivas.

### Instalación
La librería instalada en el frontend es `sonner`:
```bash
pnpm add sonner
```

### Configuración e Integración
- **Global**: El componente `<Toaster />` está instanciado a nivel de raíz en `frontend/src/App.jsx`. Configurado en posición `top-right` y con diseño de colores mejorado (`richColors`).
- **Uso en páginas**:
  Importado desde `sonner`, se utiliza el objeto `toast` para emitir notificaciones:
  ```javascript
  import { toast } from 'sonner'
  
  // Ejemplos de uso:
  toast.success('¡Operación realizada con éxito!')
  toast.error('Ocurrió un error en el proceso.')
  ```
- **Vistas implementadas**:
  - `ProfilePage.jsx`: Al actualizar datos y cambiar contraseñas.
  - `AdminRolesPage.jsx`: Al crear, editar o eliminar roles del sistema.
  - `AdminUsersPage.jsx`: Al reasignar roles entre usuarios.
