"""CatalogCache ORM model (llm catalog domain)."""

from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from core.database import Base
from core.models_base import _pk_column


class CatalogCache(Base):
    """One row per provider (groq | openrouter) holding the raw API response
    from the model-list endpoints. Upserted on each catalog refresh with a 24h
    TTL so we can rebuild the merged catalog even if both providers are
    unreachable."""

    __tablename__ = "catalog_cache"

    id = _pk_column()
    provider = Column(String(20), unique=True, nullable=False, index=True)
    raw_data = Column(JSONB, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
