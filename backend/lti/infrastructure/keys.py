"""Par RSA de GenOVA como herramienta LTI (firma del Deep Linking y del client
assertion de AGS) y su JWKS público.

Orden de búsqueda (como el resto de secretos del repo, primero el entorno):
1. `LTI_PRIVATE_KEY` (PEM PKCS#8/PKCS#1; `\\n` literales se aceptan) y
   `LTI_KEY_ID` opcional (por defecto, el thumbprint RFC 7638 de la clave pública).
2. Tabla `lti_tool_keys`: la clave privada se guarda cifrada con Fernet usando una
   clave derivada (HKDF-SHA256) de `JWT_SECRET`. Si no hay ninguna, se genera una
   RSA-2048 la primera vez. Rotar `JWT_SECRET` invalida esa clave guardada: en ese
   caso se genera otra y hay que dejar que la plataforma vuelva a leer el JWKS.
"""

from __future__ import annotations

import base64
import json
import threading
from dataclasses import dataclass

import jwt
import structlog
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from sqlalchemy.orm import Session

from core.config import settings
from lti.domain.errors import LtiNotConfigured
from lti.infrastructure.orm import LtiToolKey

logger = structlog.get_logger(__name__)

_HKDF_INFO = b"genova-lti-tool-key-v1"


@dataclass(frozen=True, slots=True)
class ToolKey:
    kid: str
    private_key: rsa.RSAPrivateKey

    @property
    def public_jwk(self) -> dict:
        jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(self.private_key.public_key()))
        return {**jwk, "kid": self.kid, "alg": "RS256", "use": "sig"}

    def sign(self, claims: dict) -> str:
        return jwt.encode(claims, self.private_key, algorithm="RS256", headers={"kid": self.kid})


def _fernet() -> Fernet:
    secret = (settings.jwt_secret or "").encode()
    if not secret:
        raise LtiNotConfigured(
            "JWT_SECRET no está configurado: no se pueden cifrar las claves LTI."
        )
    derived = HKDF(algorithm=hashes.SHA256(), length=32, salt=None, info=_HKDF_INFO).derive(secret)
    return Fernet(base64.urlsafe_b64encode(derived))


def thumbprint(private_key: rsa.RSAPrivateKey) -> str:
    """Thumbprint RFC 7638 (SHA-256) de la clave pública, como `kid` estable."""
    numbers = private_key.public_key().public_numbers()

    def b64(n: int) -> str:
        raw = n.to_bytes((n.bit_length() + 7) // 8, "big")
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

    canonical = json.dumps(
        {"e": b64(numbers.e), "kty": "RSA", "n": b64(numbers.n)}, separators=(",", ":")
    ).encode()
    digest = hashes.Hash(hashes.SHA256())
    digest.update(canonical)
    return base64.urlsafe_b64encode(digest.finalize()).rstrip(b"=").decode()


def _load_pem(pem: str) -> rsa.RSAPrivateKey:
    key = serialization.load_pem_private_key(pem.replace("\\n", "\n").encode(), password=None)
    if not isinstance(key, rsa.RSAPrivateKey):
        raise LtiNotConfigured("LTI_PRIVATE_KEY debe ser una clave RSA.")
    return key


def _pem(key: rsa.RSAPrivateKey) -> bytes:
    return key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    )


_lock = threading.Lock()
_cached: ToolKey | None = None


def reset_cache() -> None:
    global _cached
    _cached = None


def get_tool_key(db: Session) -> ToolKey:
    global _cached
    if _cached is not None:
        return _cached
    with _lock:
        if _cached is not None:
            return _cached
        _cached = _resolve(db)
        return _cached


def public_jwks(db: Session) -> dict:
    """JWKS público: la clave en uso y cualquier otra guardada que siga siendo legible
    (si dos procesos generaron clave a la vez, ambas firmas verifican)."""
    current = get_tool_key(db)
    keys = {current.kid: current.public_jwk}
    if not settings.lti_private_key.strip():
        for stored in _stored_keys(db):
            keys.setdefault(stored.kid, stored.public_jwk)
    return {"keys": list(keys.values())}


def _stored_keys(db: Session) -> list[ToolKey]:
    fernet = _fernet()
    found: list[ToolKey] = []
    for row in db.query(LtiToolKey).order_by(LtiToolKey.created_at.desc()).all():
        try:
            key = _load_pem(fernet.decrypt(row.private_key_encrypted.encode()).decode())
        except (InvalidToken, ValueError):
            logger.warning("Clave LTI guardada ilegible (¿cambió JWT_SECRET?)", kid=row.kid)
            continue
        found.append(ToolKey(kid=row.kid, private_key=key))
    return found


def _resolve(db: Session) -> ToolKey:
    env_pem = settings.lti_private_key.strip()
    if env_pem:
        key = _load_pem(env_pem)
        return ToolKey(kid=settings.lti_key_id.strip() or thumbprint(key), private_key=key)

    stored = _stored_keys(db)
    if stored:
        return stored[0]

    fernet = _fernet()
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    kid = thumbprint(key)
    db.add(LtiToolKey(kid=kid, private_key_encrypted=fernet.encrypt(_pem(key)).decode()))
    db.commit()
    logger.info("Generado el par RSA de la herramienta LTI", kid=kid)
    return ToolKey(kid=kid, private_key=key)
