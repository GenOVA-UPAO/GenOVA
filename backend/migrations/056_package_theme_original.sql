-- Tema de paquete «original» («Paleta del OVA»): no inyecta variables, así la
-- paleta elegida al crear el OVA (o la de «IA elige») no la pisa el tema UPAO.
ALTER TABLE ovas DROP CONSTRAINT IF EXISTS ovas_package_theme_valid;
ALTER TABLE ovas ADD CONSTRAINT ovas_package_theme_valid
    CHECK (package_theme IN ('original', 'upao', 'claro', 'oscuro', 'alto-contraste', 'infantil'));
