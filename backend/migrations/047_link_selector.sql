ALTER TABLE user_links ADD COLUMN IF NOT EXISTS code_selector VARCHAR(12);
ALTER TABLE user_links ADD COLUMN IF NOT EXISTS code_attempts INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS ix_user_links_code_selector ON user_links(code_selector);
-- Los códigos antiguos no tienen selector: reenviar rota al formato nuevo.
