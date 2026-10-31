from datetime import UTC, datetime

import bcrypt
import jwt

from core.config import settings

# Validados/centralizados en config.Settings (JWT_SECRET ya se valida allí).
JWT_SECRET = settings.jwt_secret
JWT_ALGORITHM = settings.jwt_algorithm
JWT_EXPIRES_MINUTES = settings.jwt_expires_minutes

# Tope de caracteres en los modelos de request (anti-DoS). bcrypt solo usa los
# primeros 72 bytes; bcrypt>=5 lanza ValueError en vez de truncar, así que
# truncamos aquí de forma explícita y simétrica (hash y verificación).
PASSWORD_MAX_LENGTH = 128
_BCRYPT_MAX_BYTES = 72

# Pre-computed dummy hash used to equalize timing between
# "user not found" and "wrong password" code paths in the login flow.
_DUMMY_HASH = bcrypt.hashpw(b"dummy-password-for-timing", bcrypt.gensalt()).decode("utf-8")


def _bcrypt_input(password: str) -> bytes:
    """Bytes que bcrypt realmente usa: conserva la semántica de bcrypt<5."""
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(_bcrypt_input(password), salt)
    return hashed.decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_bcrypt_input(password), hashed.encode("utf-8"))
    except ValueError:  # hash almacenado mal formado
        return False


def verify_dummy() -> None:
    """Consume bcrypt time without revealing whether a user exists."""
    bcrypt.checkpw(b"dummy-password-for-timing", _DUMMY_HASH.encode("utf-8"))


def password_complexity_ok(password: str) -> bool:
    """At least 8 chars with letters and digits. Shared by register/reset so the
    policy is enforced consistently (registro antes solo validaba longitud)."""
    return len(password) >= 8 and any(c.isalpha() for c in password) and any(
        c.isdigit() for c in password
    )


# Claims de sesión. Viven en core (no en auth.infrastructure) porque el guard de
# auth.interface y otros dominios validan tokens sin depender de infraestructura.
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
