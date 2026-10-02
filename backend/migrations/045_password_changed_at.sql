-- Corte de credenciales: un cambio/reset de contraseña invalida los JWT emitidos antes.
-- NULL = nunca cambiada desde esta migración (no se invalida nada existente).
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
