"""Shared JWT helpers — imported by every auth sub-router (login, register,
verify-email, TOTP) to avoid duplicating the token+cookie+response shape and
a cyclic import."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
from fastapi.responses import JSONResponse

from auth.cookies import set_auth_cookie
from core.security import JWT_ALGORITHM, JWT_EXPIRES_MINUTES, JWT_SECRET

# Persistent "remember me" sessions (cookie Max-Age + JWT exp).
JWT_REMEMBER_MINUTES = 60 * 24 * 30  # 30 days


def build_token(user_id: str, email: str, *, expires_minutes: int | None = None) -> str:
    minutes = expires_minutes if expires_minutes is not None else JWT_EXPIRES_MINUTES
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(minutes=minutes),
        "iss": "genova",
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def issue_session_response(
    user_id: str,
    email: str,
    *,
    extra_content: dict | None = None,
    status_code: int = 200,
    remember_me: bool = False,
) -> JSONResponse:
    """Build a JWT, wrap it in the standard {access_token, token_type,
    expires_in} body (merged with `extra_content`), and attach the httpOnly
    auth cookie. Single source of truth for every endpoint that logs a user
    in: password login, register (verification disabled), email verification
    and TOTP login-step."""
    expires_minutes = JWT_REMEMBER_MINUTES if remember_me else JWT_EXPIRES_MINUTES
    token = build_token(user_id, email, expires_minutes=expires_minutes)
    content = {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": expires_minutes * 60,
    }
    if extra_content:
        content.update(extra_content)
    response = JSONResponse(status_code=status_code, content=content)
    set_auth_cookie(response, token, max_age=expires_minutes * 60)
    return response
