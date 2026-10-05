-- Tema visual del paquete; independiente de las preferencias de generación.
ALTER TABLE ovas ADD COLUMN IF NOT EXISTS package_theme VARCHAR(24) NOT NULL DEFAULT 'upao';
ALTER TABLE ovas ADD CONSTRAINT ovas_package_theme_valid
    CHECK (package_theme IN ('upao', 'claro', 'oscuro', 'alto-contraste', 'infantil'));
