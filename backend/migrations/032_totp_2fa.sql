-- 2FA / TOTP support for admin accounts (and optionally any user).
-- totp_secret: base32-encoded TOTP seed (NULL = 2FA not configured)
-- totp_enabled: 2FA actively enforced on login (separate from just configured)
-- totp_backup_codes: hashed single-use backup codes [{hash, used}]

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS totp_secret  TEXT,
    ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS totp_backup_codes JSONB NOT NULL DEFAULT '[]'::jsonb;
