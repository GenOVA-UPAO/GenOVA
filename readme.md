# GenOVA

Plataforma web para la generación asistida por IA de Objetos Virtuales de Aprendizaje (OVA) con exportación SCORM 1.2.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS + React Router |
| Backend | FastAPI + SQLAlchemy + Uvicorn + SlowAPI |
| Base de datos | Supabase (PostgreSQL + pgvector) |
| Storage | Supabase Storage (SCORM zips) — fallback a disco local |
| RAG | pgvector + Gemini `gemini-embedding-2-preview` (multimodal: texto + PDF + imagen + audio + video) |
| Auth | JWT (HS256, con `iat`/`jti`/`iss`) + bcrypt |
| Empaquetado | pnpm workspaces · Backend con pip **o** uv |

## Requisitos previos

- [Node.js 20+](https://nodejs.org) y [pnpm 10+](https://pnpm.io)
- [Python 3.11+](https://python.org)
- [uv](https://docs.astral.sh/uv/) *(opcional — instala backend más rápido; pip sigue funcionando)*
- [Docker + Docker Compose](https://docs.docker.com/get-docker/) *(solo para ejecución con Docker)*
- Proyecto activo en [Supabase](https://supabase.com) con la URL de conexión a PostgreSQL

## Configuración de entorno

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

Edita `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://postgres.[REF]:[PASSWORD]@[REGION].pooler.supabase.com:5432/postgres?sslmode=require
JWT_SECRET=<mínimo 16 chars; genera con: python -c "import secrets; print(secrets.token_urlsafe(48))">
OVA_ENABLED_LLMS=openai,gemini,claude
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
```

> ⚠️ `JWT_SECRET` es obligatorio. El backend **falla al arrancar** si la variable está vacía, contiene un valor débil (`change-me`, `secret`...) o tiene menos de 16 caracteres.

### Supabase Storage (persistencia de OVAs)

Para que los `.zip` SCORM sobrevivan reinicios del backend, configura:

```env
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_STORAGE_BUCKET=scorm-packages
```

Crea el bucket `scorm-packages` **privado** en Supabase Dashboard → Storage. RLS por defecto bloquea el acceso anónimo; el backend usa la service role key (bypass RLS) y emite signed URLs de 1 hora a los clientes. Si no configuras esto, el backend cae automáticamente a disco local (`OVA_OUTPUT_DIR`) — útil en dev pero los archivos se pierden al reiniciar.

### RAG (opcional)

Si quieres que los archivos subidos alimenten el LLM:

```env
RAG_EMBEDDER=gemini                # default
GEMINI_API_KEY=<google-ai-studio>  # free tier: 100 RPM, 1000 RPD por proyecto
```

> Modelo usado: **`gemini-embedding-2-preview`** (Public Preview, Mar 2026).
> Natively multimodal — PDF/imagen/audio/video se embeben directos sin Whisper
> ni vision por separado. Matryoshka truncado a 768-d para encajar en
> `vector(768)`. Fallback estable: `RAG_EMBEDDER=gemini-001` (text-only GA).

Primer arranque: aplica migraciones (lo hace solo) — incluye `CREATE EXTENSION vector`. Verifica con `GET /api/rag/health` → `{ pgvector_ready: true }`.

Para desactivar RAG por completo: `RAG_DISABLED=1`.

## Ejecución

### Con Docker (recomendado)

```bash
pnpm dev:docker
```

Levanta frontend (`http://localhost:5173`) y backend (`http://localhost:8000`) en contenedores.

### Sin Docker — Backend con `pip`

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

### Sin Docker — Backend con `uv` (más rápido)

```bash
cd backend
uv sync                          # instala desde pyproject.toml
uv run uvicorn main:app --reload --port 8000

# Para incluir herramientas de desarrollo (ruff, pytest):
uv sync --extra dev
```

`requirements.txt` y `pyproject.toml` están mantenidos en sincronía manual — ambos resuelven al mismo conjunto de dependencias. Usa el que prefieras.

### Frontend *(otra terminal, desde la raíz):*

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
| `pnpm lint` | ESLint sobre el frontend (`max-lines: 200`) |
| `pnpm format` | Prettier sobre el frontend |
| `pnpm dev:docker` | Levanta todo con Docker (dev) |
| `pnpm prod:docker` | Levanta todo con Docker (prod) |

## Comandos backend

```bash
# Lint + format (desde backend/)
ruff check .            # con pip: pip install ruff
ruff format .
ruff check --fix .

# Equivalente con uv (sin activar venv)
uv run ruff check .
uv run ruff format .

# Tests
pytest                  # con pip
uv run pytest           # con uv

# Tests manuales contra API en vivo:
python tests/test_agents_io.py
python tests/test_resource_quality.py
```

## Estructura del monorepo

```
GenOVA/
├── frontend/                # React + Vite (ESLint max-lines: 200)
├── backend/                 # FastAPI
│   ├── pyproject.toml       # uv + ruff + pytest config
│   ├── requirements.txt     # pip (sincronizado con pyproject)
│   ├── requirements-dev.txt # pip — extras de desarrollo
│   ├── .python-version      # 3.11 (uv lo lee)
│   ├── auth/                # Login, registro, JWT (Pydantic-validated)
│   ├── ova/                 # Generación, edición, historial, SCORM
│   ├── agents/              # 5E: ENGAGE + EXPLORE + LLM router
│   ├── labs/                # Iteración de prompts (admin)
│   ├── roles/               # CRUD de roles y permisos
│   ├── users/               # Perfil y administración
│   ├── scorm/               # Empaquetado SCORM 1.2
│   ├── uploads/             # Subida temporal de archivos
│   ├── rate_limit.py        # SlowAPI shared limiter
│   ├── security.py          # bcrypt + JWT + dummy-hash timing defense
│   ├── main.py              # Entry point (CORS, logging, lifespan)
│   └── seed.py              # Roles + usuarios de prueba
├── scorm-template/          # Plantilla base SCORM
├── deploy/                  # Nginx para producción
├── .editorconfig            # Estilo universal (LF, UTF-8, 2/4 spaces)
└── docker-compose.yml
```

## Endurecimiento de seguridad

- **JWT_SECRET** validado en arranque (hard-fail si débil).
- **Hash dummy** en `login` para igualar tiempos entre "usuario inexistente" y "contraseña incorrecta" → no enumeración por timing.
- **Pydantic** `LoginRequest` / `RegisterRequest` con `EmailStr` y `Field(max_length=128)` sobre password (anti-DoS bcrypt).
- **Rate-limit** vía SlowAPI: `/login` 10/min, `/register` 5/min por IP.
- **JWT extendido** con `iat`, `jti`, `iss=genova` (preparado para revocación).
- **CORS** restringido a métodos `GET/POST/PATCH/PUT/DELETE/OPTIONS` y headers `Authorization, Content-Type, Accept, X-Requested-With`.
- **Lockout**: 5 intentos fallidos → 15 min bloqueo (existía previo, sin cambios).

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
