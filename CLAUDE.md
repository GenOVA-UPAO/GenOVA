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
pip install requests
python tests/test_agents_io.py

# Override defaults:
BASE=http://localhost:8000 EMAIL=admin@genova.ai PASS=admin1234password python tests/test_agents_io.py
```

Tests in `backend/tests/test_agents_io.py` hit the live API — the backend must be running. No pytest config exists; run via Python directly.

### DB seed

Runs automatically on backend startup via `seed.py`. Creates `administrador` and `usuario` roles plus two test accounts:

- `admin@genova.ai` / `admin1234password`
- `user@genova.ai` / `user1234password`

### SQL migrations

Applied automatically on backend startup via `run_migrations()` in `main.py`'s startup hook. Migration files live in `backend/migrations/` (001 through 007). To add a migration, create the next numbered `.sql` file — it will be applied on next startup.

## Architecture

### Backend — FastAPI

**Entry point**: `backend/main.py`  
Startup sequence: `run_migrations()` → `Base.metadata.create_all()` → `seed_db()`. Registers all routers.

**Models** (`backend/models.py`): `User`, `Ova`, `OvaVersion`, `OvaPhase`, `Session`, `Role`, `UserRole`, `PasswordResetToken` — all UUIDs, PostgreSQL dialect (JSONB for role permissions). Soft-delete on `Ova` via `deleted_at`; queries must filter `deleted_at IS NULL` for active records.

**Auth** (`backend/auth/`):
- `dependencies.py`: `get_current_user` (Bearer JWT) and `require_admin` (role-name check) FastAPI dependencies.
- Tokens issued via `security.py` (PyJWT + bcrypt). `JWT_EXPIRES_MINUTES` default 1440.

**OVA lifecycle**:
| Module | Prefix | Responsibility |
|---|---|---|
| `ova/generation_router.py` | `/api/ova` | Start generation job, poll progress |
| `ova/edit_router.py` | `/api/ovas` | Trigger regen on existing OVA |
| `ova/regen_service.py` | — | Background thread: create new `OvaVersion`, rebuild SCORM zip |
| `ova/history_router.py` | `/api/ovas` | Version history |
| `ova/duplicate_router.py` | `/api/ovas` | Copy existing OVA |
| `ova/trash_router.py` | `/api/ovas` | Soft-delete / restore |
| `scorm/service.py` | — | `build_scorm_zip_bytes()` assembles manifest, HTML, JS, CSS |

**Generation job pattern**: In-memory dict `_generation_jobs` (process-local, not Redis). Single-worker only. Frontend polls `GET /api/ova/generate/{job_id}/progress` until `status == "success"`. Finalization writes SCORM zip to `backend/scorm_output/{ova_id}_v{N}.zip` and persists `OvaVersion` + `OvaPhase` rows.

**Versioning invariant**: `OvaVersion` has a partial unique index — only one `is_active = TRUE` version per OVA. Edits always create a new version and deactivate the prior one.

**Agents** (`backend/agents/`) — Metodología 5E resource generation:
- `llm_router.py`: routes tasks using `groq` Python SDK (Groq) + `openai` client (OpenRouter). Task→model: `texto`→Groq llama-3.3-70b, `codigo`→OpenRouter qwen3-coder, `orquestador`→Groq gpt-oss-120b (`reasoning_effort=medium`), `razonamiento`→Groq qwen3-32b (`reasoning_effort=default`). Extra functions: `generar_vision()` (llama-4-scout, image RAG), `transcribir_audio()` (Whisper STT, **19.5 MB limit**), `generar_audio_tts()` (Orpheus WAV). Auto-falls back to OpenRouter on Groq 429.
- `engage_router.py`: POST `/api/agents/engage/generate` — 10 resource types for ENGAGE phase.
- `explore_router.py`: POST `/api/agents/explore/generate` — 10 resource types for EXPLORE phase.
- Most resources follow a two-step pattern: text/JSON generation → HTML generation via code agent.

**Other routers**: `rag/router.py` (stub), `roles/`, `users/`, `uploads/`.

### Frontend — React 19 + Vite

**Routing** (`frontend/src/App.jsx`): All routes declared here. `AdminRoute` component fetches `/api/auth/me` to check `role === 'administrador'`; redirects to `/dashboard` otherwise. Token expiry is polled every 60 s.

**Layout**: `AppLayout` wraps authenticated pages with `Navbar` + collapsible `Sidebar` + `<Outlet />`. `AdminLayout` wraps admin pages.

**Pages**: DashboardPage, CrearOvaPage, MisOvasPage, EditarOvaPage, PapeleraPage, ProfilePage, MetodologiaPage, EngagePage, ExplorePage, AdminRolesPage, AdminUsersPage, NotFoundPage.

**Metodología 5E**: `MetodologiaPage` links to per-phase pages. Currently active: Engage (`/metodologia/engage`) and Explore (`/metodologia/explore`). Explain, Elaborate, Evaluate are marked _próximamente_.

**State / data fetching**: Custom hooks in `hooks/` (`useEngageGeneration`, `usePhaseGeneration`). API calls via `services/engageService.js` and `services/exploreService.js`.

**Auth utils**: `lib/auth.js` — `getToken()`, `clearToken()`, `isTokenExpired()`.

**Code style**: Prettier enforces `printWidth: 100`, `singleQuote: true`, `semi: false`, `trailingComma: "es5"`. ESLint enforces max 200 lines per file.

### Environment variables

**Backend** (`backend/.env`):
```
DATABASE_URL=postgresql+psycopg://...supabase.com.../postgres?sslmode=require
JWT_SECRET=
JWT_ALGORITHM=HS256
JWT_EXPIRES_MINUTES=1440
OVA_ENABLED_LLMS=openai,gemini,claude   # controls LLM picker in UI
MIN_PROMPT_CHARS=10
OVA_GENERATION_DURATION_SECONDS=14
OVA_GENERATION_JOB_TTL_SECONDS=300
GROQ_API_KEY=
OPENROUTER_API_KEY=
CORS_ORIGINS=                           # comma-separated extra allowed origins
```

**Frontend** (`frontend/.env`):
```
VITE_API_BASE_URL=http://localhost:8000
```
