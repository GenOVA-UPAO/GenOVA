"""PlatformConfig ORM model (admin platform settings)."""

from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.sql import func

from core.database import Base


class PlatformConfig(Base):
    """Admin-only key-value store for platform-level API keys and config."""

    __tablename__ = "platform_config"

    key = Column(String(128), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
