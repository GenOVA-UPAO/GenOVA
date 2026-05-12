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

## SCORM template

Se mantiene una plantilla base en `scorm-template/` con `imsmanifest.xml`, `index.html` y `resources/styles.css` para empaquetado SCORM posterior.
