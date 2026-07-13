# SQLAlchemy 2 + Supabase pooler — GenOVA

**Language:** English (skill reference). Sources: SQLAlchemy 2.0 Session /
`select()` migration docs + GenOVA `core/database.py` + C14 migrations doc.

## Engine configuration (non-negotiable for Supabase)

Implemented in `backend/core/database.py`:

| Setting | Value / reason |
|---|---|
| Driver | `postgresql+psycopg://` (psycopg **v3**, never bare `postgresql://` → psycopg2) |
| Pooler | Prefer Supabase **Transaction** pooler **port 6543** |
| `pool_pre_ping` | `True` — survive idle disconnects |
| `pool_recycle` | `300` — recycle before pgbouncer idle eviction |
| `prepare_threshold` | `None` — disable server-side prepared statements (avoid `DuplicatePreparedStatement` across pooled sessions) |
| `pool_size` / `max_overflow` | From settings (`DB_POOL_SIZE`, `DB_MAX_OVERFLOW`) |
| `future` | `True` (2.0 style) |

Reject `https://…supabase.co` pasted as `DATABASE_URL` at startup (clear error).

## Session patterns (SQLAlchemy 2.0)

Prefer 2.0 style:

```python
from sqlalchemy import select
from sqlalchemy.orm import Session

user = session.execute(select(User).filter_by(email=email)).scalar_one_or_none()
row = session.get(User, user_id)
```

- Context manager: `with Session(engine) as session:` for short scripts /
  background tasks.
- FastAPI: `Depends(get_db)` yields `SessionLocal()` and closes in `finally`.
- Writes: `commit_or_500(db, "operation")` — never `str(e)` to the client
  (see [security.md](security.md)).

### Rollback after failed flush

SQLAlchemy FAQ: after a failed flush inside a transaction, call `rollback()`
before continuing. `commit_or_500` already rollbacks on failure.

### Eager loads

When using `joinedload()` on collections, call `.unique()` on the result
(SQLAlchemy 2.0 guidance) to dedupe rows.

## ORM vs migrations

- Model change that affects schema → new `backend/migrations/0NN_*.sql`.
- Cascades: [migrations-and-orm.md](migrations-and-orm.md) (C14).

## Anti-patterns

- `session.query(User)` legacy 1.x API in **new** code (migrate when touching).
- Leaving prepared statements enabled on Transaction pooler.
- Long-lived Sessions across requests.
- Catching DB errors and returning exception text to HTTP clients.

## Related

- [layered-architecture.md](layered-architecture.md) — router never imports models
  without service
- [observability.md](observability.md) — Logfire can instrument the engine
