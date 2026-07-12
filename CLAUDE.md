# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **On session start**: read `AGENTS.md` → `feature_list.json` → `sdd/progress/current.md`.
> Always act as the `leader` agent defined in `.claude/agents/leader.md`.
> Language policy (canonical): see `AGENTS.md` §0 — instructions in English, user-facing
> output (chat, specs, docs, progress, backlog, commits) in Spanish.

## Project

GenOVA — web platform for AI-assisted generation of Virtual Learning Objects (OVA) with SCORM 1.2 export.
Built as a pnpm monorepo (Angular 22 + FastAPI). Backend supports both `pip` and `uv`.

## Commands

### Frontend (from repo root)

```bash
pnpm install          # deps
pnpm dev              # ng serve → http://localhost:4200
pnpm build            # ng build (prod)
pnpm lint             # eslint (strict typescript-eslint + angular-eslint; max-lines: 250, tests excluded; hard error)
pnpm lint:fix         # eslint --fix
pnpm format           # prettier --write . (TS/HTML/CSS)
pnpm format:check     # prettier --check .
pnpm typecheck        # ngc (Angular AOT compiler, --noEmit) — checks templates too, not just tsc
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
pnpm dev:docker    # hot-reload, ports 4200 + 8000
pnpm prod:docker   # Nginx on port 80
```

## Architecture summary

| Layer | Tech |
|---|---|
| Frontend | Angular 22, Angular Router, Tailwind CSS 4, Angular CLI/esbuild |
| Backend | FastAPI, SQLAlchemy 2, Uvicorn, SlowAPI |
| DB | Supabase PostgreSQL + pgvector |
| Auth | JWT HS256 + bcrypt + lockout |
| LLMs | Groq + OpenRouter, fallback chains |
| RAG | pgvector + Gemini gemini-embedding-2-preview (768-d) |
| SCORM | Supabase Storage (302 redirect) or local disk fallback |

**Frontend pattern**: `services/*.ts` (fetch, signals for state) → `*.component.ts` pages/components (layout). Standalone components, no NgModules, no React hooks. Max 250 lines/file (`.html` templates excluded).  
**Backend pattern**: `router.py` (HTTP) → `service.py` (logic) → `models.py` (ORM). Max 200 lines/file.

## Migrations

Auto-applied on startup via `run_migrations()`. Files in `backend/migrations/` (001–017).
Applied filenames are tracked in `_migrations_applied` (bootstrapped by 016) so
each file runs at most once per database. Next migration: create
`backend/migrations/018_<name>.sql`.

## Database connection (Supabase)

For Render free tier, point `DATABASE_URL` to the Supabase **Transaction**
pooler (port 6543), not the Session pooler. Pool tuning is env-driven:
`DB_POOL_SIZE=10`, `DB_MAX_OVERFLOW=10`. `pool_pre_ping=True` and
`pool_recycle=300` are always on to survive pgbouncer's idle eviction.
psycopg3 server-side prepared statements are disabled (`prepare_threshold=None`)
— they collide across sessions on the Transaction pooler
(`DuplicatePreparedStatement: "_pg3_0" already exists`).

## Auth

JWT is issued by the backend and delivered as an httpOnly `Set-Cookie:
genova_token=...; Secure; SameSite=Strict; HttpOnly` on `/login` and
`/register`. The frontend never reads it directly; cookies travel automatically
via `credentials: 'include'` in `frontend/src/core/lib/http.ts`. Set
`AUTH_ACCEPT_BEARER=0` in production env to reject the legacy `Authorization:
Bearer` fallback once all clients are on cookies.

`CORS_ORIGINS` (comma-separated frontend origins) is required when `ENV=production`.

## Dev seed accounts

- `admin@genova.ai` / `admin1234password`
- `user@genova.ai` / `user1234password`

## Security rules (hard)

- Never log passwords, tokens, or API keys.
- Never return reset tokens or OTPs in HTTP responses.
- New endpoints with external input: `@limiter.limit("N/minute")` + `request: Request`.
- DB errors: use `commit_or_500()` helpers — never `str(e)` to client.
- `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`: server-only, never `VITE_*`.

## Skills & agents

SDD agents in `.claude/agents/`: `leader` (orchestrates), `explorer` (pre-spec map),
`spec_author` (specs; 3 modes — Single/Sequential/Batch: ≥4 specs or explicit
request = one round of assumptions + a single confirmation + continuous generation
of all of them), `implementer` (code), `reviewer` (approves), `skill-advisor`
(skill broker), `spec-sync` (consistency across specs after renames), and `doc_author`
(documentation in `docs/`, 4-step interactive flow like `spec_author`; `leader`
offers it when a feature closes `done` or on "document X", and updates existing docs
instead of duplicating).

Local GenOVA convention skills in `.claude/skills/` (source `local/genova`, real
directories, not symlinked): `genova-dev` (dev workflow orchestration, plan mode,
model-tiered subagents), `genova-angular` (Angular frontend conventions, complements
the official `angular-developer` skill), `genova-fastapi` (FastAPI backend
conventions), `genova-audit` (full repo audit against `CHECKPOINTS.md`, manual
invocation via `/genova-audit`).

Skills installed in `.agents/skills/` (symlinked from `.claude/skills/`), registered
in `skills-catalog.json` (metadata + triggers + security) and locked in `skills-lock.json`:
- `find-skills` — discover/install skills (`npx skills find` / `add`)
- `find-docs` — up-to-date library docs via `npx ctx7@latest library|docs`. Used by
  `implementer` before writing code against a specific library.

To search/install/update skills: ask the `leader` ("find a skill for…",
"update skills"). Post-clone on Windows: `scripts/setup-harness.ps1` recreates symlinks.

## Language policy

Reason and write instructions in English (agents, skills, docs like this one).
Produce all user-facing output in Spanish: chat replies, specs (`sdd/specs/`), docs
(`docs/`), progress notes (`sdd/progress/`), backlog, audit reports (`sdd/audits/`),
and commit messages. Never translate literal protocol tokens (receipts, status enums,
checkpoint IDs, spec-type codes, `RESULTADO FINAL: PASA`). Canonical source:
`AGENTS.md` §0.

## CI pipeline

Push/PR to `develop`/`main` triggers: `lint` + `backend-bdd` + `frontend-unit` (parallel) → `e2e`.
Secrets needed: `TEST_DATABASE_URL`, `TEST_JWT_SECRET`.

