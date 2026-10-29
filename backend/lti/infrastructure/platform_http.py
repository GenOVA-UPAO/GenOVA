"""Llamadas salientes a la plataforma LTI: JWKS (verificar id_tokens), token
OAuth2 client_credentials con JWT assertion y publicación de notas (AGS).

El cliente HTTP es un `httpx.Client` inyectable: los tests usan `MockTransport`.
"""

from __future__ import annotations

import json
import threading
import time
import uuid

import httpx
import jwt
import structlog

from lti.domain.claims import AGS_SCOPE_SCORE, score_payload, scores_url
from lti.domain.errors import LtiPlatformError, LtiValidationError
from lti.infrastructure.keys import ToolKey

logger = structlog.get_logger(__name__)

_JWKS_TTL_S = 600.0
_HTTP_TIMEOUT_S = 10.0
_SCORE_MEDIA_TYPE = "application/vnd.ims.lis.v1.score+json"
_CLIENT_ASSERTION_TYPE = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"


def default_http_client() -> httpx.Client:
    return httpx.Client(timeout=_HTTP_TIMEOUT_S, follow_redirects=False)


class PlatformJwks:
    """Caché de los JWKS de cada plataforma. Un `kid` desconocido fuerza una
    relectura (rotación de claves en el LMS), como mucho una vez por petición."""

    def __init__(self, http: httpx.Client | None = None) -> None:
        self._http = http or default_http_client()
        self._cache: dict[str, tuple[float, jwt.PyJWKSet]] = {}
        self._lock = threading.Lock()

    def _fetch(self, url: str) -> jwt.PyJWKSet:
        try:
            response = self._http.get(url, headers={"Accept": "application/json"})
            response.raise_for_status()
            jwks = jwt.PyJWKSet.from_dict(response.json())
        except (httpx.HTTPError, ValueError, jwt.PyJWTError) as exc:
            logger.warning("No se pudo leer el JWKS de la plataforma", url=url, error=str(exc))
            raise LtiPlatformError("No se pudieron leer las claves públicas del LMS.") from exc
        with self._lock:
            self._cache[url] = (time.monotonic(), jwks)
        return jwks

    def _find(self, jwks: jwt.PyJWKSet, kid: str | None) -> jwt.PyJWK | None:
        for key in jwks.keys:
            if kid is None or key.key_id == kid:
                return key
        return None

    def signing_key(self, url: str, kid: str | None) -> jwt.PyJWK:
        cached = self._cache.get(url)
        if cached and time.monotonic() - cached[0] < _JWKS_TTL_S:
            key = self._find(cached[1], kid)
            if key is not None:
                return key
        key = self._find(self._fetch(url), kid)
        if key is None:
            raise LtiValidationError("La firma del id_token usa una clave desconocida.")
        return key


class AgsClient:
    """Publica la nota de un estudiante en el line item del LMS (AGS 2.0)."""

    def __init__(self, http: httpx.Client | None = None) -> None:
        self._http = http or default_http_client()
        self._tokens: dict[tuple[str, str], tuple[float, str]] = {}

    def _client_assertion(self, key: ToolKey, client_id: str, token_url: str) -> str:
        now = int(time.time())
        return key.sign(
            {
                "iss": client_id,
                "sub": client_id,
                "aud": token_url,
                "iat": now,
                "exp": now + 300,
                "jti": uuid.uuid4().hex,
            }
        )

    def access_token(self, key: ToolKey, client_id: str, token_url: str) -> str:
        cache_key = (token_url, client_id)
        cached = self._tokens.get(cache_key)
        if cached and cached[0] > time.monotonic():
            return cached[1]
        try:
            response = self._http.post(
                token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_assertion_type": _CLIENT_ASSERTION_TYPE,
                    "client_assertion": self._client_assertion(key, client_id, token_url),
                    "scope": AGS_SCOPE_SCORE,
                },
                headers={"Accept": "application/json"},
            )
            response.raise_for_status()
            body = response.json()
            token = body["access_token"]
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            logger.warning("El LMS rechazó el token de AGS", url=token_url, error=str(exc))
            raise LtiPlatformError("El LMS no concedió permiso para publicar la nota.") from exc
        ttl = float(body.get("expires_in") or 3600)
        self._tokens[cache_key] = (time.monotonic() + max(0.0, ttl - 60), token)
        return token

    def post_score(
        self,
        key: ToolKey,
        *,
        client_id: str,
        token_url: str,
        lineitem: str,
        user_id: str,
        score: float,
    ) -> dict:
        token = self.access_token(key, client_id, token_url)
        payload = score_payload(user_id, score)
        try:
            response = self._http.post(
                scores_url(lineitem),
                content=json.dumps(payload),
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": _SCORE_MEDIA_TYPE,
                },
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("El LMS rechazó la nota", lineitem=lineitem, error=str(exc))
            raise LtiPlatformError("El LMS no aceptó la nota.") from exc
        return payload
