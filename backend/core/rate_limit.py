"""Shared SlowAPI limiter — keyed by client IP. Routers import `limiter` and
decorate endpoints with `@limiter.limit("N/minute")`. The limiter must also
be attached to the FastAPI app in main.py.

With REDIS_URL set the limiter is backed by Redis (B3) so limits hold across
multiple web instances; without it, falls back to per-process in-memory storage."""

from slowapi import Limiter
from slowapi.util import get_remote_address

from core.config import settings

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    storage_uri=settings.redis_url or None,
)
