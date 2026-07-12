# Layered architecture — backend

`router.py` (HTTP) → `service.py` (logic) → `models.py` (ORM). Checkpoint C7/C9.

## Layer rule

- **`router.py`**: HTTP only — request parsing, `Depends()`, calling the
  service, building the response/`HTTPException`. **Does not** contain direct
  SQL or complex business rules.
- **`service.py`**: pure logic — doesn't import `fastapi.Request`/business
  `HTTPException` (can use its own exceptions that the router translates to HTTP).
  Real example: `backend/scorm/service.py` — `build_scorm_zip_bytes(...)` is
  pure logic, no HTTP involved.
- **`models.py`**: ORM (SQLAlchemy). A domain can have its own `models.py`,
  or re-export from the shared `backend/models.py` (pattern seen in
  `auth/`, `roles/`, `users/`).

Hard rule: **`router.py` never imports `models.*` without going through a
`service.py`** — if the router needs to touch the ORM directly, that's a sign
a service layer is missing.

## Packages per domain, not per technical layer

```
backend/
  core/         # cross-cutting: config, database, security, rate_limit, log_redaction
  auth/         # router.py + register_router.py + reset_router.py + ... + models.py
  ova/          # router.py, models.py, helpers.py, crud/, lifecycle/, phases/, uploads/
  llm/          # router.py, providers.py, catalog/, clients/, images/, phases/
  rag/          # chunker.py, embedder.py, parsers.py, pipeline.py, retriever.py, store.py
  scorm/        # router.py, service.py, template_*.py
  roles/        # router.py, delete_router.py, models.py
  users/        # router.py, models.py, admin/, estudiante/, profesor/, analytics/, settings/
  generation/   # errors/, jobs/, regen/
  storage/      # supabase_storage.py
```

Never create top-level folders by technology (`controllers/`, `services/` as
a package shared across domains, generic `models/`) — each domain owns its
own layers.

## Splitting large routers

When a domain's `router.py` approaches the 200-line limit, split by
resource following the real `backend/auth/` pattern:
`router.py` (base login/logout) + `register_router.py` + `reset_router.py` +
`session_router.py` + `verify_router.py` + `totp_router.py` + `totp_login_router.py`,
all mounted on the main `APIRouter()` via `router.include_router(...)`.

## `core/` — what's really cross-cutting

`config.py`, `database.py` (`get_db`, `commit_or_500`), `rate_limit.py` (`limiter`),
`security.py`, `log_redaction.py`, `models_base.py`, `observability.py`. If the
code is domain-specific (OVA logic, LLM logic, auth logic), it doesn't belong in
`core/` — it belongs in its package.
