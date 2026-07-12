# Security — checkpoint C4 (non-negotiable)

Source: `CLAUDE.md` "Security rules (hard)" + `CHECKPOINTS.md` C4 +
`backend/core/rate_limit.py` + `backend/core/database.py`.

## Mandatory rate limiting

Every new endpoint that receives external input (body, query, path params from an
untrusted client) needs:

```python
@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    ...
```

- `@limiter.limit(...)` **below** the route decorator.
- `request: Request` **mandatory as the first parameter** — SlowAPI needs it
  to extract the key (client IP).
- Reference limits observed in the project: login/register/logout
  `10/minute`; verify TOTP/reset `5/minute`; sensitive operations `2-3/minute`.
  Adjust to the endpoint's risk, don't copy a random number.
- `backend/core/rate_limit.py`: `limiter` keyed by IP, Redis backend if
  `REDIS_URL` is set (multi-instance), in-memory fallback. Never
  disable (`RATE_LIMIT_ENABLED=0`) outside CI.

## DB errors — never `str(e)` to the client

```python
from core.database import commit_or_500

commit_or_500(db, "create_role")
```

Real implementation (`backend/core/database.py`): does `db.commit()`, if it fails
does `rollback()`, logs server-side with `_logger.exception(...)`, and raises
`HTTPException(500, detail="No se pudo completar la operación. Intenta de nuevo.")`
with `from None` so the original exception isn't chained. **Never** build an
`HTTPException` with `str(e)` or the traceback as `detail`.

## Never log or return secrets

- Never `logger.info/debug/error(...)` with passwords, tokens, API keys, or OTPs in
  the message — use `core/log_redaction.py` if you need to log an object that
  might contain them.
- Never include reset tokens or OTPs in an HTTP response body, not even
  in debug/dev mode.
- Server-only variables, **never** with a `VITE_*` prefix or exposed to the frontend:
  `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`.

## Input validation

Auth and related endpoints: use `pydantic.Field(max_length=...)` on the request
`BaseModel` fields — prevents abuse via giant payloads before they
reach business logic.

## Constant-time / anti-enumeration

Where applicable (e.g. login), use constant-time verification or a dummy-verify
so you don't reveal whether an email exists via timing difference — pattern already
present in `backend/auth/router.py`.

## CORS and cookies

`CORS_ORIGINS` is required when `ENV=production`. The JWT travels as an httpOnly
cookie (`genova_token`, `Secure`, `SameSite=Strict`) — the frontend never reads it
directly, it uses `credentials: 'include'`. `AUTH_ACCEPT_BEARER=0` in production
rejects the legacy `Authorization: Bearer` fallback.
