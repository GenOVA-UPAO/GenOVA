-- Conserva el correo tal como lo escribe el usuario en `email` (display/envío)
-- y añade `email_normalized` como llave canónica para dedup y login.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_normalized VARCHAR(255);

-- Backfill replicando normalize_email(): minúsculas, sin +tag (RFC 5233) y, en
-- Gmail/Googlemail, sin puntos en el local-part.
UPDATE users SET email_normalized =
  CASE
    WHEN split_part(lower(email), '@', 2) IN ('gmail.com', 'googlemail.com')
      THEN replace(split_part(split_part(lower(email), '@', 1), '+', 1), '.', '')
           || '@' || split_part(lower(email), '@', 2)
    ELSE split_part(split_part(lower(email), '@', 1), '+', 1)
         || '@' || split_part(lower(email), '@', 2)
  END
WHERE email_normalized IS NULL AND position('@' in email) > 0;

UPDATE users SET email_normalized = lower(email) WHERE email_normalized IS NULL;

-- Llave única para impedir cuentas duplicadas por alias/puntos.
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email_normalized ON users(email_normalized);
