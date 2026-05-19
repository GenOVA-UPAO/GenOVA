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

### DB seed

Runs automatically on backend startup via `seed.py`. Creates `administrador` and `usuario` roles plus default test accounts.

### SQL migrations

Apply manually in order: `backend/migrations/001_init.sql` through `005_ova_versions_phases.sql`.

## Architecture

### Backend — FastAPI

**Entry point**: `backend/main.py`  
Registers all routers, calls `seed_db()` and `Base.metadata.create_all()` on startup.

**Models** (`backend/models.py`): `User`, `Ova`, `OvaVersion`, `OvaPhase`, `Session`, `Role`, `UserRole`, `PasswordResetToken` — all UUIDs, PostgreSQL dialect (JSONB for role permissions).

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
- `llm_router.py`: routes tasks using `groq` Python SDK (Groq) + `openai` client (OpenRouter). Task→model: `texto`→Groq llama-3.3-70b, `codigo`→OpenRouter qwen3-coder, `orquestador`→Groq gpt-oss-120b (`reasoning_effort=medium`), `razonamiento`→Groq qwen3-32b (`reasoning_effort=default`). Extra functions: `generar_vision()` (llama-4-scout, image RAG), `transcribir_audio()` (Whisper STT, 19.5 MB limit), `generar_audio_tts()` (Orpheus WAV). Auto-falls back to OpenRouter on Groq 429.
- `engage_router.py`: POST `/api/agents/engage/generate` — 10 resource types for ENGAGE phase.
- `explore_router.py`: POST `/api/agents/explore/generate` — 10 resource types for EXPLORE phase.
- Most resources follow a two-step pattern: text/JSON generation → HTML generation via code agent.

**Other routers**: `rag/router.py` (stub), `roles/`, `users/`, `uploads/`.

### Frontend — React 19 + Vite

**Routing** (`frontend/src/App.jsx`): All routes declared here. `AdminRoute` component fetches `/api/auth/me` to check `role === 'administrador'`; redirects to `/dashboard` otherwise. Token expiry is polled every 60 s.

**Pages**: DashboardPage, CrearOvaPage, MisOvasPage, EditarOvaPage, PapeleraPage, ProfilePage, MetodologiaPage, EngagePage, ExplorePage, AdminRolesPage, AdminUsersPage, NotFoundPage.

**Metodología 5E**: `MetodologiaPage` links to per-phase pages. Currently active: Engage (`/metodologia/engage`) and Explore (`/metodologia/explore`). Explain, Elaborate, Evaluate are marked _próximamente_.

**State / data fetching**: Custom hooks in `hooks/` (`useEngageGeneration`, `usePhaseGeneration`). API calls via `services/engageService.js` and `services/exploreService.js`.

**Auth utils**: `lib/auth.js` — `getToken()`, `clearToken()`, `isTokenExpired()`.

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
```

**Frontend** (`frontend/.env`):
```
VITE_API_BASE_URL=http://localhost:8000
```
