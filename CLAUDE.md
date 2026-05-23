# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

GenOVA — web platform for AI-assisted generation of Virtual Learning Objects (OVA) with SCORM 1.2 export. Built as a pnpm monorepo.

## Commands

### Frontend (from repo root)

```bash
pnpm install          # Install all frontend deps
pnpm dev              # Vite dev server → http://localhost:5173
pnpm build            # Production build
pnpm preview          # Preview prod build locally → http://localhost:4173
pnpm lint             # ESLint
pnpm format           # Prettier
```

### Backend (from `backend/`)

```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Full stack with Docker

```bash
pnpm dev:docker    # Dev (hot-reload, ports 5173 + 8000)
pnpm prod:docker   # Prod (Nginx on port 80, /api/* → backend)
```

### Backend tests (from `backend/`)

```bash
# Smoke test — hits live API, backend must be running
pip install requests
python tests/test_agents_io.py

# Quality gate — checks generated HTML structure and content
pip install requests beautifulsoup4
python tests/test_resource_quality.py

# Override defaults for either test:
BASE=http://localhost:8000 EMAIL=admin@genova.ai PASS=admin1234password python tests/test_agents_io.py

# Filter quality test by phase/type:
PHASE=engage TYPE=1 CONCEPT="Redes neuronales" python tests/test_resource_quality.py
```

No pytest config exists; run via Python directly. Both tests authenticate against the live API.

### DB seed

Runs automatically on backend startup via `seed.py`. Creates `administrador` and `usuario` roles plus two test accounts:

- `admin@genova.ai` / `admin1234password`
- `user@genova.ai` / `user1234password`

### SQL migrations

Applied automatically on backend startup via `run_migrations()` in `main.py`'s startup hook. Migration files live in `backend/migrations/` (001 through 009). To add a migration, create the next numbered `.sql` file — it will be applied on next startup. Run manually: `python run_migrations.py` from `backend/`.

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
Startup sequence: `run_migrations()` → `Base.metadata.create_all()` → `seed_db()`. Registers all routers.

Some routers are mounted at two prefixes for legacy compatibility:  
`auth` at `/api/auth` + `/auth`, `roles` at `/api/roles` + `/roles`, `users` at `/api/users` + `/users`.

**Models** (`backend/models.py`): `User`, `Ova`, `OvaVersion`, `OvaPhase`, `Session`, `Role`, `UserRole`, `PasswordResetToken` — all UUIDs, PostgreSQL dialect (JSONB for role permissions). Soft-delete on `Ova` via `deleted_at`; queries must filter `deleted_at IS NULL` for active records.

**Auth** (`backend/auth/`):
- `dependencies.py`: `get_current_user` (Bearer JWT) and `require_admin` (role-name check) FastAPI dependencies.
- Tokens issued via `security.py` (PyJWT + bcrypt). `JWT_EXPIRES_MINUTES` default 1440.
- Brute-force protection: `failed_login_attempts` + `locked_until` on `User`.

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

**Versioning invariant**: `OvaVersion` has a partial unique index — only one `is_active = TRUE` version per OVA. Edits always create a new version and deactivate the prior one. SCORM zips saved to `backend/scorm_output/{ova_id}_v{N}.zip` (override with `OVA_OUTPUT_DIR` env var).

**Agents** (`backend/agents/`) — Metodología 5E resource generation:
- `llm_router.py`: routes tasks using `groq` Python SDK (Groq) + `openai` client pointing at OpenRouter. Task→model: `texto`→Groq llama-3.3-70b, `codigo`→OpenRouter qwen3-coder, `orquestador`→Groq gpt-oss-120b (`reasoning_effort=medium`), `razonamiento`→Groq qwen3-32b (`reasoning_effort=default`). Groq caps at 3500 `max_completion_tokens` (6000 TPM free tier). OpenRouter uses `max_tokens`. Rate-limit fallback: Groq 429 → `llama-3.1-8b-instant`; arbitrary-model 429 → OpenRouter free Llama 3.3 70B. Extra: `generar_vision()` (llama-4-scout, image RAG), `transcribir_audio()` (Whisper STT, **25 MB** free-tier limit), `generar_audio_tts()` (Orpheus WAV). `generar_texto_with_model()` accepts arbitrary `model_id` + `provider` — used by Labs.
- `engage_router.py`: POST `/api/agents/engage/generate` — 10 resource types for ENGAGE phase.
- `explore_router.py`: POST `/api/agents/explore/generate` — 10 resource types for EXPLORE phase.
- Most resources follow a two-step pattern: text/JSON generation → HTML generation via code agent. Response: `{resource_json, html_content}`.
- Quality specs for HTML output (min length, no CDN, SCORM callbacks, required tags) live in `backend/tests/specs/resource_quality_spec.py`.

**Labs** (`backend/labs/`) — Admin prompt-iteration tool; full spec in `docs/LABS.md`:
- Allows admins to edit prompts, run them against 1–2 models in parallel, compare results, and activate a winning prompt version.
- Activated prompt versions override hardcoded Python prompts in `engage_router.py` / `explore_router.py` at generation time — no deploy needed.
- `catalog.py`: `AVAILABLE_MODELS` list + `quality_check_html()`.
- `prompt_utils.py`: `get_base_prompt()`, `get_active_prompt()`, `build_improve_prompt()`.
- `generation.py`: per-thread workers, `_lab_jobs` dict, `start_lab_job()`, `get_job_results()`.
- `router.py`: prompt CRUD (`GET /api/labs/models`, `GET/POST /api/labs/prompts`, `PUT/DELETE /api/labs/prompts/{id}/activate`).
- `generation_routes.py`: generation + AI-improve + SCORM + results endpoints (`POST /api/labs/generate`, `GET /api/labs/generate/{job_id}/results`, `POST /api/labs/improve-prompt`, `GET /api/labs/results`).
- DB tables: `prompt_versions` (template with `{concept}` placeholder, partial unique index for `is_active` per phase+type), `lab_results` (HTML output, quality checks, timing). Added by migration 008; migration 009 drops a legacy table.

**File uploads** (`backend/uploads/`):
- Allowed: PDF, DOCX, PPTX; MP3, WAV, M4A, OGG, WebM; JPEG, PNG, GIF, WebP.
- Limits: 50 MB/file, 5 files/request (`MAX_FILES_PER_REQUEST` env var).
- Stored at `backend/uploads/{user_id}/` temporarily, claimed on generation start, then deleted.

**Other routers**: `rag/router.py` (stub), `roles/`, `users/`, `uploads/`.

**Dev tool**: `backend/tools/prompt_lab.py` — manual LLM prompt testing utility, not part of the API.

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

**Layout**: `AppLayout` wraps authenticated pages with `Navbar` + collapsible `Sidebar` + `<Outlet />`. Admin pages share the same layout, gated by `AdminRoute`.

**Notifications**: `sonner` `<Toaster>` mounted in `App.jsx` at `position="top-right"` with `richColors` and `closeButton`.

**Key hooks** (`frontend/src/hooks/`):

| Hook | Responsibility |
|---|---|
| `useOvaCreation` | Full creation wizard flow |
| `ovaGenerationHelpers` | Generation job helpers, LLM selection, progress polling |
| `useOvaList` | List, search, pagination, batch actions |
| `useOvaMetadata` | Rename / edit OVA metadata |
| `useOvaUploads` | File upload state for OVA creation |
| `usePhaseGeneration` | Single-phase resource generation |
| `useEngageGeneration` | Wrapper of `usePhaseGeneration` for ENGAGE |
| `useRegenEditor` | Phase regen from editor |
| `useTrashList` | Trash (papelera) list and restore |
| `useProfile` | User profile view/edit |
| `useRoles` / `useUsersAdmin` | Admin page data |
| `useLabGeneration` | Labs: model selection, parallel generation, winner picking |
| `useLabPrompt` | Labs: prompt text state, versions CRUD |

**Services** (`frontend/src/services/`): All read JWT via `getToken()` and send `Authorization: Bearer <token>`.

```
ovaCreationService.js   → /api/ova/*
engageService.js        → /api/agents/engage/*
exploreService.js       → /api/agents/explore/*
ovaHistoryService.js    → /api/ovas/:id/versions
ovaEditService.js       → /api/ovas/:id/phases
uploadService.js        → /api/uploads/temp
labsService.js          → /api/labs/*
```

**Auth utils** (`lib/auth.js`): `getToken()`, `saveToken()`, `clearToken()`, `decodeToken()`, `isTokenExpired()`. Token stored under key `genova_token` in `localStorage`.

**Other lib utilities**:
- `lib/supabaseClient.js` — Supabase client for file storage
- `lib/permissions.js` — `AVAILABLE_PERMISSIONS` constant (permission strings)
- `lib/roleUtils.js` — `getRoleColorClasses(roleName)` → Tailwind classes per role
- `lib/labQuality.js` — `checkHtmlQuality(html)` → `{cdn_ok, scorm_ok, min_length_ok, char_count}` (mirrors server-side quality checks; used for live badges in Labs UI)

**Code style**: Prettier enforces `printWidth: 100`, `singleQuote: true`, `semi: false`, `trailingComma: "es5"`. ESLint enforces max 200 lines per file.

### Environment variables

**Backend** (`backend/.env`):
```
DATABASE_URL=postgresql+psycopg://...supabase.com.../postgres?sslmode=require
JWT_SECRET=
JWT_ALGORITHM=HS256
JWT_EXPIRES_MINUTES=1440
OVA_ENABLED_LLMS=openai,gemini,claude   # controls LLM picker in UI (catalog: openai|gemini|claude)
MIN_PROMPT_CHARS=10
OVA_GENERATION_DURATION_SECONDS=14      # simulated generation duration
OVA_GENERATION_JOB_TTL_SECONDS=300
OVA_OUTPUT_DIR=                         # defaults to backend/scorm_output/
MAX_FILES_PER_REQUEST=5
GROQ_API_KEY=
OPENROUTER_API_KEY=
APP_URL=https://genova.ai               # sent as HTTP-Referer to OpenRouter for app attribution
CORS_ORIGINS=                           # comma-separated extra allowed origins
```

**Frontend** (`frontend/.env`):
```
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_MIN_PROMPT_CHARS=10
```
