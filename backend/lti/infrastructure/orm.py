"""Tablas de LTI 1.3: plataformas registradas, claves de la herramienta, estado
OIDC (state + nonce de un solo uso) y lanzamientos aceptados."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from core.database import Base
from core.models_base import _pk_column


class LtiPlatform(Base):
    __tablename__ = "lti_platforms"
    __table_args__ = (UniqueConstraint("issuer", "client_id", name="uq_lti_platform_client"),)

    id = _pk_column()
    name = Column(String(120), nullable=False)
    issuer = Column(String(512), nullable=False, index=True)
    client_id = Column(String(255), nullable=False)
    deployment_ids = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    auth_login_url = Column(String(1024), nullable=False)
    auth_token_url = Column(String(1024), nullable=False)
    jwks_url = Column(String(1024), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class LtiToolKey(Base):
    """Par RSA de GenOVA cifrado en reposo (Fernet con clave derivada de JWT_SECRET).
    Solo se usa si no hay LTI_PRIVATE_KEY en el entorno."""

    __tablename__ = "lti_tool_keys"

    kid = Column(String(64), primary_key=True)
    private_key_encrypted = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class LtiOidcState(Base):
    """`state` y `nonce` emitidos en /lti/login; se consumen una sola vez en /lti/launch."""

    __tablename__ = "lti_oidc_states"

    state = Column(String(64), primary_key=True)
    nonce = Column(String(64), nullable=False, unique=True)
    platform_id = Column(
        UUID(as_uuid=True), ForeignKey("lti_platforms.id", ondelete="CASCADE"), nullable=False
    )
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    used_at = Column(DateTime(timezone=True))


class LtiLaunch(Base):
    """Lanzamiento aceptado. El token de la sesión LTI (en la URL del reproductor o
    del selector) apunta aquí; no da acceso al resto de GenOVA."""

    __tablename__ = "lti_launches"

    id = _pk_column()
    platform_id = Column(
        UUID(as_uuid=True), ForeignKey("lti_platforms.id", ondelete="CASCADE"), nullable=False
    )
    deployment_id = Column(String(255), nullable=False)
    message_type = Column(String(40), nullable=False)
    subject = Column(String(255), nullable=False)
    email = Column(String(255))
    ova_id = Column(UUID(as_uuid=True), ForeignKey("ovas.id", ondelete="CASCADE"))
    deep_link_return_url = Column(String(1024))
    deep_link_data = Column(Text)
    ags_lineitem = Column(String(1024))
    can_post_score = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    has_evaluation = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    last_score = Column(String(16))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    consumed_at = Column(DateTime(timezone=True))
