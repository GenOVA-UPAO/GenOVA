# Settings, rate limits, and arq jobs — GenOVA

**Language:** English (skill reference). Sources: pydantic-settings docs
(`BaseSettings`, `SettingsConfigDict`) + GenOVA `core/config.py`,
`core/rate_limit.py`, `generation/jobs/queue.py`, `worker.py`.

## pydantic-settings

Central config: `backend/core/config.py` → `settings` singleton.

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False,
    )
    database_url: str = ""
    redis_url: str = ""
    # …
```

### GenOVA rules

- **Empty defaults** for secrets (`""`) — opt-in features stay off until set.
- `extra="ignore"` so undeclared `.env` keys do not crash boot.
- `case_sensitive=False` — `DATABASE_URL` / `database_url` both bind.
- Validate weak JWT secrets at startup (existing validators in `Settings`).
- Document every new env key in `backend/.env.example` with a one-line comment.
- Never expose settings secrets to HTTP responses or frontend bundles.

### Adding a flag

1. Field on `Settings` with safe default.
2. Read via `settings.foo` (not scattered `os.getenv` in new code).
3. `.env.example` + this skill / observability doc if it is an opt-in sink.

## SlowAPI rate limiting

- Global `limiter` in `core/rate_limit.py`.
- Storage: Redis if `REDIS_URL`, else in-memory.
- Every external-input endpoint: `@limiter.limit("N/minute")` + `request: Request`
  first param ([security.md](security.md)).
- `RATE_LIMIT_ENABLED=0` only in CI / load tests — never production.

## arq job queue (B2/B3)

When `REDIS_URL` is set:

1. Generation enqueue → `generation/jobs/queue.py` (`create_pool`, `enqueue_job`).
2. Worker process: `backend/worker.py` → `arq worker.WorkerSettings`.
3. `max_jobs` from `settings.arq_max_jobs`.

When Redis is absent: **inline** runner in a thread (dev single-box). Callers
must tolerate both paths.

### Worker rules

- Worker loads the same `.env` / settings as the API (DB + provider keys).
- Long LLM work stays off the API event loop (arq or `asyncio.to_thread`).
- Failures: log with redaction; persist job error state for the SSE/UI — no
  secret leakage in job error strings returned to clients.

## Dependency parity

- Runtime pins live in **both** `requirements.txt` and `pyproject.toml`.
- `sync_deps.py --check` / verify harness enforces parity.
- Prefer `uv sync --extra dev` locally; Docker/Railway may use `uv pip install -r requirements.txt`.

## Related

- [observability.md](observability.md) — Sentry / Logfire / LangSmith flags
- [sqlalchemy-sessions.md](sqlalchemy-sessions.md) — pool settings from Settings
- [docker-compose-workflow.md](../../genova-dev/references/docker-compose-workflow.md)
