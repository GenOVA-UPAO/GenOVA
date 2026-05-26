# GenOVA

Plataforma web para la generación asistida por IA de Objetos Virtuales de Aprendizaje (OVA) con exportación SCORM 1.2. Implementa la metodología 5E (ENGAGE y EXPLORE) y empaqueta los resultados como paquetes SCORM listos para subir a un LMS.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 8 + Tailwind CSS 4 + React Router 7 + Sonner |
| Backend | FastAPI 0.122 + SQLAlchemy 2 + Uvicorn + SlowAPI |
| Base de datos | Supabase (PostgreSQL + pgvector) vía `psycopg` |
| Storage | Supabase Storage (`scorm-packages`) — fallback automático a disco local |
| RAG | pgvector + Gemini `gemini-embedding-2-preview` (multimodal: texto + PDF + imagen + audio + video) |
| LLMs | Groq SDK (Llama 3.3 70B, GPT-OSS 120B, Qwen3 32B, Whisper, Orpheus TTS) + OpenRouter (DeepSeek V4 Flash: free & paid fallback) con motor de validación y auto-reparación estructural de HTML |
| Auth | JWT (HS256 con `iat`/`jti`/`iss`) + bcrypt + bloqueo por intentos fallidos |
| Email | SMTP (Gmail por defecto) para restablecimiento de contraseña |
| Empaquetado | pnpm workspaces · Backend con pip **o** uv |

## Requisitos previos

- [Node.js 20+](https://nodejs.org) y [pnpm 10+](https://pnpm.io)
- [Python 3.11+](https://python.org) (pin en `backend/.python-version`)
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

Edita `backend/.env` (mínimo viable):

```env
DATABASE_URL=postgresql+psycopg://postgres.[REF]:[PASSWORD]@[REGION].pooler.supabase.com:5432/postgres?sslmode=require
JWT_SECRET=<mínimo 16 chars; genera con: python -c "import secrets; print(secrets.token_urlsafe(48))">
GROQ_API_KEY=...
OPENROUTER_API_KEY=...

# Opcional — filtra qué modelos expone /api/ova/llm-options
# IDs disponibles: groq-llama-3.3-70b, groq-gpt-oss-120b, groq-qwen3-32b, openrouter-deepseek-v4-flash
OVA_ENABLED_LLMS=
```

> ⚠️ `JWT_SECRET` es obligatorio. El backend **falla al arrancar** si la variable está vacía, contiene un valor débil (`change-me`, `secret`, `test`, `changeme`) o tiene menos de 16 caracteres.

### Supabase Storage (persistencia de OVAs)

Para que los `.zip` SCORM sobrevivan reinicios del backend, configura:

```env
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_STORAGE_BUCKET=scorm-packages
```

Crea el bucket `scorm-packages` **privado** en Supabase Dashboard → Storage. RLS por defecto bloquea el acceso anónimo; el backend usa la service role key (bypass RLS) y emite signed URLs de 1 hora a los clientes. Si no configuras esto, el backend cae automáticamente a disco local (`OVA_OUTPUT_DIR`, default `backend/scorm_output/`) — útil en dev pero los archivos se pierden al reiniciar.

### RAG (opcional)

Si quieres que los archivos subidos alimenten al LLM con contexto:

```env
RAG_EMBEDDER=gemini                # default; alternativas: gemini-001, local
GEMINI_API_KEY=<google-ai-studio>  # free tier: 100 RPM, 1000 RPD por proyecto
```

> Modelo usado: **`gemini-embedding-2-preview`** (Public Preview, Mar 2026).
> Natively multimodal — PDF/imagen/audio/video se embeben directos sin Whisper
> ni vision por separado. Matryoshka truncado a 768-d para encajar en
> `vector(768)`. Fallback estable: `RAG_EMBEDDER=gemini-001` (text-only GA),
> o `RAG_EMBEDDER=local` con `sentence-transformers` (384-d, requiere RAM extra).

Primer arranque: aplica migraciones automáticamente — incluye `CREATE EXTENSION vector`. Verifica con `GET /api/rag/health` → `{ pgvector_ready: true }`.

Para desactivar RAG por completo: `RAG_DISABLED=1`.

### SMTP (restablecimiento de contraseña)

`POST /api/auth/reset-password` consume un token enviado por correo. El sender vive en `backend/auth/email.py`. Override de credenciales:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=tu-cuenta@gmail.com
SMTP_PASSWORD=<app-password sin espacios>
```

> ⚠️ Si `SMTP_USER` / `SMTP_PASSWORD` no están configuradas, el backend lanza `EmailNotConfigured` y registra el fallo — **no envía correos y no tiene credenciales hardcodeadas**.

## Ejecución

### Con Docker (recomendado)

```bash
pnpm dev:docker
```

Levanta frontend (`http://localhost:5173`) y backend (`http://localhost:8000`) en contenedores con hot-reload.

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

# Para incluir herramientas de desarrollo (ruff, pytest, requests, bs4):
uv sync --extra dev
```

`requirements.txt` y `pyproject.toml` están mantenidos en sincronía manual — ambos resuelven al mismo conjunto de dependencias. Usa el que prefieras; si agregas una dep runtime, agrégala a **ambos**.

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
| `pnpm preview` | Previsualiza el build (`http://localhost:4173`) |
| `pnpm lint` | ESLint sobre el frontend (`max-lines: 200`, error) |
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
python tests/test_rag_uploads.py
```

Override env para los tests manuales: `BASE`, `EMAIL`, `PASS`, `PHASE`, `TYPE`, `CONCEPT`.

## Estructura del monorepo

```
GenOVA/
├── frontend/                # React + Vite (ESLint max-lines: 200)
├── backend/                 # FastAPI
│   ├── pyproject.toml       # uv + ruff + pytest config
│   ├── requirements.txt     # pip (sincronizado con pyproject)
│   ├── requirements-dev.txt # pip — extras de desarrollo
│   ├── .python-version      # 3.11 (uv lo lee)
│   ├── auth/                # Login, registro, JWT, reset-password + SMTP
│   ├── ova/                 # Save, listado, edición, regeneración, papelera, duplicar
│   ├── agents/              # 5E: ENGAGE + EXPLORE + LLM router + audio helpers + Pollinations + podcast
│   ├── labs/                # Sandbox de iteración de prompts (admin)
│   ├── rag/                 # Ingesta + retrieval pgvector (multimodal Gemini)
│   ├── roles/               # CRUD de roles y permisos (JSONB)
│   ├── users/               # Perfil propio + administración de usuarios
│   ├── scorm/               # Empaquetado SCORM 1.2 (template + service)
│   ├── storage/             # Wrapper de Supabase Storage (signed URLs)
│   ├── uploads/             # Subida temporal de archivos (alimenta RAG)
│   ├── migrations/          # SQL 001–014 aplicados al arrancar
│   ├── rate_limit.py        # SlowAPI shared limiter
│   ├── security.py          # bcrypt + JWT + dummy-hash timing defense
│   ├── main.py              # Entry point (CORS, logging, lifespan, registro de routers)
│   ├── seed.py              # Roles + usuarios de prueba
│   └── tools/prompt_lab.py  # Utilidad CLI para probar prompts (fuera de la API)
├── scorm-template/          # Plantilla base SCORM
├── deploy/                  # Nginx para producción
├── docs/LABS.md             # Spec funcional de la pestaña Labs
├── ARCHITECTURE.md          # Documento arquitectónico extendido
├── CLAUDE.md                # Guía para Claude Code (contexto detallado del repo)
├── .editorconfig            # Estilo universal (LF, UTF-8, 2/4 spaces)
└── docker-compose.yml
```

## Convenciones de código

- **Máx 200 líneas por archivo** (frontend ESLint hard error, backend convención). Única excepción: `backend/tools/prompt_lab.py` (CLI manual, fuera de la API).
- **Capa de servicios separada de hooks y páginas**: `services/*.js` hace `fetch`, `hooks/*.js` mantiene estado, `pages/*.jsx` solo orquesta layout.
- **Mobile-first**: alturas en `vh` con `min-h`/`max-h`, modales en bottom-sheet en mobile y centrados en `sm+`, tablas con `overflow-x-auto` y `min-w-[…]` por columna.

## Funcionalidades principales

- **Crear OVA**: prompt + (opcional) archivos de apoyo → elige hasta **4 recursos por fase** (ENGAGE + EXPLORE) → genera secuencialmente con reintentos automáticos individuales en el frontend y estados en vivo (`generando`, `reintentando`, `done`, `failed`) → validador de calidad HTML y auto-reparación estructural y de SCORM en el backend → guarda parciales (si algún recurso falla) y empaqueta todo en un único paquete SCORM con un recurso navegable por cada selección exitosa.
- **Mis OVAs**: listado con búsqueda/paginación, edición de fases, regeneración de fases con agentes LLM reales (a través de `resource_type_id` y título), versión activa y descarga SCORM, duplicar, mover a papelera.
- **Papelera**: soft-delete con restauración individual o masiva.
- **Perfil**: edición de datos personales (incluye `university_id`, `gender`, `phone_number`) y cambio de contraseña.
- **Administración (solo `administrador`)**:
  - `/admin/roles` — CRUD de roles y sus permisos (JSONB), con flujo de "eliminar y reasignar".
  - `/admin/users` — listado de usuarios y asignación de roles.
  - `/admin/labs` — sandbox de prompts: edita, ejecuta contra 1–2 modelos en paralelo, compara, marca ganadores, exporta como SCORM, pide al LLM una versión mejorada del prompt.

## Endurecimiento de seguridad

- **JWT_SECRET** validado en arranque (hard-fail si débil o `<16` chars).
- **Hash dummy** en `login` para igualar tiempos entre "usuario inexistente" y "contraseña incorrecta" → no enumeración por timing.
- **Pydantic** `LoginRequest` / `RegisterRequest` con `EmailStr` y `Field(max_length=128)` sobre password (anti-DoS bcrypt, que trunca a 72 bytes igual).
- **Rate-limit** vía SlowAPI: `/login` 10/min, `/register` 5/min, `/reset-password` 10/min por IP.
- **JWT extendido** con `iat`, `jti`, `iss=genova` (preparado para revocación vía blocklist).
- **CORS** restringido a métodos `GET/POST/PATCH/PUT/DELETE/OPTIONS` y headers `Authorization, Content-Type, Accept, X-Requested-With`.
- **Lockout**: 5 intentos fallidos → 15 min bloqueo.
- **Fallback chain LLM**: errores recuperables (rate-limit, 402, 5xx) caen a un modelo Groq de respaldo en lugar de exponer el fallo al cliente.
- **Reset tokens no se devuelven al cliente.** Los endpoints de reset (correo + WhatsApp) generan un token largo (`secrets.token_urlsafe(32)`) y solo devuelven la URL de entrega (correo encolado o `wa.me` share link). El admin que dispara la operación nunca ve el token.
- **Sin secretos hardcodeados.** `auth/email.py` exige `SMTP_USER` / `SMTP_PASSWORD` vía env; si faltan, lanza `EmailNotConfigured` y registra el fallo (no envía).
- **Errores de BD nunca se filtran**. Todos los routers usan helpers `commit_or_500()` que loguean `logger.exception(...)` y responden con mensaje genérico.

## Endpoints de salud

```
GET /health
GET /api/health
GET /api/db/health
GET /api/agents/health
GET /api/rag/health
GET /api/scorm/health
GET /api/ova/health
GET /api/uploads/health
```

## Seed de desarrollo

Al iniciar el backend por primera vez se ejecuta `seed.py` automáticamente, creando los roles del sistema (`administrador`, `usuario`) y cuentas de prueba:

- `admin@genova.ai` / `admin1234password`
- `user@genova.ai` / `user1234password`

> Las contraseñas son alfanuméricas y ≥ 8 caracteres a propósito para que pasen la validación del flujo de reset.
