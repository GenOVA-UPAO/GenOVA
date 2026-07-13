---
name: genova-fastapi
description: GenOVA-specific FastAPI backend conventions — router.py->service.py->models.py architecture per domain, hard security rules (commit_or_500, @limiter.limit, never log secrets), ruff/200-line limit, and migrations+ORM cascades (C14). Use when creating or reviewing endpoints, services, SQLAlchemy models, or migrations in the backend.
metadata:
  author: GenOVA local
  version: '1.1'
  source: local/genova
---

# GenOVA FastAPI Conventions

**Language:** Reason and write instructions in English. Produce all user-facing output
in Spanish — chat replies, specs (`sdd/specs/`), docs (`docs/`), progress notes, backlog,
commit messages. Never translate literal protocol tokens. See `AGENTS.md` §Language policy.

Real conventions of the GenOVA backend (FastAPI + SQLAlchemy 2 + Supabase Postgres).
Before coding against a specific library (SQLAlchemy, Pydantic, arq, etc.), use the
`find-docs`/ctx7 skill for up-to-date docs if the API isn't obvious from the existing
code — a rule already established for `implementer`.

## Before writing code

1. Identify the right domain (existing package: `auth/`, `ova/`, `llm/`, `rag/`,
   `prometheus/`, `roles/`, `users/`, `scorm/`, `generation/`, `storage/`) or whether it's
   genuinely cross-cutting (`core/`). Read [layered-architecture.md](references/layered-architecture.md).
2. Every endpoint with external input needs rate limiting + safe error handling.
   Read [security.md](references/security.md) — **non-negotiable, checkpoint C4**.
3. Check the 200-line limit and the active ruff rules before the
   file grows. Read [ruff-and-limits.md](references/ruff-and-limits.md).
4. If you touch `models.py` or the schema: a new migration is required and ORM↔DDL
   cascades must be reviewed. Read [migrations-and-orm.md](references/migrations-and-orm.md) — **checkpoint C14**.
5. If you touch logs, tracing, LangGraph observability, or add an opt-in sink:
   read [observability.md](references/observability.md) (structlog, Sentry,
   Logfire, LangSmith, R8 dual redaction).

## Quick rules (summary)

- Layers: `router.py` (HTTP, no SQL or business rules) → `service.py` (logic,
  no HTTP) → `models.py` (ORM). Router never imports `models.*` without going through a
  `service.py`.
- Packages per domain, not per technical layer (no `controllers/`, `models/` as
  shared top-level folders across domains).
- Files that would grow past 200 lines: split into `<resource>_router.py`
  (pattern already used in `auth/`: `register_router.py`, `reset_router.py`, etc.).
- Every endpoint with external input: `@limiter.limit("N/minute")` + `request: Request`
  as the first parameter.
- Every DB write error: `commit_or_500(db, "operation")` — never `str(e)`
  to the client.
- Never log passwords/tokens/API keys/OTPs; never return reset tokens/OTPs
  in an HTTP response. Use `configure_logging` + redaction; opt-in sinks only
  (see [observability.md](references/observability.md)).
- New schema migration → `backend/migrations/0NN_*.sql`; if there's a
  `relationship()` with an `ON DELETE CASCADE` FK, review `cascade=`/`passive_deletes=`.
- `main.py` ≤200 lines: extract middleware to `core/http_middleware.py` /
  `core/logging_setup.py` rather than growing the entrypoint.

## When something doesn't fit

If you see an endpoint without rate limiting or an error that exposes `str(e)`,
don't replicate it in new code — fix it or flag it, it's a C4 checkpoint the
reviewer will mark red.
