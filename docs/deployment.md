# Despliegue y configuración

## Topología productiva

```
            ┌──────────────┐        ┌──────────────┐
  navegador │   Vercel     │  /api  │    Render    │
  ─────────▶│  (frontend   │───────▶│  (backend    │
            │   estático)  │  XHR   │   FastAPI)   │
            └──────────────┘        └──────┬───────┘
                                           │
                              ┌────────────┴────────────┐
                              │        Supabase         │
                              │  PostgreSQL + pgvector  │
                              │  Storage (scorm-packages)│
                              └─────────────────────────┘
```

| Componente | Host | Artefacto |
|---|---|---|
| Frontend | **Vercel** | `vite build` → estático (`frontend/vercel.json`) |
| Backend | **Render** | `backend/Dockerfile.prod` (uvicorn) |
| Base de datos | **Supabase** | PostgreSQL + pgvector (Transaction pooler, puerto 6543) |
| Storage SCORM | **Supabase Storage** | bucket privado `scorm-packages` (signed URLs) |

> Alternativa todo-en-uno con Docker (Nginx como gateway): ver más abajo.

---

## Frontend en Vercel

- **Build**: `vite build` → `dist/` (definido en `frontend/vercel.json`).
- **Rewrites**: `/(.*) → /index.html` (SPA).
- **Headers**: assets con cache de 1 año `immutable`; raíz `no-cache`; `X-Content-Type-Options`,
  `Referrer-Policy`.
- **Env a setear en Vercel**:
  - `VITE_API_BASE_URL` → origen del backend (ej. `https://genova-api.onrender.com`).
- **Patrones `source`**: usan **path-to-regexp**, no RegExp. Sin grupos no-capturadores
  `(?:...)`; usar grupos capturadores `(...)`. (Causa típica de "Invalid route source pattern".)

> El check **"Supabase Preview"** que aparece en GitHub es la integración de *Branching*:
> se **salta** (`skipped`) si la rama no tiene un PR/branch Supabase asociado. Es normal,
> no es un error. Solo crea DBs efímeras por PR si activas Branching.

## Backend en Render

- **Imagen**: `backend/Dockerfile.prod` (`python:3.12-slim`, `uvicorn main:app --host 0.0.0.0 --port 8000`).
- Las **migraciones se aplican solas** al arrancar (`run_migrations()` en el lifespan).
- `seed.py` crea roles y cuentas de prueba en el primer arranque.
- **Env mínima**: `DATABASE_URL`, `JWT_SECRET`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`,
  `CORS_ORIGINS` (origen de Vercel), `ENV=production`. Storage/RAG/SMTP opcionales (ver tabla).
- Usa el **Transaction pooler** de Supabase (puerto 6543) en free tier; `pool_pre_ping` y
  `pool_recycle=300` sobreviven la evicción de pgbouncer.

## Supabase

- **PostgreSQL + pgvector**: la extensión se crea por migración; no requiere setup manual.
- **Storage**: crea el bucket **privado** `scorm-packages` (Dashboard → Storage). El backend
  usa la **service role key** (bypass RLS) y emite signed URLs de 1 h. Sin esto, cae a disco
  local (`OVA_OUTPUT_DIR`) — útil en dev pero los archivos se pierden al reiniciar.

---

## Alternativa: Docker (gateway Nginx)

```bash
pnpm dev:docker    # dev: frontend :5173 + backend :8000 (hot-reload)
pnpm prod:docker   # prod: Nginx :80 → /api/* al backend, /* al frontend
```

- `docker-compose.yml` (dev) y `docker-compose.prod.yml` (prod).
- Gateway: `deploy/nginx/default.conf` enruta `/api/` y `/health` al backend (`:8000`) y `/`
  al frontend (Nginx sirviendo `dist/`). En prod solo el puerto `80` queda expuesto.

---

## Referencia completa de variables de entorno

Copia las plantillas y edítalas:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Backend (`backend/.env`)

| Variable | Default | Req. | Propósito |
|---|---|:--:|---|
| `DATABASE_URL` | — | ✅ | URL PostgreSQL (Supabase: `postgresql+psycopg://...pooler.supabase.com:6543/postgres?sslmode=require`) |
| `DB_POOL_SIZE` | 10 | | Tamaño del pool SQLAlchemy |
| `DB_MAX_OVERFLOW` | 10 | | Overflow del pool |
| `JWT_SECRET` | — | ✅ | ≥16 chars; hard-fail si débil/vacío |
| `JWT_ALGORITHM` | HS256 | | Algoritmo de firma |
| `JWT_EXPIRES_MINUTES` | 1440 | | Vida del token (min) — 24 h |
| `AUTH_ACCEPT_BEARER` | 1 | | Acepta `Authorization: Bearer` legacy; pon `0` en prod cuando todo use cookies |
| `ENV` | dev | | `dev` / `staging` / `production` (afecta CORS y errores) |
| `CORS_ORIGINS` | (localhost) | ⚠️ | Orígenes frontend permitidos (CSV). **Obligatorio si `ENV=production`** |
| `LOG_LEVEL` | INFO | | Nivel de logging |
| `GROQ_API_KEY` | — | ✅ | LLM primario (texto/razonamiento) + TTS |
| `OPENROUTER_API_KEY` | — | ✅ | LLM de código (DeepSeek) |
| `APP_URL` | https://genova.ai | | `HTTP-Referer` para OpenRouter |
| `LLM_TIMEOUT_S` | 30 | | Timeout por llamada LLM |
| `OVA_ENABLED_LLMS` | (todos) | | CSV de IDs de modelo expuestos al selector |
| `OVA_OUTPUT_DIR` | `backend/scorm_output` | | Carpeta SCORM (fallback disco) |
| `OVA_MAX_GENERATED_IMAGES` | 2 | | Cap de imágenes por recurso |
| `OVA_GENERATION_DURATION_SECONDS` | 14 | | Duración simulada del job (Labs) |
| `POLLINATIONS_TOKEN` | — | | Token Pollinations (más cuota de imágenes) |
| `HF_TOKEN` | — | | Token Hugging Face (fallback FLUX.1-schnell) |
| `HF_IMAGE_MODEL` | `black-forest-labs/FLUX.1-schnell` | | Modelo HF de imagen |
| `SUPABASE_URL` | — | | Proyecto Supabase (habilita Storage) |
| `SUPABASE_SERVICE_ROLE_KEY` | — | | Service role (server-only, **nunca** `VITE_*`) |
| `SUPABASE_STORAGE_BUCKET` | scorm-packages | | Bucket de SCORM |
| `RAG_EMBEDDER` | gemini | | `gemini` (768-d) / `gemini-001` / `local` (384-d) |
| `GEMINI_API_KEY` | — | | Requerido si `RAG_EMBEDDER=gemini*` |
| `RAG_DISABLED` | — | | `1` desactiva RAG por completo |
| `RAG_CHUNK_SIZE` | 800 | | Chars por chunk |
| `RAG_CHUNK_OVERLAP` | 150 | | Solapamiento entre chunks |
| `RAG_MAX_CHUNKS_PER_FILE` | 100 | | Límite de chunks por archivo |
| `RAG_TOP_K` | 5 | | Chunks recuperados por consulta |
| `RAG_MAX_CONTEXT_CHARS` | 6000 | | Máx contexto inyectado al prompt |
| `RAG_LOCAL_MODEL` | `all-MiniLM-L6-v2` | | Modelo local (si `RAG_EMBEDDER=local`) |
| `UPLOAD_MAX_FILES` | 5 | | Máx archivos por request |
| `UPLOAD_MAX_FILE_SIZE_MB` | 20 | | Máx tamaño por archivo (MB) |
| `SMTP_HOST` | smtp.gmail.com | | Servidor SMTP (reset de contraseña) |
| `SMTP_PORT` | 465 | | Puerto SMTP |
| `SMTP_USER` | — | | Cuenta de envío (si falta → `EmailNotConfigured`) |
| `SMTP_PASSWORD` | — | | App Password de Gmail (sin espacios) |
| `LABS_MAX_WORKERS` | 4 | | Workers concurrentes para jobs de Labs |

### Frontend (`frontend/.env`)

| Variable | Default | Propósito |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Base de la API (usada por `frontend/src/lib/http.js`) |
| `VITE_MIN_PROMPT_CHARS` | 10 | Mínimo de caracteres del prompt de creación |
| `VITE_UPLOAD_MAX_FILES` | 5 | Máx archivos por lote de subida |

> ⚠️ Las claves de servidor (`GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`,
> `SUPABASE_SERVICE_ROLE_KEY`) **nunca** llevan prefijo `VITE_` ni se exponen al frontend.

_Fuentes: `backend/.env.example`, `frontend/.env.example`, `os.getenv` en `backend/`,
`frontend/vercel.json`, `docker-compose*.yml`, `deploy/nginx/default.conf`._
