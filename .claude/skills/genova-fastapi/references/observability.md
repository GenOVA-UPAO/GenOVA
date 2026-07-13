# Observability — structlog, Sentry, Logfire, LangSmith

**Language:** English (skill reference). Complements [security.md](security.md)
(R8 never-log-secrets). Sources: structlog stdlib integration docs, LangSmith
tracing env vars, FastAPI lifespan/middleware docs, GenOVA code in `core/`.

## Stack map (do not collapse into one tool)

| Concern | Tool | Opt-in? | Where |
|---|---|---|---|
| Stdout / request logs | **structlog** (+ stdlib) | Always on | `core/logging_setup.py` |
| PII/secret scrubbing | `RedactingFilter` + `redact_event_dict` | Always on | `core/log_redaction.py` |
| Error tracking | **Sentry** | `SENTRY_DSN` | `main.py` |
| Distributed traces + LLM cost spans | **Logfire** | `LOGFIRE_TOKEN` | `core/observability.py` |
| LangGraph run traces | **LangSmith** | `LANGSMITH_API_KEY` + `LANGSMITH_TRACING` | `init_langsmith()` + graph invoke |
| Prometheus metrics | Instrumentator | `METRICS_ENABLED` | `/metrics` |

They **coexist**. LangSmith is not a replacement for structlog; Logfire is not
a replacement for Sentry.

## structlog — GenOVA setup

### Goals

- **Production** (`ENV=production`): one JSON object per line (aggregators,
  Railway/Docker logs).
- **Local**: `ConsoleRenderer` (readable, colored).
- Uvicorn / third-party `logging` loggers share the same formatter via
  `ProcessorFormatter`.
- Every string field passes through redaction (R8).

### Entry point

Call once at process start (before serving traffic):

```python
from core.logging_setup import configure_logging
from core.config import settings

configure_logging(log_level=settings.log_level, env=settings.env)
```

### Processor pipeline (current)

1. `merge_contextvars` — request-scoped fields (`request_id`, `method`, `path`)
2. stdlib helpers (`add_logger_name`, `add_log_level`, positional args)
3. `TimeStamper(fmt="iso", utc=True)`
4. exception / unicode processors
5. `redact_event_dict` — scrub emails, Bearer, JWT, known API-key prefixes
6. `ProcessorFormatter.wrap_for_formatter` → JSON or Console renderer

### Request context

`RequestContextMiddleware` (`core/logging_setup.py`):

- Reads `X-Request-Id` or generates a short id
- `bind_contextvars(...)` for the request lifetime
- Sets response header `X-Request-Id`
- Clears contextvars in `finally`

Prefer `structlog.get_logger(__name__)` in **new** code:

```python
import structlog
logger = structlog.get_logger(__name__)
logger.warning("SLOW request", method=method, path=path, ms=ms)
```

Existing `logging.getLogger` still works (foreign_pre_chain + redaction on
handlers). Migrate opportunistically when touching a file (C12).

### Tests

- `backend/tests/test_log_redaction.py` — patterns + filter + event dict
- `backend/tests/test_logging_setup.py` — JSON prod path, invoke config metadata

## LangSmith ↔ LangGraph

### Official activation (LangSmith docs)

```bash
export LANGSMITH_TRACING=true
export LANGSMITH_API_KEY=<key>
export LANGSMITH_PROJECT=genova   # optional; default project otherwise
```

LangGraph picks these up automatically when the compiled graph runs.

### GenOVA opt-in (never hardcode keys)

Settings (`core/config.py`):

- `langsmith_api_key: str = ""`
- `langsmith_tracing: bool = False`
- `langsmith_project: str = "genova"`

`init_langsmith()` in `core/observability.py`:

- **No-op** unless both API key **and** tracing flag are set
- Sets the three env vars above (does not log the key)
- Called from `main.py` next to `init_logfire`

### Invoke metadata (no PII)

`prometheus/engine/graph.py` uses `build_invoke_config(...)`:

```python
{
  "configurable": {"thread_id": thread_id},
  "max_concurrency": N,
  "tags": ["prometheus", "ova-generation", env],
  "metadata": {"thread_id": ..., "env": ..., "component": "prometheus"},
}
```

**Never** put emails, prompts, API keys, or user payloads in `metadata`/`tags`.

### Fake path

When `LLM_FAKE=1`, generation skips the real graph — LangSmith is irrelevant;
keep tracing off in CI.

### Tests

`backend/tests/test_langsmith_init.py` — noop without key / with flag false;
sets env when enabled (monkeypatch; no network).

## Sentry / Logfire reminders

- Sentry: `send_default_pii=False` always.
- Logfire: `console=False` to avoid duplicating spans into stdout; instrument
  FastAPI + SQLAlchemy + OpenAI SDK only when token present.
- Server-only secrets — never `VITE_*` / never return in HTTP (see security.md).

Extend the security.md "never log secrets" list with:
`LANGSMITH_API_KEY`, `LOGFIRE_TOKEN`, `SENTRY_DSN` (DSN less sensitive but still
not for client responses).

## Middleware extraction (line limit)

`main.py` must stay ≤200 lines. HTTP middlewares live in:

- `core/http_middleware.py` — `ProcessTimeMiddleware`, `SecurityHeadersMiddleware`
- `core/logging_setup.py` — `RequestContextMiddleware`, logging config

FastAPI recommendation: lifespan context manager for startup/shutdown (GenOVA
already uses `@asynccontextmanager` lifespan for migrations/seed/background
purges). Prefer lifespan over deprecated `@app.on_event("startup")`.

## Adding a new observability sink

1. Opt-in via `Settings` field (empty default = off).
2. Init helper in `core/observability.py` (or dedicated module if >80 lines).
3. Never log the credential.
4. Unit test the no-op path.
5. Document env vars in `backend/.env.example`.
6. Update this reference + security.md server-only key list.
