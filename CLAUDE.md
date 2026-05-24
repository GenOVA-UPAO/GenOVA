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

Applied automatically on backend startup via `run_migrations()` in `main.py`'s lifespan. Migration files live in `backend/migrations/` (001 through 012). To add a migration, create the next numbered `.sql` file — it will be applied on next startup. Run manually: `python run_migrations.py` from `backend/`.

Key migrations:
- `010_pgvector.sql` — enables the `vector` extension (required for RAG).
- `011_rag_chunks.sql` — RAG chunk store with `vector(768)` embeddings.
- `012_ova_storage_key.sql` — adds `ovas.storage_key` for Supabase Storage object keys.

### Health endpoints

```
GET /health
GET /api/health
GET /api/db/health
GET /api/agents/health
GET /api/rag/health
GET /api/scorm/health
```

## Architecture

### Backend — FastAPI

**Entry point**: `backend/main.py`
Startup sequence: `run_migrations()` → `Base.metadata.create_all()` → `seed_db()`. Registers all routers. Configures `logging.basicConfig()` (level via `LOG_LEVEL` env, default `INFO`) and attaches the shared `slowapi.Limiter`.

Some routers are mounted at two prefixes for legacy compatibility:
`auth` at `/api/auth` + `/auth`, `roles` at `/api/roles` + `/roles`, `users` at `/api/users` + `/users`.

**Models** (`backend/models.py`): `User`, `Ova`, `OvaVersion`, `OvaPhase`, `Session`, `Role`, `UserRole`, `PasswordResetToken` — all UUIDs, PostgreSQL dialect (JSONB for role permissions). Soft-delete on `Ova` via `deleted_at`; queries must filter `deleted_at IS NULL` for active records.

**Auth** (`backend/auth/`):
- `dependencies.py`: `get_current_user` (Bearer JWT) and `require_admin` (role-name check) FastAPI dependencies.
- `router.py`: `LoginRequest` / `RegisterRequest` Pydantic models with `EmailStr` and `Field(min_length=…, max_length=128)`. Login uses a dummy bcrypt hash for nonexistent users to equalize timing (anti-enumeration). Lockout: 5 failed attempts → 15 min via `failed_login_attempts` + `locked_until`.
- `security.py`: bcrypt + JWT. **Hard-fails on import** if `JWT_SECRET` is missing, in `{"", "change-me", "secret", "test"}`, or shorter than 16 chars. JWTs include `iat`, `exp`, `iss="genova"`, `jti=uuid4()` — ready for token revocation via a blocklist table when needed.

**Rate limiting** (`backend/rate_limit.py`):
- Single `Limiter` keyed by client IP (`get_remote_address`). Endpoints decorate with `@limiter.limit("N/minute")`. Auth endpoints: `/login` 10/min, `/register` 5/min. Routers that need the limiter import `from rate_limit import limiter` and must include `request: Request` as a parameter on the limited endpoint.

**CORS** (in `main.py`): `allow_methods=["GET","POST","PATCH","PUT","DELETE","OPTIONS"]`, `allow_headers=["Authorization","Content-Type","Accept","X-Requested-With"]`. Origins from a hardcoded localhost list + comma-separated `CORS_ORIGINS` env var.

**OVA lifecycle**:
| Module | Prefix | Responsibility |
|---|---|---|
| `ova/router.py` | `/api/ova` | `POST /save`, `GET /{id}/scorm`, `GET /llm-options` |
| `ova/edit_router.py` | `/api/ovas` | Phase saves; includes `edit_view_router` + `regen_router` as sub-routers |
| `ova/edit_view_router.py` | `/api/ovas` | Read OVA detail + active version for editor |
| `ova/regen_router.py` | `/api/ovas` | Trigger regen on existing OVA |
| `ova/regen_service.py` | — | Background thread: create new `OvaVersion`, rebuild SCORM zip |
| `ova/history_router.py` | `/api/ovas` | List OVAs, version history |
| `ova/manage_router.py` | `/api/ovas` | Metadata update, permanent delete |
| `ova/duplicate_router.py` | `/api/ovas` | Copy existing OVA |
| `ova/trash_router.py` | `/api/ovas` | Soft-delete / restore |
| `ova/trash_batch_router.py` | `/api/ovas` | Batch trash operations |
| `scorm/service.py` | — | `build_scorm_zip_bytes()` assembles manifest, HTML, JS, CSS |

**Versioning invariant**: `OvaVersion` has a partial unique index — only one `is_active = TRUE` version per OVA. Edits always create a new version and deactivate the prior one.

**SCORM persistence**: When `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set (production), zips upload to the `scorm-packages` private bucket under key `{user_id}/{ova_id}_v{N}.zip`; `Ova.storage_key` stores the key. `GET /api/ova/{id}/scorm` returns a **302 redirect** to a 1-hour signed URL — Render free tier cannot proxy zip bytes concurrently. If storage is unconfigured (dev), the backend falls back to local disk at `OVA_OUTPUT_DIR` (default `backend/scorm_output/`) and `Ova.file_path` is populated. Legacy OVAs with only `file_path` keep working.

**Storage wrapper** lives in `backend/storage/supabase_storage.py` (`upload_zip`, `signed_url`, `delete_zip`, `is_configured`). The `supabase` Python SDK is loaded lazily so dev environments without the dep still boot.

**Agents** (`backend/agents/`) — Metodología 5E resource generation:
- `llm_router.py`: routes tasks using `groq` SDK + `openai` client → OpenRouter. Task→model: `texto`→Groq llama-3.3-70b, `codigo`→OpenRouter **deepseek/deepseek-v4-flash:free** (LiveCodeBench 91.6 / SWE-bench 79.0 — replaced qwen3-coder which couldn't follow nested HTML rules), `orquestador`→Groq gpt-oss-120b (`reasoning_effort=medium`), `razonamiento`→Groq qwen3-32b. Groq capped at 3500 `max_completion_tokens` (6000 TPM free tier). Rate-limit fallback: 2 retries with backoff (3s, 8s) on the alternate provider. Extra: `generar_vision()` (llama-4-scout), `transcribir_audio()` (Whisper STT, **25 MB** free-tier limit), `generar_audio_tts()` (Orpheus WAV). `generar_texto_with_model()` accepts arbitrary `model_id`+`provider` (used by Labs).
- `engage_router.py`: POST `/api/agents/engage/generate` — 10 resource types for ENGAGE. Resource 2 is labelled "Storyboard de Video" (no real video generation). Resource 3 (podcast) HTML-escapes the monologue before embedding. Resource 9 uses the `texto` task (was `orquestador` — reverted: not worth the cost).
- `explore_router.py`: POST `/api/agents/explore/generate` — 10 resource types for EXPLORE.
- Most resources follow a two-step pattern: text/JSON generation → HTML generation via code agent. Response: `{resource_json, html_content}`. `utils.parse_json()` is tolerant: tries direct parse, then walks balanced-bracket spans for the first valid object/array.
- 500 errors return a generic message — the raw LLM response is logged via `logger.exception()` but never leaked to the client.
- Pollinations image fetch (`images.py`) has a 25s timeout per image; falls back to a 1×1 SVG placeholder on failure.
- Quality specs for HTML output live in `backend/tests/specs/resource_quality_spec.py`.

**Labs** (`backend/labs/`) — Admin prompt-iteration tool; full spec in `docs/LABS.md`:
- Allows admins to edit prompts, run them against 1–2 models in parallel, compare results, and activate a winning prompt version.
- Activated prompt versions override hardcoded Python prompts in `engage_router.py` / `explore_router.py` at generation time — no deploy needed.
- DB tables: `prompt_versions` (template with `{concept}` placeholder, partial unique index for `is_active` per phase+type), `lab_results`. Added by migration 008; migration 009 drops a legacy table.

**RAG pipeline** (`backend/rag/`) — fed by uploads, retrieved by ENGAGE/EXPLORE:
- Ingestion runs inline in `POST /api/uploads/temp` via `pipeline.ingest_upload`. Best-effort: failures are reported in the response body's `rag_status` field but never block the upload.
- **Multimodal binary path** (PDF, image, audio, video): file bytes are passed directly to `GeminiEmbedder.embed_file(data, mime_type)` which returns ONE 768-d vector for the whole file (no Whisper/vision/OCR step). One row is inserted into `rag_chunks` with placeholder text `[Archivo multimodal: <filename>]` and the multimodal embedding.
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
- Stored at `backend/uploads/{user_id}/` temporarily, claimed on generation start, then deleted.

**Other routers**: `rag/router.py` (stub), `roles/`, `users/`, `uploads/`.

**Dev tool**: `backend/tools/prompt_lab.py` — manual LLM prompt testing utility, not part of the API; exempted from line limits.

### Frontend — React 19 + Vite

**Routing** (`frontend/src/App.jsx`): All routes declared here. `AdminRoute` component fetches `/api/auth/me` to check `role === 'administrador'`; redirects to `/dashboard` otherwise. Token expiry is polled every 60 s.

Active routes:
```
/login                    → LoginPage          (public)
/register                 → RegisterPage       (public)
/dashboard                → DashboardPage
/crear-ova                → CrearOvaPage
/mis-ovas                 → MisOvasPage
/mis-ovas/:ovaId/editar   → EditarOvaPage
/papelera                 → PapeleraPage
/profile                  → ProfilePage
/metodologia/engage       → EngagePage
/metodologia/explore      → ExplorePage
/admin/roles              → AdminRolesPage     (AdminRoute)
/admin/users              → AdminUsersPage     (AdminRoute)
/admin/labs               → LabsPage           (AdminRoute)
```

**Layout**: `AppLayout` wraps authenticated pages with `Navbar` + collapsible `Sidebar` + `<Outlet />`. `Sidebar` listens to `matchMedia('(min-width: 1024px)')` so it reacts to live resize / device rotation. `Navbar` has a hamburger that toggles a mobile menu using `SidebarMenu`. Admin pages share the same layout, gated by `AdminRoute`.

**Auth pages**: `LoginPage` and `RegisterPage` use `autoComplete="email"` / `autoComplete="current-password"` / `autoComplete="new-password"` + `name=` attributes so password managers work. Submit buttons render an inline spinner while submitting.

**Notifications**: `sonner` `<Toaster>` mounted in `App.jsx` at `position="top-right"` with `richColors` and `closeButton`.

**Key hooks** (`frontend/src/hooks/`) — every file kept under 200 lines (ESLint `max-lines`):

| Hook | Responsibility |
|---|---|
| `useOvaCreation` | Full creation wizard flow |
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
ovaCreationService.js   → /api/ova/*
llmOptionsService.js    → /api/ova/llm-options
engageService.js        → /api/agents/engage/*
exploreService.js       → /api/agents/explore/*
ovaHistoryService.js    → /api/ovas/:id/versions
ovaEditService.js       → /api/ovas/:id/phases
uploadService.js        → /api/uploads/temp
labsService.js          → /api/labs/*
```

**Auth utils** (`lib/auth.js`): `getToken()`, `saveToken()`, `clearToken()`, `decodeToken()`, `isTokenExpired()`. Token stored under key `genova_token` in `localStorage`. Migration to httpOnly cookie is a known follow-up (XSS hardening).

> Supabase is used **only as a Postgres database** via `DATABASE_URL` from the backend. There is no `@supabase/supabase-js` (browser SDK) dependency — storage/auth/realtime are not used.

**Other lib utilities**:
- `lib/permissions.js` — `AVAILABLE_PERMISSIONS` constant (permission strings)
- `lib/roleUtils.js` — `getRoleColorClasses(roleName)` → Tailwind classes per role
- `lib/labQuality.js` — `checkHtmlQuality(html)` → `{cdn_ok, scorm_ok, min_length_ok, char_count}` (mirrors server-side checks; used for live badges in Labs UI)

**Code style**: Prettier enforces `printWidth: 100`, `singleQuote: true`, `semi: false`, `trailingComma: "es5"`. ESLint enforces max 200 lines per file (error). `.editorconfig` at repo root enforces LF, UTF-8, 2-space (4-space for `*.py`, tabs for `Makefile`).

### Environment variables

**Backend** (`backend/.env`):
```
DATABASE_URL=postgresql+psycopg://...supabase.com.../postgres?sslmode=require
JWT_SECRET=                             # REQUIRED — ≥16 chars, no weak defaults
JWT_ALGORITHM=HS256
JWT_EXPIRES_MINUTES=1440
LOG_LEVEL=INFO
OVA_GENERATION_DURATION_SECONDS=14      # simulated generation duration
OVA_OUTPUT_DIR=                         # local-disk fallback for SCORM zips
OVA_MAX_GENERATED_IMAGES=2
UPLOAD_MAX_FILES=5
UPLOAD_MAX_FILE_SIZE_MB=20
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
RAG_EMBEDDER=gemini                     # 'gemini' (default) or 'local'
GEMINI_API_KEY=                         # required when RAG_EMBEDDER=gemini
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=150
RAG_MAX_CHUNKS_PER_FILE=100
RAG_TOP_K=5
RAG_MAX_CONTEXT_CHARS=6000
RAG_DISABLED=                           # set to 1 to skip RAG pipeline
CORS_ORIGINS=                           # comma-separated extra allowed origins
```

LLM catalog IDs live in `backend/ova/llm_helpers.py:LLM_CATALOG` — currently
`groq-llama-3.3-70b`, `groq-gpt-oss-120b`, `groq-qwen3-32b`, `openrouter-qwen3-coder`. The actual `codigo` task in `agents/llm_router.py` uses **`deepseek/deepseek-v4-flash:free`** (the catalog ID is cosmetic for the UI picker — update it later if you want to expose deepseek there).

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
- `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are server-only. Never expose to the frontend bundle (no `VITE_*` aliasing).
- RAG chunks are scoped to `user_id` via FK; retrieval queries filter by `upload_id` which the user must own. Don't widen the retrieval predicate.
