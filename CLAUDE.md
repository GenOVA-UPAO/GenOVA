# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Al iniciar sesión**: lee `AGENTS.md` → `feature_list.json` → `progress/current.md`.
> Actúa siempre como el agente `leader` definido en `.claude/agents/leader.md`.

## Project

GenOVA — web platform for AI-assisted generation of Virtual Learning Objects (OVA) with SCORM 1.2 export.
Built as a pnpm monorepo (React 19 + FastAPI). Backend supports both `pip` and `uv`.

## Commands

### Frontend (from repo root)

```bash
pnpm install          # deps
pnpm dev              # Vite dev → http://localhost:5173
pnpm build            # prod build
pnpm lint             # ESLint (max-lines: 200, hard error)
pnpm format           # Prettier check
pnpm test:unit        # cucumber-js unit (no browser, no backend)
pnpm test:e2e         # playwright-bdd (requires frontend + backend)
```

### Backend (from `backend/`)

```bash
# pip workflow
python -m venv venv && venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn main:app --reload --port 8000

# uv workflow (faster)
uv sync --extra dev
uv run uvicorn main:app --reload --port 8000

# Lint
ruff check .          # or: uv run ruff check .
ruff format .

# Tests (backend must be running for BDD tests)
pytest tests/step_defs/ -v --tb=short    # BDD (pytest-bdd)
pytest                                    # all tests/test_*.py
```

### Verification (harness)

```powershell
./verify.ps1          # lint + unit tests + backend BDD (if backend up)
./verify.ps1 -Quick   # lint + unit tests only (no backend needed)
```

### Docker

```bash
pnpm dev:docker    # hot-reload, ports 5173 + 8000
pnpm prod:docker   # Nginx on port 80
```

## Architecture summary

| Layer | Tech |
|---|---|
| Frontend | React 19, React Router 7, Tailwind CSS 4, Vite 8 |
| Backend | FastAPI, SQLAlchemy 2, Uvicorn, SlowAPI |
| DB | Supabase PostgreSQL + pgvector |
| Auth | JWT HS256 + bcrypt + lockout |
| LLMs | Groq + OpenRouter, fallback chains |
| RAG | pgvector + Gemini gemini-embedding-2-preview (768-d) |
| SCORM | Supabase Storage (302 redirect) or local disk fallback |

**Frontend pattern**: `services/*.js` (fetch) → `hooks/use*.js` (state) → `pages/*.jsx` (layout). Max 200 lines/file.  
**Backend pattern**: `router.py` (HTTP) → `service.py` (logic) → `models.py` (ORM). Max 200 lines/file.

## Migrations

Auto-applied on startup via `run_migrations()`. Files in `backend/migrations/` (001–015).
Next migration: create `backend/migrations/016_<name>.sql`.

## Dev seed accounts

- `admin@genova.ai` / `admin1234password`
- `user@genova.ai` / `user1234password`

## Security rules (hard)

- Never log passwords, tokens, or API keys.
- Never return reset tokens or OTPs in HTTP responses.
- New endpoints with external input: `@limiter.limit("N/minute")` + `request: Request`.
- DB errors: use `commit_or_500()` helpers — never `str(e)` to client.
- `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`: server-only, never `VITE_*`.

## CI pipeline

Push/PR to `develop`/`main` triggers: `lint` + `backend-bdd` + `frontend-unit` (parallel) → `e2e`.
Secrets needed: `TEST_DATABASE_URL`, `TEST_JWT_SECRET`.
