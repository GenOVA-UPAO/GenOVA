# Migrations and ORM cascades — checkpoint C14

## Migrations

- Files in `backend/migrations/`, numbered `001`–`017` (next:
  `018_<name>.sql`).
- Auto-applied when the backend starts via `run_migrations()`. Already-applied
  filenames are recorded in `_migrations_applied` (bootstrapped by
  migration 016) — each file runs **at most once** per database.
- Any change to `models.py` that implies a schema change (new column,
  new table, new constraint, new FK) **requires** a new migration — changing
  the SQLAlchemy model alone is not enough.

## C14 — ORM cascade must match the DDL

If a parent→child `relationship()` has its FK defined as `ON DELETE CASCADE`
in the DDL, the SQLAlchemy relationship must declare:

```python
children = relationship(
    "Child",
    cascade="all, delete-orphan",
    passive_deletes=True,
)
```

- If the FK is `ON DELETE SET NULL` instead of `CASCADE`: the child's FK
  column must be `nullable=True` and must **not** carry `delete-orphan` (the child
  survives with a null FK, it isn't deleted).
- Without `passive_deletes=True`, SQLAlchemy may emit an `UPDATE child SET fk=NULL`
  before the delete instead of letting the DB apply the `ON DELETE CASCADE` — that
  is the actual bug that originated this checkpoint (B1 of HU-012).
- Reference test: `backend/tests/test_c14_orm_delete_cascade.py` — any new
  `relationship()` with a cascade must have an equivalent test verifying
  that `db.delete(parent)` produces the expected effect on the children (cascade
  DELETE, or SET NULL, per the DDL) with no spurious `UPDATE` queries.

## Supabase connection (context, not task-specific but relevant)

- `DATABASE_URL` must point to Supabase's **Transaction pooler** (port 6543),
  not the Session pooler, on Render free tier.
- `DB_POOL_SIZE=10`, `DB_MAX_OVERFLOW=10` via env; `pool_pre_ping=True` and
  `pool_recycle=300` always on (to survive pgbouncer's idle eviction).
- `prepare_threshold=None` in psycopg3 — server-side prepared statements are
  disabled because they collide across sessions on the Transaction pooler
  (`DuplicatePreparedStatement`). Don't re-enable them without changing pooler.
