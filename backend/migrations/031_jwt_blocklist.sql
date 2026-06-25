-- JWT blocklist: stores jti claims of revoked tokens (logout, force-logout).
-- Rows expire naturally with the token; a daily cleanup removes stale entries.
CREATE TABLE IF NOT EXISTS jwt_blocklist (
    jti        TEXT        PRIMARY KEY,
    user_id    UUID        REFERENCES users(id) ON DELETE CASCADE,
    revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jwt_blocklist_expires_at ON jwt_blocklist (expires_at);

-- RLS: service role only (backend uses service-role connection).
ALTER TABLE jwt_blocklist ENABLE ROW LEVEL SECURITY;
