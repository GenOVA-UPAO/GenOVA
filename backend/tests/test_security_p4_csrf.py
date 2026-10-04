"""Cookie auth rejects cross-origin writes before consuming a session token."""

import os
import sys
from unittest.mock import Mock

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from fastapi import HTTPException  # noqa: E402
from fastapi.security import HTTPAuthorizationCredentials  # noqa: E402
from starlette.requests import Request  # noqa: E402

from auth.interface.http.dependencies import _extract_token  # noqa: E402
from auth.interface.http.session_router import logout  # noqa: E402
from core.config import settings  # noqa: E402

pytestmark = pytest.mark.usefixtures("accept_bearer")


def request(method="POST", cookie=True, **headers):
    if cookie:
        headers["cookie"] = "genova_token=session"
    return Request({"type": "http", "method": method, "headers": [
        (k.lower().replace("_", "-").encode(), v.encode()) for k, v in headers.items()
    ]})


@pytest.fixture(autouse=True)
def origins(monkeypatch):
    monkeypatch.setattr(settings, "cors_origins", "https://preview.example, https://app.example")
    monkeypatch.setattr(settings, "frontend_url", "https://frontend.example/profile")


@pytest.mark.parametrize("headers", [
    {"origin": "https://evil.example", "sec_fetch_site": "cross-site"},
    {"origin": "null"},
    {"origin": "https://app.example.evil.example"},
    {"origin": "https://app.example/path"},
    {"sec_fetch_site": "same-site"},
    {"sec_fetch_site": "cross-site"},
    {},
])
@pytest.mark.parametrize("method", ["POST", "PATCH", "PUT", "DELETE"])
def test_cookie_write_rejects_untrusted_or_missing_origin(method, headers):
    with pytest.raises(HTTPException) as exc:
        _extract_token(request(method, **headers), None)
    assert exc.value.status_code == 403


@pytest.mark.parametrize("headers", [
    {"origin": "https://app.example", "sec_fetch_site": "cross-site"},
    {"origin": "https://preview.example"},
    {"origin": "https://frontend.example"},
    {"sec_fetch_site": "same-origin"},
])
def test_cookie_write_accepts_explicit_frontend_or_same_origin(headers):
    assert _extract_token(request(**headers), None) == "session"


def test_bearer_only_and_safe_methods_remain_usable():
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="explicit")
    assert _extract_token(request(cookie=False, origin="https://evil.example"), creds) == "explicit"
    for method in ("GET", "HEAD", "OPTIONS"):
        assert _extract_token(request(method), None) == "session"
    # A bearer header must not bypass the preferred cookie's CSRF check.
    with pytest.raises(HTTPException):
        _extract_token(request(origin="https://evil.example"), creds)


def test_logout_checks_cookie_origin_before_revocation():
    auth = Mock()
    with pytest.raises(HTTPException) as exc:
        logout(request(origin="https://evil.example"), None, auth)
    assert exc.value.status_code == 403
    auth.logout_session.execute.assert_not_called()
