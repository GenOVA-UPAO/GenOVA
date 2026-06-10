"""Read/write the catalog cache in Supabase (table catalog_cache).

A single row per provider stores the raw API response so we can rebuild the
merged catalog even if both providers are unreachable at the same time.
"""

import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import CatalogCache

logger = logging.getLogger(__name__)


def load_from_cache(db: Session, provider: str) -> dict | None:
    row = db.execute(
        select(CatalogCache).where(
            CatalogCache.provider == provider,
            CatalogCache.expires_at > datetime.now(UTC),
        )
    ).scalar_one_or_none()
    if row and row.raw_data:
        logger.info("Catalog cache HIT for provider=%s", provider)
        return row.raw_data
    logger.info("Catalog cache MISS for provider=%s", provider)
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
    logger.info("Catalog cache SAVED for provider=%s TTL=%dh", provider, ttl_hours)
