-- Email verification (verificación de correo obligatoria).
-- Nueva columna en users + tabla de tokens de verificación.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- Grandfather: los usuarios existentes quedan verificados para no bloquearlos
-- (la verificación solo aplica a registros nuevos). Inserts futuros usan el
-- DEFAULT false definido arriba.
UPDATE users SET email_verified = true WHERE email_verified = false;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Mismo postura RLS que el resto: el backend conecta como superuser y bypassa
-- RLS; la policy bloquea cualquier acceso directo via PostgREST.
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS backend_only ON email_verification_tokens;
CREATE POLICY backend_only ON email_verification_tokens USING (false);
