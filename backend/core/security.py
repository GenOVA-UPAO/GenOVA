import bcrypt

from core.config import settings

# Validados/centralizados en config.Settings (JWT_SECRET ya se valida allí).
JWT_SECRET = settings.jwt_secret
JWT_ALGORITHM = settings.jwt_algorithm
JWT_EXPIRES_MINUTES = settings.jwt_expires_minutes

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
