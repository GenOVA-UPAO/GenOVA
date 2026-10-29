-- LTI 1.3: GenOVA como herramienta dentro del LMS (Moodle/Canvas/Blackboard).
-- Plataformas registradas por el admin, par RSA de la herramienta (cifrado en
-- reposo), state/nonce OIDC de un solo uso y lanzamientos aceptados.
-- RLS deny-all como el resto: el backend (postgres) la salta; PostgREST no ve nada.

CREATE TABLE IF NOT EXISTS lti_platforms (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(120)  NOT NULL,
    issuer         VARCHAR(512)  NOT NULL,
    client_id      VARCHAR(255)  NOT NULL,
    deployment_ids JSONB         NOT NULL DEFAULT '[]'::jsonb,
    auth_login_url VARCHAR(1024) NOT NULL,
    auth_token_url VARCHAR(1024) NOT NULL,
    jwks_url       VARCHAR(1024) NOT NULL,
    is_active      BOOLEAN       NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ,
    CONSTRAINT uq_lti_platform_client UNIQUE (issuer, client_id)
);
CREATE INDEX IF NOT EXISTS ix_lti_platforms_issuer ON lti_platforms (issuer);

CREATE TABLE IF NOT EXISTS lti_tool_keys (
    kid                   VARCHAR(64) PRIMARY KEY,
    private_key_encrypted TEXT        NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lti_oidc_states (
    state       VARCHAR(64) PRIMARY KEY,
    nonce       VARCHAR(64) NOT NULL UNIQUE,
    platform_id UUID        NOT NULL REFERENCES lti_platforms (id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_lti_oidc_states_expires_at ON lti_oidc_states (expires_at);

CREATE TABLE IF NOT EXISTS lti_launches (
    id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id          UUID          NOT NULL REFERENCES lti_platforms (id) ON DELETE CASCADE,
    deployment_id        VARCHAR(255)  NOT NULL,
    message_type         VARCHAR(40)   NOT NULL,
    subject              VARCHAR(255)  NOT NULL,
    email                VARCHAR(255),
    ova_id               UUID          REFERENCES ovas (id) ON DELETE CASCADE,
    deep_link_return_url VARCHAR(1024),
    deep_link_data       TEXT,
    ags_lineitem         VARCHAR(1024),
    can_post_score       BOOLEAN       NOT NULL DEFAULT false,
    has_evaluation       BOOLEAN       NOT NULL DEFAULT false,
    last_score           VARCHAR(16),
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    expires_at           TIMESTAMPTZ   NOT NULL,
    consumed_at          TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_lti_launches_expires_at ON lti_launches (expires_at);

ALTER TABLE lti_platforms   ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_tool_keys   ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_oidc_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_launches    ENABLE ROW LEVEL SECURITY;
