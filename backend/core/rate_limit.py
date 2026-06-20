"""Shared SlowAPI limiter — keyed by client IP. Routers import `limiter` and
decorate endpoints with `@limiter.limit("N/minute")`. The limiter must also
be attached to the FastAPI app in main.py."""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=[])
