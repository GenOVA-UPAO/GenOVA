CREATE TABLE IF NOT EXISTS _migrations_applied (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
