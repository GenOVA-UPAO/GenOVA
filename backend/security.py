import os

import bcrypt

JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "1440"))

_WEAK_SECRETS = {"", "change-me", "changeme", "secret", "test"}
if JWT_SECRET in _WEAK_SECRETS or len(JWT_SECRET) < 16:
    raise RuntimeError(
        "JWT_SECRET must be set to a strong random value (>=16 chars). "
        "Generate with: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
    )

# bcrypt truncates input at 72 bytes; we enforce a hard ceiling earlier in the
# request pipeline so the CPU cost of hashing a multi-MB password cannot be
# weaponized as a DoS vector.
PASSWORD_MAX_LENGTH = 128

# Pre-computed dummy hash used to equalize timing between
# "user not found" and "wrong password" code paths in the login flow.
_DUMMY_HASH = bcrypt.hashpw(b"dummy-password-for-timing", bcrypt.gensalt()).decode("utf-8")


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def verify_dummy() -> None:
    """Consume bcrypt time without revealing whether a user exists."""
    bcrypt.checkpw(b"dummy-password-for-timing", _DUMMY_HASH.encode("utf-8"))
