-- Migration 030: Add 'usuarios_prueba' role for thesis participants
-- Permissions: create/view/export OVAs only — no model config, no linking
INSERT INTO roles (name, description, permissions)
SELECT 'usuarios_prueba',
       'Rol para participantes de tesis — acceso a OVAs sin configuración de modelos',
       '["create_ova","view_ova","export_ova"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'usuarios_prueba');
