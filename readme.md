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
