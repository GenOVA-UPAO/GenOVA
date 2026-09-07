# GenOVA

Plataforma web para la generación asistida por IA de Objetos Virtuales de Aprendizaje (OVA) con exportación SCORM 1.2. Implementa la metodología 5E completa (ENGAGE, EXPLORE, EXPLAIN, ELABORATE, EVALUATE) y empaqueta los resultados como paquetes SCORM listos para subir a un LMS.

## Contenido

- [Stack](#stack)
- [Requisitos previos](#requisitos-previos)
- [Configuración de entorno](#configuración-de-entorno)
- [Ejecución](#ejecución)
- [Scripts disponibles](#scripts-disponibles-raíz)
- [Comandos backend](#comandos-backend)
- [Estructura del monorepo](#estructura-del-monorepo)
- [Convenciones de código](#convenciones-de-código)
- [Funcionalidades principales](#funcionalidades-principales)
- [Cómo funciona la generación (5E)](#cómo-funciona-la-generación-5e)
- [Rutas del frontend](#rutas-del-frontend)
- [Endurecimiento de seguridad](#endurecimiento-de-seguridad)
- [Endpoints de salud](#endpoints-de-salud)
- [CI/CD](#cicd)
- [Seed de desarrollo](#seed-de-desarrollo)

> **Documentación histórica, specs y convenciones** viven en el bául Obsidian
> `GenOVA` (`Documents/Bóvedas/GenOVA`), fuera del repositorio. Este README es el
> único overview que se mantiene aquí.

## Verificación

Git hooks vía **Husky** (`pnpm install` los activa con el script `prepare`):

| Hook | Qué corre |
|---|---|
| `pre-commit` | `lint-staged` — ESLint `--fix` + Prettier sobre los archivos **staged** del frontend |
| `commit-msg` | `commitlint` — exige Conventional Commits (`tipo(scope): asunto`) |
| `pre-push` | lint frontend + Vitest + `ruff` backend; BDD del backend solo si responde en `:8000` |

Saltar un hook puntualmente: `git commit --no-verify` / `git push --no-verify`.

Ejecución manual de cualquiera de los pasos:

```bash
pnpm lint                              # ESLint frontend
pnpm --filter frontend test            # Vitest (componentes)
pnpm test:unit                         # BDD unit (cucumber-js)
cd backend && ruff check . && pytest   # lint + tests backend
sh .husky/pre-push                     # la verificación completa de una vez
```

Smoke tests manuales (playwright-cli, bloques A–F):
[`tests/playwright-smoke/SMOKE_TESTS.md`](tests/playwright-smoke/SMOKE_TESTS.md).

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Angular 22 (standalone + OnPush + zoneless) + Tailwind CSS 4 + SpartanUI (helm vendored en `libs/ui`) + Signal Forms + Sonner. Tests de componente con Vitest + `@testing-library/angular` |
| Backend | FastAPI + SQLAlchemy 2 + Uvicorn + SlowAPI. SSE (`sse-starlette`) para progreso; cola durable **arq + Redis** (opcional) con worker separado; observabilidad **Logfire** (opt-in) + Sentry |
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

# Producción — orígenes permitidos (CORS). Obligatorio si ENV=production.
CORS_ORIGINS=https://tu-dominio.com

# Auth — desactiva el fallback Authorization: Bearer una vez todos los clientes usan cookies
AUTH_ACCEPT_BEARER=1   # default 1 (acepta); pon 0 en producción cuando estés listo

# Pool de conexiones (Supabase Transaction pooler, puerto 6543)
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=10
```

> ⚠️ `JWT_SECRET` es obligatorio. El backend **falla al arrancar** si la variable está vacía, contiene un valor débil (`change-me`, `secret`, `test`, `changeme`) o tiene menos de 16 caracteres.
>
> ⚠️ Usa el pooler de **Transacciones** de Supabase (puerto `6543`), no el de Sesiones. El pooler de sesiones es incompatible con `pool_pre_ping=True` bajo carga.

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

Levanta frontend (`http://localhost:4200`) y backend (`http://localhost:8000`) en contenedores con hot-reload.

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

**Despliegue cloud**: la topología recomendada es **frontend → Vercel**, **backend → Render**
y **BD/Storage → Supabase** (Transaction pooler 6543 + bucket `scorm-packages`). La referencia
completa de variables de entorno está en `backend/.env.example` y `frontend/.env.example`.

## Scripts disponibles (raíz)

| Comando | Acción |
|---------|--------|
| `pnpm dev` | Frontend en modo desarrollo |
| `pnpm build` | Build de producción del frontend |
| `pnpm preview` | Previsualiza el build (`http://localhost:4173`) |
| `pnpm lint` | ESLint sobre el frontend (typescript-eslint strict + angular-eslint, max-lines: 250, error) |
| `pnpm format` | Prettier sobre el frontend (vía eslint-plugin-prettier) |
| `pnpm test:unit` | BDD unit (cucumber-js, sin browser/backend; corre TS vía `tsx`) |
| `pnpm --filter frontend test` | Tests de componente (Vitest + Testing Library) |
| `pnpm --filter frontend typecheck` | Chequeo de tipos Angular (`ngc --noEmit`, incluye templates) |
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
├── .github/                 # workflows CI (lint + backend-bdd + frontend-unit → e2e), dependabot, codeql
├── .husky/                  # git hooks: pre-commit (lint-staged), commit-msg (commitlint), pre-push
├── commitlint.config.mjs    # Conventional Commits
├── lint-staged.config.mjs   # ESLint --fix + Prettier sobre archivos staged del frontend
├── frontend/                # Angular 22 (ESLint, 250-line cap)
├── backend/                 # FastAPI
│   ├── pyproject.toml       # uv + ruff + pytest config
│   ├── requirements.txt     # pip (sincronizado con pyproject)
│   ├── requirements-dev.txt # pip — extras de desarrollo
│   ├── .python-version      # 3.11 (uv lo lee)
│   ├── auth/                # Login, registro, JWT, reset-password + SMTP
│   ├── ova/                 # Save, listado, edición, regeneración, papelera, duplicar
│   ├── generation/          # Pipeline de generación 5E
│   ├── llm/                 # Router de LLMs + cadenas de fallback (Groq / OpenRouter)
│   ├── rag/                 # Ingesta + retrieval pgvector (multimodal Gemini)
│   ├── roles/               # CRUD de roles y permisos (JSONB)
│   ├── users/               # Perfil propio + administración de usuarios
│   ├── scorm/               # Empaquetado SCORM 1.2 (template + service)
│   ├── storage/             # Wrapper de Supabase Storage (signed URLs)
│   ├── prometheus/          # Panel de nodos / observabilidad de generación
│   ├── uploads/             # Subida temporal de archivos (alimenta RAG)
│   ├── migrations/          # SQL aplicados al arrancar (auto-migración en lifespan)
│   ├── main.py              # Entry point (CORS, logging, lifespan, registro de routers)
│   ├── worker.py            # Worker arq (cola durable opcional)
│   └── seed.py              # Roles + usuarios de prueba
├── scorm-template/          # Plantilla base SCORM 1.2
├── tests/                   # BDD unit (cucumber-js), e2e (playwright-bdd), a11y, carga
├── .editorconfig            # Estilo universal (LF, UTF-8, 2/4 spaces)
└── docker-compose.yml
```

## Convenciones de código

### Tamaño (cohesión, no un cap de líneas)

Lo que importa es **una sola responsabilidad por unidad**, no un límite de líneas por archivo.

| Nivel | Regla | Umbral | Severidad |
|---|---|---|---|
| Función / método | ESLint `max-lines-per-function` · ruff `PLR0915` + `C901` | ~30 líneas / 30 statements / complejidad 10 | error (por dominio ya migrado); `warn` en el resto |
| Nº de argumentos | ESLint `max-params` · ruff `PLR0913` | 4–6 | warn |
| Clase | ESLint `max-classes-per-file` | 1 por archivo | error (frontend, tras Fase 4) |
| Archivo / módulo | ESLint `max-lines` · `backend/scripts/check_module_size.py` | 400 | warn — dispara revisión, no rompe build |

Excepciones: `*.spec.ts` / `tests/**`; `backend/prometheus/**` (motor LangGraph) y ficheros de datos (`*_data.py`, catálogos).

### Arquitectura

- **Backend — hexagonal estricto por dominio** (`backend/<dominio>/`):
  `domain/` (entidades puras + value objects + errores + políticas; sin `fastapi`/`sqlalchemy`/`pydantic`) →
  `application/` (puertos, DTOs, casos de uso) →
  `infrastructure/` (ORM, mappers, repos SQLAlchemy) · `interface/http/` (routers FastAPI, schemas).
  `container.py` cablea la DI de FastAPI. Fronteras enforced con **`import-linter`**
  (`backend/pyproject.toml` → `[tool.importlinter]`; `lint-imports` en `pre-push` y CI).
  Cross-dominio solo vía `<dominio>/__init__.py`.
- **Frontend — features + fronteras enforced** (`eslint-plugin-boundaries`, en `warn` durante
  el refactor): `feature` → `core` / su propia feature (nunca otra feature); `core` → `core`
  (nunca `feature`); `app` → cualquiera.
- **Sin barrel files** en el frontend (`eslint-plugin-no-barrel-files`, hard error): nada de
  `index.ts` que solo re-exporta ni `export { X } from …`; se importa del módulo fuente. Los
  subpath de `@spartan-ng/helm` están exentos.
- **Capa de servicios separada de componentes** (frontend): `services/*.ts` hace `fetch` y
  mantiene estado con signals; los componentes/páginas standalone solo orquestan layout.
- **Mobile-first**: alturas en `vh` con `min-h`/`max-h`, modales en bottom-sheet en mobile y
  centrados en `sm+`, tablas con `overflow-x-auto` y `min-w-[…]` por columna.

## Funcionalidades principales

- **Crear OVA**: prompt + (opcional) archivos de apoyo → elige hasta **4 recursos por fase** (ENGAGE + EXPLORE) → genera secuencialmente con reintentos automáticos individuales en el frontend y estados en vivo (`generando`, `reintentando`, `done`, `failed`) → validador de calidad HTML y auto-reparación estructural y de SCORM en el backend → guarda parciales (si algún recurso falla) y empaqueta todo en un único paquete SCORM con un recurso navegable por cada selección exitosa.
- **Mis OVAs**: listado con búsqueda/paginación, edición de fases, regeneración de fases con agentes LLM reales (a través de `resource_type_id` y título), versión activa y descarga SCORM, duplicar, mover a papelera.
- **Papelera**: soft-delete con restauración individual o masiva.
- **Perfil**: edición de datos personales (incluye `university_id`, `gender`, `phone_number`) y cambio de contraseña.
- **Administración (solo `administrador`)**:
  - `/admin/roles` — CRUD de roles y sus permisos (JSONB), con flujo de "eliminar y reasignar".
  - `/admin/users` — listado de usuarios y asignación de roles.

## Cómo funciona la generación (5E)

GenOVA aplica la metodología **5E** completa (**ENGAGE, EXPLORE, EXPLAIN, ELABORATE,
EVALUATE**), cada fase con **10 tipos de recurso** (cómic, podcast, gamificación, dilema
ético, escape room, simulador…).
El backend genera con LLMs reales en un pipeline `texto → JSON → HTML`, valida y auto-repara
el HTML (incluye callbacks SCORM), recurre a una **cadena de fallback** entre proveedores
(Groq + OpenRouter) y empaqueta todo en un único SCORM 1.2. Opcionalmente ancla la generación
con **RAG** (archivos del usuario) e inserta imágenes (HF FLUX.1-schnell) y audio (TTS Groq).

## Rutas del frontend

Angular Router (`frontend/src/app/app.routes.ts`). Las rutas protegidas exigen sesión
(`authGuard`); las admin exigen rol `administrador` (`adminGuard`).

| Ruta | Página | Acceso |
|---|---|---|
| `/login`, `/register` | Login / Registro | Público |
| `/forgot-password`, `/reset-password`, `/verify-email` | Recuperación / verificación | Público |
| `/dashboard` | Dashboard | Protegido |
| `/crear` | Crear OVA (workspace en modo creación) | Protegido |
| `/mis-ovas` | Mis OVAs (listado/búsqueda) | Protegido |
| `/workspace/:id` | Workspace del OVA (edición) | Protegido |
| `/papelera` | Papelera (soft-delete) | Protegido |
| `/profile` | Perfil | Protegido |
| `/models` | Catálogo y asignación de modelos LLM | Protegido |
| `/explore`, `/engage/:id` | Playground público de fases 5E | Público |
| `/admin` | Gestión de usuarios | Admin |
| `/admin/roles` | CRUD de roles y permisos | Admin |

## Endurecimiento de seguridad

- **JWT_SECRET** validado en arranque (hard-fail si débil o `<16` chars).
- **Hash dummy** en `login` para igualar tiempos entre "usuario inexistente" y "contraseña incorrecta" → no enumeración por timing.
- **Pydantic** `LoginRequest` / `RegisterRequest` con `EmailStr` y `Field(max_length=128)` sobre password (anti-DoS bcrypt, que trunca a 72 bytes igual).
- **Rate-limit** vía SlowAPI: `/login` 10/min, `/register` 5/min, `/reset-password` 10/min por IP.
- **JWT extendido** con `iat`, `jti`, `iss=genova` (preparado para revocación vía blocklist).
- **CORS** restringido a métodos `GET/POST/PATCH/PUT/DELETE/OPTIONS` y headers `Authorization, Content-Type, Accept, X-Requested-With`.
- **Lockout**: 5 intentos fallidos → 15 min bloqueo.
- **Fallback chain LLM**: errores recuperables (rate-limit, 402, 5xx) caen a un modelo Groq de respaldo en lugar de exponer el fallo al cliente.
- **Reset tokens no se devuelven al cliente.** El endpoint de reset por correo genera un token largo (`secrets.token_urlsafe(32)`) y solo confirma que el correo fue encolado. El admin que dispara la operación nunca ve el token.
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

> **API completa** (~70 endpoints): con el backend corriendo, Swagger interactivo en
> `http://localhost:8000/docs` y ReDoc en `/redoc`.

## CI/CD

Push o PR a `develop` / `main` dispara el pipeline en paralelo:

```
lint ──────────────────┐
backend-bdd ───────────┼──→ e2e
frontend-unit (BDD) ───┘
```

Secrets requeridos en el repositorio CI:

| Secret | Descripción |
|---|---|
| `TEST_DATABASE_URL` | PostgreSQL de test (no usar la BD de producción) |
| `TEST_JWT_SECRET` | Secret JWT para los tests (mínimo 16 chars) |

## Seed de desarrollo

Al iniciar el backend por primera vez se ejecuta `seed.py` automáticamente, creando los roles del sistema (`administrador`, `usuario`) y cuentas de prueba:

- `admin@genova.ai` / `admin1234password`
- `user@genova.ai` / `user1234password`

> Las contraseñas son alfanuméricas y ≥ 8 caracteres a propósito para que pasen la validación del flujo de reset.
