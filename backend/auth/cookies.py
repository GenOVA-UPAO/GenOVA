"""Auth cookie configuration and helpers for httpOnly JWT session cookies."""
import os

from fastapi.responses import JSONResponse

from security import JWT_EXPIRES_MINUTES

_COOKIE_NAME = "genova_token"
_COOKIE_MAX_AGE = JWT_EXPIRES_MINUTES * 60
# When the frontend and backend live on different domains (e.g. Vercel +
# Railway) the session cookie is cross-site, so the browser only attaches it to
# API calls when SameSite=None. None is rejected unless Secure is also set, so
# we force Secure in that case. Same-origin deployments can keep the default.
_COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").lower()
if _COOKIE_SAMESITE not in {"lax", "strict", "none"}:
    _COOKIE_SAMESITE = "lax"
_COOKIE_SECURE = _COOKIE_SAMESITE == "none" or os.getenv("COOKIE_SECURE", "1") != "0"
# CHIPS (Partitioned) silences browser warnings for cross-site SameSite=None cookies.
# Starlette delegates to http.cookies which only gained Partitioned support in Python
# 3.14, so we skip the param and patch the raw Set-Cookie header instead.
_COOKIE_PARTITIONED = _COOKIE_SAMESITE == "none"
_COOKIE_NAME_BYTES = _COOKIE_NAME.encode()


def _patch_partitioned(response: JSONResponse) -> None:
    """Append '; Partitioned' to the genova_token Set-Cookie header."""
    for i, (k, v) in enumerate(response.raw_headers):
        if k == b"set-cookie" and v.startswith(_COOKIE_NAME_BYTES):
            response.raw_headers[i] = (k, v + b"; Partitioned")
            return


def set_auth_cookie(response: JSONResponse, token: str) -> None:
    """Set the httpOnly auth cookie on a response."""
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        max_age=_COOKIE_MAX_AGE,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        path="/",
    )
    if _COOKIE_PARTITIONED:
        _patch_partitioned(response)


def clear_auth_cookie(response: JSONResponse) -> None:
    """Clear the auth cookie (logout)."""
    response.set_cookie(
        key=_COOKIE_NAME,
        value="",
        max_age=0,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        path="/",
    )
    if _COOKIE_PARTITIONED:
        _patch_partitioned(response)
