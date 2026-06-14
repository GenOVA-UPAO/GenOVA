# GenOVA — GitHub Copilot Instructions

GenOVA is a pnpm monorepo (React 19 + FastAPI) for AI-assisted generation of Virtual Learning Objects (OVA) with SCORM 1.2 export.

## Tech stack
- Frontend: React 19, React Router 7, Tailwind CSS 4, Vite 8
- Backend: FastAPI, SQLAlchemy 2, Uvicorn, SlowAPI
- DB: Supabase PostgreSQL + pgvector
- Auth: JWT HS256 httpOnly cookie (`genova_token`)
- LLMs: Groq + OpenRouter with fallback chains

## Architecture patterns (strictly enforced)
- Frontend: `services/*.js` (fetch) → `hooks/use*.js` (state) → `pages/*.jsx` (layout)
- Backend: `router.py` (HTTP) → `service.py` (logic) → `models.py` (ORM)
- Max 200 lines/file (hard Biome error on frontend)

## Verification
```powershell
./verify.ps1 -Quick   # lint + unit tests (no backend needed)
./verify.ps1          # full suite
```

## Security (hard rules)
- Never log passwords, tokens, or API keys
- New endpoints with external input: `@limiter.limit("N/minute")` + `request: Request`
- Server-only keys: `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY` — never `VITE_*`
- DB errors: use `commit_or_500()` helpers, never `str(e)` to client

## SDD workflow
All features follow: `pending → spec_ready → in_progress → done`.
Agent protocols in `.claude/agents/`. Read `AGENTS.md` for full workflow.
No code without approved spec (`feature_list.json` tracks status).

## Skills
Installed skills in `.agents/skills/`. Registry in `skills-catalog.json`.
