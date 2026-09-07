"""Session and token ORM models (auth domain)."""

from sqlalchemy import Column, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from core.database import Base
from core.models_base import _pk_column


class Session(Base):
    __tablename__ = "sessions"

    id = _pk_column()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    user = relationship("User", backref="sessions")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = _pk_column()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    user = relationship("User", backref="password_reset_tokens")


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id = _pk_column()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    user = relationship("User", backref="email_verification_tokens")


class RevokedToken(Base):
    """JWT blocklist — stores jti of revoked tokens until their natural expiry."""

    __tablename__ = "jwt_blocklist"
    __table_args__ = (Index("idx_jwt_blocklist_expires_at", "expires_at"),)

    jti = Column(String(128), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    revoked_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
