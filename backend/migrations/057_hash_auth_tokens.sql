-- Los tokens de reset de contraseña y de verificación de correo pasan a
-- guardarse como SHA-256 hex (core.security.token_digest), como ya se hacía con
-- los de cambio de correo y los tickets TOTP. Se convierten los pendientes para
-- que sus enlaces sigan funcionando. Un token en claro (token_urlsafe(32)) mide
-- 43 caracteres; un digest, 64: el filtro hace la migración idempotente.
UPDATE password_reset_tokens
    SET token = encode(sha256(convert_to(token, 'UTF8')), 'hex')
    WHERE length(token) <> 64;
UPDATE email_verification_tokens
    SET token = encode(sha256(convert_to(token, 'UTF8')), 'hex')
    WHERE length(token) <> 64;
