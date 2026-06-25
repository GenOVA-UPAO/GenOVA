ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_settings JSONB NOT NULL
    DEFAULT '{"colorMode": "upao", "designMode": "upao", "palette": null}'::jsonb;
