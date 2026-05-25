# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

GenOVA — web platform for AI-assisted generation of Virtual Learning Objects (OVA) with SCORM 1.2 export. Built as a pnpm monorepo. Backend supports both `pip` and `uv` workflows.

## Commands

### Frontend (from repo root)

```bash
pnpm install          # Install all frontend deps
pnpm dev              # Vite dev server → http://localhost:5173
pnpm build            # Production build
pnpm preview          # Preview prod build locally → http://localhost:4173
pnpm lint             # ESLint (max-lines: 200, error)
pnpm format           # Prettier check
```

### Backend with `pip` (from `backend/`)

```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt          # runtime only
pip install -r requirements-dev.txt      # + ruff, pytest, requests, bs4
uvicorn main:app --reload --port 8000
```

### Backend with `uv` (from `backend/`)

`pyproject.toml` mirrors `requirements.txt` under `[project.dependencies]`. Dev tools live under `[project.optional-dependencies.dev]`. `.python-version` pins to 3.11. Both workflows must stay in sync — if you add a runtime dep, add it to BOTH files.

```bash
uv sync                          # runtime deps from pyproject.toml
uv sync --extra dev              # + ruff, pytest, requests, bs4
uv run uvicorn main:app --reload --port 8000
uv run ruff check .
uv run pytest
```

### Lint + format (backend)

```bash
ruff check .         # lint (E, F, W, I, B, UP, S, SIM)
ruff format .        # format
ruff check --fix .   # autofix
```

Config lives in `backend/pyproject.toml` under `[tool.ruff]`.

### Full stack with Docker

```bash
pnpm dev:docker    # Dev (hot-reload, ports 5173 + 8000)
pnpm prod:docker   # Prod (Nginx on port 80, /api/* → backend)
```

### Backend tests (from `backend/`)

```bash
# Smoke + quality tests hit the live API. Backend must be running.
pytest                                       # discovers tests/test_*.py
python tests/test_agents_io.py               # manual smoke
python tests/test_resource_quality.py        # HTML quality gate
```

Both manual tests authenticate against the live API. Override defaults via env: `BASE`, `EMAIL`, `PASS`, `PHASE`, `TYPE`, `CONCEPT`.

### DB seed

Runs automatically on backend startup via `seed.py`. Creates `administrador` + `usuario` roles plus two test accounts:

- `admin@genova.ai` / `admin1234password`
- `user@genova.ai` / `user1234password`

### SQL migrations

Applied automatically on backend startup via `run_migrations()` in `main.py`'s lifespan. Migration files live in `backend/migrations/` (001 through 013). To add a migration, create the next numbered `.sql` file — it will be applied on next startup. Run manually: `python run_migrations.py` from `backend/`.

Key migrations:
- `010_pgvector.sql` — enables the `vector` extension (required for RAG).
- `011_rag_chunks.sql` — RAG chunk store with `vector(768)` embeddings.
- `012_ova_storage_key.sql` — adds `ovas.storage_key` for Supabase Storage object keys.
- `013_user_extended_profile_fields.sql` — adds `users.university_id`, `gender`, `phone_number`.

### Health endpoints

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

## Architecture

### Backend — FastAPI

**Entry point**: `backend/main.py`
Startup sequence: `run_migrations()` → `Base.metadata.create_all()` → `seed_db()` → `purge_expired()` RAG chunks (best-effort). Registers all routers. Configures `logging.basicConfig()` (level via `LOG_LEVEL` env, default `INFO`) and attaches the shared `slowapi.Limiter`.

Some routers are mounted at two prefixes for legacy compatibility:
`auth` at `/api/auth` + `/auth`, `roles` at `/api/roles` + `/roles`, `users` at `/api/users` + `/users`.

**Models** (`backend/models.py`): `User`, `Ova`, `OvaVersion`, `OvaPhase`, `Session`, `Role`, `UserRole`, `LabResult`, `RagChunk`, `PasswordResetToken` — all UUIDs, PostgreSQL dialect (JSONB for role permissions). Soft-delete on `Ova` via `deleted_at`; queries must filter `deleted_at IS NULL` for active records. `User` carries extended profile fields (`university_id`, `gender`, `phone_number`) on top of auth state.

**Auth** (`backend/auth/`):
- `dependencies.py`: `get_current_user` (Bearer JWT), `require_admin` (role-name check) and `require_permission(perm)` (JSONB `permissions` contains check, falls back to admin bypass) FastAPI dependencies.
- `router.py`: `LoginRequest` / `RegisterRequest` Pydantic models with `EmailStr` and `Field(min_length=…, max_length=128)`. Login uses a dummy bcrypt hash for nonexistent users to equalize timing (anti-enumeration). Lockout: 5 failed attempts → 15 min via `failed_login_attempts` + `locked_until`. Endpoints: `POST /login`, `POST /register`, `GET /me`, `POST /reset-password` (consumes a `PasswordResetToken` row).
- `email.py`: SMTP sender for password-reset emails (`send_reset_email`). Configured via `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` env vars; defaults point at the project's Gmail support inbox.
- `security.py`: bcrypt + JWT. **Hard-fails on import** if `JWT_SECRET` is missing, in `{"", "change-me", "secret", "test"}`, or shorter than 16 chars. JWTs include `iat`, `exp`, `iss="genova"`, `jti=uuid4()` — ready for token revocation via a blocklist table when needed.

**Rate limiting** (`backend/rate_limit.py`):
- Single `Limiter` keyed by client IP (`get_remote_address`). Endpoints decorate with `@limiter.limit("N/minute")`. Auth endpoints: `/login` 10/min, `/register` 5/min. Routers that need the limiter import `from rate_limit import limiter` and must include `request: Request` as a parameter on the limited endpoint.

**CORS** (in `main.py`): `allow_methods=["GET","POST","PATCH","PUT","DELETE","OPTIONS"]`, `allow_headers=["Authorization","Content-Type","Accept","X-Requested-With"]`. Origins from a hardcoded localhost list + comma-separated `CORS_ORIGINS` env var.

**OVA lifecycle**:
| Module | Prefix | Responsibility |
|---|---|---|
| `ova/router.py` | `/api/ova` | `POST /save`, `GET /{id}/scorm`, `GET /llm-options`, `GET /health` |
| `ova/edit_router.py` | `/api/ovas` | `PATCH /{ova_id}/fases/{fase_id}` phase save; includes `edit_view_router` + `regen_router` as sub-routers |
| `ova/edit_view_router.py` | `/api/ovas` | Read OVA detail + active version for editor |
| `ova/regen_router.py` | `/api/ovas` | Trigger regen on existing OVA |
| `ova/regen_service.py` | — | Background thread: create new `OvaVersion`, rebuild SCORM zip |
| `ova/history_router.py` | `/api/ovas` | List OVAs (paginated, admin-aware), version history, `GET /{id}/download`. Includes `trash_router` + `duplicate_router` + `manage_router` |
| `ova/manage_router.py` | `/api/ovas` | Metadata update, permanent delete |
| `ova/duplicate_router.py` | `/api/ovas` | Copy existing OVA |
| `ova/trash_router.py` | `/api/ovas` | Soft-delete / restore |
| `ova/trash_batch_router.py` | `/api/ovas` | Batch trash operations |
| `scorm/service.py` | — | `build_scorm_zip_bytes()` assembles manifest, HTML, JS, CSS |
| `scorm/router.py` | `/api/scorm` | Only `GET /health` — actual download lives in `ova/router.py` |

**Versioning invariant**: `OvaVersion` has a partial unique index — only one `is_active = TRUE` version per OVA. Edits always create a new version and deactivate the prior one.

**SCORM persistence**: When `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set (production), zips upload to the `scorm-packages` private bucket under key `{user_id}/{ova_id}_v{N}.zip`; `Ova.storage_key` stores the key. `GET /api/ova/{id}/scorm` returns a **302 redirect** to a 1-hour signed URL — Render free tier cannot proxy zip bytes concurrently. If storage is unconfigured (dev), the backend falls back to local disk at `OVA_OUTPUT_DIR` (default `backend/scorm_output/`) and `Ova.file_path` is populated. Legacy OVAs with only `file_path` keep working. The legacy edit path (`PATCH /api/ovas/{id}/fases/{fase_id}`) currently writes only to local disk — Supabase upload is wired on `POST /save` and the regen flow.

**Storage wrapper** lives in `backend/storage/supabase_storage.py` (`upload_zip`, `signed_url`, `delete_zip`, `is_configured`). The `supabase` Python SDK is loaded lazily so dev environments without the dep still boot.

**Agents** (`backend/agents/`) — Metodología 5E resource generation:
- `llm_router.py`: routes tasks using `groq` SDK + `openai` client → OpenRouter. Task→model: `texto`→Groq llama-3.3-70b, `codigo`→OpenRouter **deepseek/deepseek-v4-flash:free** (LiveCodeBench 91.6 / SWE-bench 79.0 — replaced qwen3-coder which couldn't follow nested HTML rules), `orquestador`→Groq gpt-oss-120b (`reasoning_effort=medium`), `razonamiento`→Groq qwen3-32b. Groq capped at 3500 `max_completion_tokens` (6000 TPM free tier). **Per-task fallback chain** in `_FALLBACK_CHAIN`: on any recoverable error (rate limit, 402 insufficient credit, empty content, provider 5xx) the chain is walked with exponential backoff capped at 8 s — last entry is always a Groq safety-net model that almost always responds within the free tier. Extra: `generar_vision()` (llama-4-scout), `transcribir_audio()` (Whisper STT, Groq free-tier cap ~25 MB), `generar_audio_tts()` (Orpheus WAV). `generar_texto_with_model()` accepts arbitrary `model_id`+`provider` (used by Labs). `VIDEO_UNAVAILABLE_MSG` is the canned response when a video resource is requested.
- `engage_router.py`: POST `/api/agents/engage/generate` — 10 resource types for ENGAGE (Cómic Interactivo, Storyboard de Video, Micro-Podcast, Juego de Gamificación, Dilema Ético, Noticia de Impacto, Juego de Roles, Timeline Interactivo, Escape Room Virtual, Simulador Intuitivo). Resource 3 (Micro-Podcast) generates a monologue → Groq Orpheus TTS → embeds base64 WAV in `podcast.py`-built HTML; falls back to text-only with manual completion button if TTS fails. Resource 10 (Simulador) is single-step code generation. All other resources use the two-step text→html pattern. Resources whose JSON exposes `prompt_imagen` fields trigger Pollinations image fetch (first `OVA_MAX_GENERATED_IMAGES` items only, default 2) with `__IMG_N__` placeholder substitution.
- `explore_router.py`: POST `/api/agents/explore/generate` — 10 resource types for EXPLORE (Simulador Virtual Lab, Agente Socrático, Juego Drag & Drop, Video con Pausa Activa, Lectura Interactiva, Simulador de Slider, Experimento Guiado, Juego de Roles, Mapa Mental, Lab de Hipótesis). Types in `CODE_ONLY = {1, 6, 10}` are single-step code generation; the rest follow the two-step text→html pattern.
- Most resources follow a two-step pattern: text/JSON generation → HTML generation via code agent. Response: `{resource_json, html_content}`. `utils.parse_json()` is tolerant: tries direct parse, then walks balanced-bracket spans for the first valid object/array.
- 500 errors return a generic message — the raw LLM response is logged via `logger.exception()` but never leaked to the client.
- Pollinations image fetch (`images.py`) has a 25 s timeout per image; falls back to a 1×1 SVG placeholder on failure.
- Quality specs for HTML output live in `backend/tests/specs/resource_quality_spec.py`.

**Labs** (`backend/labs/`) — Admin prompt-iteration sandbox; full spec in `docs/LABS.md`:
- Lets admins edit prompts, run them against 1–3 models in parallel, compare results, mark winners, export winners as SCORM, and ask the LLM to suggest an improved prompt based on the winner.
- Labs is a **pure sandbox**: there is no DB override of production prompts. The hardcoded Python prompts in `engage_prompts.py` / `explore_prompts.py` are always the source of truth at generation time.
- DB tables: `lab_results` (one row per model run). The legacy `prompt_versions` table was added in migration 008 and dropped in migration 009.
- Routers: `labs/router.py` (`GET /api/labs/models`, `GET /api/labs/prompts/{phase}/{type}`) + `labs/generation_routes.py` (`POST /generate`, `GET /generate/{job_id}/results`, `POST /improve-prompt`, `GET /results/{id}/scorm`, `GET /results`, `PATCH /results/{id}/select`).

**RAG pipeline** (`backend/rag/`) — fed by uploads, retrieved by ENGAGE/EXPLORE:
- Ingestion runs inline in `POST /api/uploads/temp` via `pipeline.ingest_upload`. Best-effort: failures are reported in the response body's `rag_status` field but never block the upload.
- **Multimodal binary path** (PDF, image, audio, video): file bytes are passed directly to `GeminiEmbedder.embed_file(data, mime_type)` which returns ONE 768-d vector for the whole file (no Whisper/vision/OCR step). One row is inserted into `rag_chunks` with placeholder text `[Archivo multimodal: <filename> (<mime>)]` and the multimodal embedding.
- **Text path** (DOCX, PPTX, fallback): `parsers.extract_text()` → `chunker.chunk_text()` (800-char window, 150 overlap, max 100 chunks) → `embedder.embed_batch()` → `store.insert_chunks()`.
- Parsers (`parsers.py`): PDF (`pypdf`, used only when multimodal embedder unavailable), DOCX (`python-docx`), PPTX (`python-pptx`). Audio/image parsers in this module are kept as legacy fallback (call `transcribir_audio` / `generar_vision`) but are NOT invoked when the multimodal embedder is active.
- Embedder is pluggable via `RAG_EMBEDDER`: `gemini` (default, **`gemini-embedding-2-preview`** — Public Preview Mar 2026, natively multimodal: text + image + PDF + audio + video; Matryoshka-truncated to 768-d), `gemini-001` (stable text-only fallback), or `local` (sentence-transformers MiniLM, 384-d — only if Render RAM allows). Dimension change requires reindex.
- Retrieval: `retriever.top_k(db, query, upload_ids, k=5)` runs cosine via pgvector ivfflat index. `build_contexto_usuario(chunks)` formats results for prompt injection.
- Injection: `agents/utils.format_contexto_usuario()` wraps retrieved text in `[CONTEXTO_APORTADO_POR_EL_USUARIO]` tags. All `prompt_texto`/`prompt_html`/`prompt_codigo`/`prompt_simulador` functions accept an optional `contexto_usuario` param; if empty, the block is omitted (no behavior change for users without uploads).
- Lifecycle: chunks expire 1 h after upload unless tied to an OVA via `store.tie_uploads_to_ova()` (called from `save_ova` when `payload.upload_ids` is non-empty). `purge_expired()` runs on backend startup.
- `GET /api/rag/health` reports embedder, vector dim, and pgvector extension state.
- Set `RAG_DISABLED=1` to skip the whole pipeline.

**File uploads** (`backend/uploads/`):
- Allowed: PDF, DOCX, PPTX; MP3, WAV, M4A, AAC, OGG, WebM; JPEG, PNG, GIF, WebP.
- Limits: `UPLOAD_MAX_FILE_SIZE_MB` MB/file (default 20), `UPLOAD_MAX_FILES`/request (default 5).
- Stored at `backend/tmp/uploads/{user_id}/` temporarily (override via `UPLOAD_TEMP_DIR`); TTL defaults to 1 h via `UPLOAD_TEMP_TTL_SECONDS`. The in-memory `_temp_uploads` registry tracks lifetimes; expired entries are pruned on every access.
- Lifecycle: claimed by the OVA-save flow → tied to a generated OVA → deleted on claim or on TTL expiry. Per-file RAG ingestion is triggered inline (see RAG section).

**Other routers**: `rag/router.py` (health + debug `GET /chunks/by-upload/{upload_id}`), `roles/router.py` + `roles/delete_router.py` (CRUD with delete-and-reassign flow), `users/admin_router.py` (admin user management), `users/profile_router.py` (self profile read/edit + change password), `uploads/router.py`.

**Dev tool**: `backend/tools/prompt_lab.py` — manual LLM prompt testing utility, not part of the API; exempted from line limits.

### Frontend — React 19 + Vite

**Routing** (`frontend/src/App.jsx`): All routes declared here. `AdminRoute` component fetches `/api/auth/me` to check `role === 'administrador'`; redirects to `/dashboard` otherwise. Token expiry is polled every 60 s.

Active routes:
```
/login                       → LoginPage          (public)
/register                    → RegisterPage       (public)
/dashboard                   → DashboardPage
/crear-ova                   → CrearOvaPage
/mis-ovas                    → MisOvasPage
/mis-ovas/:ovaId/editar      → EditarOvaPage
/papelera                    → PapeleraPage
/profile                     → ProfilePage
/metodologia/engage          → EngagePage
/metodologia/explore         → ExplorePage
/admin/roles                 → AdminRolesPage     (AdminRoute)
/admin/users                 → AdminUsersPage     (AdminRoute)
/admin/labs                  → LabsPage           (AdminRoute)
```

Uses **react-router v7** (`react-router` package, not `react-router-dom`). `BrowserRouter` wraps `<App />` in `main.jsx`.

**Layout**: `AppLayout` wraps authenticated pages with `Navbar` + collapsible `Sidebar` + `<Outlet />`. `Sidebar` listens to `matchMedia('(min-width: 1024px)')` so it reacts to live resize / device rotation. `Navbar` has a hamburger that toggles a mobile menu using `SidebarMenu`. Admin pages share the same layout, gated by `AdminRoute`. `AdminLayout` exists but admin pages are currently mounted inside `AppLayout`.

**Auth pages**: `LoginPage` and `RegisterPage` use `autoComplete="email"` / `autoComplete="current-password"` / `autoComplete="new-password"` + `name=` attributes so password managers work. Submit buttons render an inline spinner while submitting.

**Notifications**: `sonner` `<Toaster>` mounted in `App.jsx` at `position="top-right"` with `richColors` and `closeButton`.

**Key hooks** (`frontend/src/hooks/`) — every file kept under 200 lines (ESLint `max-lines`):

| Hook | Responsibility |
|---|---|
| `useOvaCreation` | Full creation wizard flow (ENGAGE → EXPLORE → save → optional SCORM export) |
| `useLlmOptions` | Fetches `/api/ova/llm-options` for the LLM engines panel |
| `useOvaList` | List, search, pagination, batch actions — composes `useOvaSelection` + `useOvaMetadata` |
| `useOvaSelection` | Multi-select state for the OVA list |
| `useOvaMetadata` | Rename / edit OVA metadata |
| `useOvaUploads` | File upload state for OVA creation |
| `usePhaseGeneration` | Single-phase resource generation |
| `useEngageGeneration` | Wrapper of `usePhaseGeneration` for ENGAGE |
| `useRegenEditor` | Phase regen from editor |
| `useTrashList` | Trash (papelera) list, single + bulk restore/delete via shared helpers |
| `useProfile` | User profile view/edit — composes `useChangePassword` |
| `useChangePassword` | Change-password form (validation + submit) |
| `useRoles` | Roles CRUD — composes `useRoleDelete` |
| `useRoleDelete` | Delete-with-reassign flow for roles |
| `useUsersAdmin` | Admin user management |
| `useLabGeneration` | Labs: model selection, parallel generation, winner picking |
| `useLabPrompt` | Labs: prompt text state, versions CRUD |

**Services** (`frontend/src/services/`): All read JWT via `getToken()` and send `Authorization: Bearer <token>`.

```
ovaCreationService.js   → /api/ova/* + /api/agents/{engage,explore}/generate
llmOptionsService.js    → /api/ova/llm-options
engageService.js        → /api/agents/engage/*
exploreService.js       → /api/agents/explore/*
ovaHistoryService.js    → /api/ovas/:id/versions
ovaEditService.js       → /api/ovas/:id/fases
uploadService.js        → /api/uploads/temp
labsService.js          → /api/labs/*
```

`downloadOvaScorm()` in `ovaCreationService.js` follows the backend's 302 redirect to Supabase Storage transparently — `fetch` exposes the resulting blob either from the redirect or from the local-disk byte fallback.

**Auth utils** (`lib/auth.js`): `getToken()`, `saveToken()`, `clearToken()`, `decodeToken()`, `isTokenExpired()`. Token stored under key `genova_token` in `localStorage`. Migration to httpOnly cookie is a known follow-up (XSS hardening).

> Supabase is used **only as a Postgres database** via `DATABASE_URL` from the backend. There is no `@supabase/supabase-js` (browser SDK) dependency — storage/auth/realtime are not used. The previous `lib/supabaseClient.js` shim has been removed.

**Other lib utilities**:
- `lib/permissions.js` — `AVAILABLE_PERMISSIONS` constant (permission strings)
- `lib/roleUtils.js` — `getRoleColorClasses(roleName)` → Tailwind classes per role
- `lib/labQuality.js` — `checkHtmlQuality(html)` → `{cdn_ok, scorm_ok, min_length_ok, char_count}` (mirrors server-side checks; used for live badges in Labs UI)

**Frontend deps** (`frontend/package.json`): React 19.2, React Router 7.15, Sonner 2 for toasts. Build: Vite 8, Tailwind CSS 4 via `@tailwindcss/vite`. Lint: ESLint 10 + `eslint-plugin-react-hooks` 7 + `eslint-plugin-react-refresh`.

**Code style**: Prettier enforces `printWidth: 100`, `singleQuote: true`, `semi: false`, `trailingComma: "es5"`. ESLint enforces max 200 lines per file (error). `.editorconfig` at repo root enforces LF, UTF-8, 2-space (4-space for `*.py`, tabs for `Makefile`).

### Environment variables

**Backend** (`backend/.env`):
```
DATABASE_URL=postgresql+psycopg://...supabase.com.../postgres?sslmode=require
JWT_SECRET=                             # REQUIRED — ≥16 chars, no weak defaults
JWT_ALGORITHM=HS256
JWT_EXPIRES_MINUTES=1440
LOG_LEVEL=INFO
OVA_GENERATION_DURATION_SECONDS=14      # simulated generation duration (legacy)
OVA_OUTPUT_DIR=                         # local-disk fallback for SCORM zips
OVA_MAX_GENERATED_IMAGES=2
UPLOAD_MAX_FILES=5
UPLOAD_MAX_FILE_SIZE_MB=20
UPLOAD_TEMP_DIR=                        # override temp upload root (default backend/tmp/uploads)
UPLOAD_TEMP_TTL_SECONDS=3600
OVA_ENABLED_LLMS=                       # comma list of catalog IDs; empty=all
GROQ_API_KEY=
OPENROUTER_API_KEY=
POLLINATIONS_TOKEN=                     # optional, higher image quota
APP_URL=https://genova.ai               # sent as HTTP-Referer to OpenRouter
# Supabase Storage (SCORM zip persistence). SERVICE_ROLE_KEY is server-only.
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=scorm-packages
# RAG (pgvector + embeddings).
RAG_EMBEDDER=gemini                     # 'gemini' (default), 'gemini-001' (text-only fallback), or 'local'
GEMINI_API_KEY=                         # required when RAG_EMBEDDER=gemini*
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=150
RAG_MAX_CHUNKS_PER_FILE=100
RAG_TOP_K=5
RAG_MAX_CONTEXT_CHARS=6000
RAG_DISABLED=                           # set to 1 to skip RAG pipeline
RAG_LOCAL_MODEL=all-MiniLM-L6-v2        # only when RAG_EMBEDDER=local
CORS_ORIGINS=                           # comma-separated extra allowed origins
# SMTP — password-reset emails (defaults point at project Gmail).
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASSWORD=
```

LLM catalog IDs live in `backend/ova/llm_helpers.py:LLM_CATALOG` — currently
`groq-llama-3.3-70b`, `groq-gpt-oss-120b`, `groq-qwen3-32b`, `openrouter-deepseek-v4-flash`. These are surfaced through `GET /api/ova/llm-options`; `OVA_ENABLED_LLMS` filters by `id`. The catalog now matches what `agents/llm_router.py` actually uses for the `codigo` task (DeepSeek V4 Flash).

**Frontend** (`frontend/.env`):
```
VITE_API_BASE_URL=http://localhost:8000
VITE_MIN_PROMPT_CHARS=10
```

## Security notes for code changes

- Never log raw passwords or tokens; never expose raw LLM error messages in HTTP 5xx responses.
- New auth-adjacent endpoints should use Pydantic models with explicit `Field(max_length=…)` bounds. Bcrypt cost is exponential — input length matters.
- New endpoints that take external input should be rate-limited via `@limiter.limit("N/minute")`. Include `request: Request` in the signature or SlowAPI cannot key the limit.
- When adding a JWT claim, update `build_token()` in `auth/router.py` and any verifier in `auth/dependencies.py` together.
- `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, and `SMTP_PASSWORD` are server-only. Never expose to the frontend bundle (no `VITE_*` aliasing).
- RAG chunks are scoped to `user_id` via FK; retrieval queries filter by `upload_id` which the user must own. Don't widen the retrieval predicate.
- `auth/email.py` carries placeholder SMTP credentials hard-coded as fallback defaults — override via env vars in any deployed environment.
