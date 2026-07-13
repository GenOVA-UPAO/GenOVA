"""Read/write the catalog cache in Supabase (table catalog_cache).

A single row per provider stores the raw API response so we can rebuild the
merged catalog even if both providers are unreachable at the same time.
"""

from datetime import UTC, datetime

import structlog
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import CatalogCache

logger = structlog.get_logger(__name__)


def load_from_cache(db: Session, provider: str) -> dict | None:
    row = db.execute(
        select(CatalogCache).where(
            CatalogCache.provider == provider,
            CatalogCache.expires_at > datetime.now(UTC),
        )
    ).scalar_one_or_none()
    if row and row.raw_data:
        logger.info("catalog cache hit", provider=provider)
        return row.raw_data
    logger.info("catalog cache miss", provider=provider)
    return None


def save_to_cache(db: Session, provider: str, raw_data: dict, ttl_hours: int = 24) -> None:
    from datetime import timedelta

    row = db.execute(
        select(CatalogCache).where(CatalogCache.provider == provider)
    ).scalar_one_or_none()
    expires = datetime.now(UTC) + timedelta(hours=ttl_hours)
    if row:
        row.raw_data = raw_data
        row.expires_at = expires
    else:
        db.add(CatalogCache(provider=provider, raw_data=raw_data, expires_at=expires))
    db.commit()
    logger.info("catalog cache saved", provider=provider, ttl_hours=ttl_hours)
