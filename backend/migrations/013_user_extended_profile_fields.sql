-- Migración 013: Añadir campos de perfil extendidos a users
ALTER TABLE users ADD COLUMN IF NOT EXISTS university_id INTEGER UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) UNIQUE;

-- Índices para búsquedas optimizadas
CREATE INDEX IF NOT EXISTS idx_users_university_id ON users(university_id);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
