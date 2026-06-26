"""Shared JWT helpers — imported by auth.router and auth.totp_router to avoid a cyclic import."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt

from core.security import JWT_ALGORITHM, JWT_EXPIRES_MINUTES, JWT_SECRET


def build_token(user_id: str, email: str) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRES_MINUTES),
        "iss": "genova",
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
