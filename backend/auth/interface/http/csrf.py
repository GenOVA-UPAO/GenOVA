"""Origin/Fetch-Metadata guard for ambient cookie credentials."""

from urllib.parse import urlsplit

from fastapi import HTTPException, Request

from core.config import settings


def _configured_origin(url: str) -> str | None:
    try:
        parts = urlsplit(url.strip())
        if parts.scheme not in {"http", "https"} or not parts.hostname or parts.username:
            return None
        return f"{parts.scheme}://{parts.netloc}"
    except ValueError:
        return None


def check_cookie_csrf(request: Request) -> None:
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return
    allowed = {
        origin for url in [*settings.cors_origins.split(","), settings.frontend_url]
        if (origin := _configured_origin(url))
    }
    origin = request.headers.get("origin")
    # Explicit cross-site frontends are supported (SameSite=None). "same-site"
    # alone is insufficient: an untrusted sibling subdomain is not our frontend.
    if origin is not None:
        if origin in allowed:
            return
    elif request.headers.get("sec-fetch-site") == "same-origin":
        return
    raise HTTPException(status_code=403, detail="Origen no permitido para autenticación por cookie.")
