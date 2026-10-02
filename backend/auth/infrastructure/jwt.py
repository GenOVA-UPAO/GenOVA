"""Shared JWT helpers — imported by every auth sub-router (login, register,
verify-email, TOTP) to avoid duplicating the token+cookie+response shape and
a cyclic import."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
from fastapi.responses import JSONResponse

from auth.infrastructure.cookies import set_auth_cookie
from core.config import settings
from core.security import JWT_ALGORITHM, JWT_EXPIRES_MINUTES, JWT_SECRET

# Persistent "remember me" sessions (cookie Max-Age + JWT exp).
JWT_REMEMBER_MINUTES = 60 * 24 * 30  # 30 days
JWT_ISSUER = "genova"
JWT_AUDIENCE = "genova-api"


def decode_session_token(token: str) -> dict:
    """Strict session claims, with a bounded exception for pre-P7 sessions."""
    required = ["sub", "iss", "exp", "iat", "jti"]
    try:
        payload = jwt.decode(
            token, JWT_SECRET, algorithms=[JWT_ALGORITHM], issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE, options={"require": [*required, "aud"], "strict_aud": True},
        )
    except jwt.MissingRequiredClaimError as exc:
        if exc.claim != "aud":
            raise
        # Signature, issuer and every current-format claim remain mandatory.
        payload = jwt.decode(
            token, JWT_SECRET, algorithms=[JWT_ALGORITHM], issuer=JWT_ISSUER,
            options={"require": [*required, "email"], "verify_aud": False},
        )
        if "aud" in payload:
            raise jwt.InvalidAudienceError("Invalid audience") from None
        cutoff = settings.jwt_legacy_issued_before
        lifetime = JWT_REMEMBER_MINUTES * 60
        iat, exp = payload["iat"], payload["exp"]
        if (type(iat) is not int or type(exp) is not int or cutoff <= 0
                or iat > cutoff or datetime.now(UTC).timestamp() > cutoff + lifetime
                or not iat < exp <= iat + lifetime):
            raise jwt.MissingRequiredClaimError("aud") from None
    if (type(payload["iat"]) is not int or type(payload["exp"]) is not int
            or payload["exp"] <= payload["iat"] or not payload["jti"]):
        raise jwt.InvalidTokenError("Invalid session claims")
    return payload


def build_token(user_id: str, email: str, *, expires_minutes: int | None = None) -> str:
    minutes = expires_minutes if expires_minutes is not None else JWT_EXPIRES_MINUTES
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(minutes=minutes),
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
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
