CREATE TABLE IF NOT EXISTS user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linked_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  invite_email VARCHAR(255),
  code_hash VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_links_owner ON user_links(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_user_links_linked ON user_links(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_user_links_invite_email ON user_links(invite_email);
CREATE INDEX IF NOT EXISTS idx_user_links_status_expires ON user_links(status, expires_at);
