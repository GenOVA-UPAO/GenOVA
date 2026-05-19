# GenOVA

Plataforma web para la generación asistida por IA de Objetos Virtuales de Aprendizaje (OVA) con exportación SCORM 1.2.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS + React Router |
| Backend | FastAPI + SQLAlchemy + Uvicorn |
| Base de datos | Supabase (PostgreSQL) |
| Auth | JWT + bcrypt |
| Empaquetado | pnpm workspaces |

## Requisitos previos

- [Node.js 20+](https://nodejs.org) y [pnpm 10+](https://pnpm.io)
- [Python 3.11+](https://python.org)
- [Docker + Docker Compose](https://docs.docker.com/get-docker/) *(solo para ejecución con Docker)*
- Proyecto activo en [Supabase](https://supabase.com) con la URL de conexión a PostgreSQL

## Configuración de entorno

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

Edita `backend/.env` con tus credenciales reales:

```env
DATABASE_URL=postgresql+psycopg://postgres.[REF]:[PASSWORD]@[REGION].pooler.supabase.com:5432/postgres?sslmode=require
JWT_SECRET=un-secreto-seguro
OVA_ENABLED_LLMS=openai,gemini,claude
```

## Ejecución

### Con Docker (recomendado)

```bash
pnpm dev:docker
```

Levanta frontend (`http://localhost:5173`) y backend (`http://localhost:8000`) en contenedores.

### Sin Docker

**Backend:**

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend** *(otra terminal, desde la raíz):*

```bash
pnpm install
pnpm dev
```

### Producción

```bash
pnpm prod:docker
```

Usa `docker-compose.prod.yml` con Nginx como gateway en el puerto `80`. Las rutas `/api/*` se redirigen al backend y `/*` al frontend estático.

## Scripts disponibles (raíz)

| Comando | Acción |
|---------|--------|
| `pnpm dev` | Frontend en modo desarrollo |
| `pnpm build` | Build de producción del frontend |
| `pnpm lint` | ESLint sobre el frontend |
| `pnpm format` | Prettier sobre el frontend |
| `pnpm dev:docker` | Levanta todo con Docker (dev) |
| `pnpm prod:docker` | Levanta todo con Docker (prod) |

## Estructura del monorepo

```
GenOVA/
├── frontend/          # React + Vite
├── backend/           # FastAPI
│   ├── auth/          # Login, registro, JWT
│   ├── ova/           # Generación, edición, historial, SCORM
│   ├── roles/         # CRUD de roles y permisos
│   ├── users/         # Perfil y administración de usuarios
│   ├── scorm/         # Empaquetado SCORM 1.2
│   ├── uploads/       # Manejo de archivos
│   ├── main.py        # Punto de entrada
│   └── seed.py        # Roles y usuarios de prueba por defecto
├── scorm-template/    # Plantilla base SCORM
├── deploy/            # Configuración Nginx para producción
└── docker-compose.yml
```

## Endpoints de salud

```
GET /health
GET /api/health
GET /api/db/health
GET /api/agents/health
GET /api/rag/health
GET /api/scorm/health
```

## Seed de desarrollo

Al iniciar el backend por primera vez se ejecuta `seed.py` automáticamente, creando los roles del sistema (`administrador`, `usuario`) y cuentas de prueba.
