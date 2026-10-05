"""Claims de LTI 1.3 / LTI Advantage y reglas puras sobre ellos (sin I/O).

La firma del id_token, `iss`, `aud`, `exp`/`iat` las comprueba PyJWT en la capa
de infraestructura; aquí se validan el resto de reglas del Core 1.3 sobre el
payload ya verificado (azp, nonce, deployment, versión, tipo de mensaje).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from urllib.parse import urlsplit, urlunsplit

from lti.domain.errors import LtiValidationError

LTI_VERSION = "1.3.0"
CLAIM = "https://purl.imsglobal.org/spec/lti/claim/"
DL_CLAIM = "https://purl.imsglobal.org/spec/lti-dl/claim/"
AGS_CLAIM_ENDPOINT = "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint"
AGS_SCOPE_SCORE = "https://purl.imsglobal.org/spec/lti-ags/scope/score"

MSG_RESOURCE_LINK = "LtiResourceLinkRequest"
MSG_DEEP_LINKING = "LtiDeepLinkingRequest"
MSG_DEEP_LINKING_RESPONSE = "LtiDeepLinkingResponse"
SUPPORTED_MESSAGES = frozenset({MSG_RESOURCE_LINK, MSG_DEEP_LINKING})

# Roles (contexto e institución) que pueden elegir contenido con Deep Linking.
_INSTRUCTOR_ROLE_SUFFIXES = (
    "membership#Instructor",
    "membership#ContentDeveloper",
    "membership#Administrator",
    "institution/person#Administrator",
    "system/person#Administrator",
)

CUSTOM_OVA_ID = "ova_id"
SCORE_MAXIMUM = 100.0


@dataclass(frozen=True, slots=True)
class LaunchClaims:
    """Lo que GenOVA usa de un id_token ya validado."""

    message_type: str
    deployment_id: str
    subject: str
    nonce: str
    email: str | None
    name: str | None
    roles: tuple[str, ...]
    custom: dict = field(default_factory=dict)
    resource_link_id: str | None = None
    deep_link_return_url: str | None = None
    deep_link_data: str | None = None
    deep_link_accept_types: tuple[str, ...] = ()
    ags_lineitem: str | None = None
    ags_scopes: tuple[str, ...] = ()

    @property
    def is_instructor(self) -> bool:
        return any(role.endswith(_INSTRUCTOR_ROLE_SUFFIXES) for role in self.roles)

    @property
    def can_post_score(self) -> bool:
        return bool(self.ags_lineitem) and AGS_SCOPE_SCORE in self.ags_scopes


def _str_claim(payload: dict, name: str) -> str:
    value = payload.get(name)
    if not isinstance(value, str) or not value:
        raise LtiValidationError(f"Falta el claim {name}.")
    return value


def validate_launch_claims(
    payload: dict,
    *,
    client_id: str,
    expected_nonce: str,
    deployment_ids: tuple[str, ...] | list[str],
) -> LaunchClaims:
    """Reglas del Core 1.3 sobre un payload con firma, iss, aud y exp ya verificados."""
    aud = payload.get("aud")
    audiences = aud if isinstance(aud, list) else [aud]
    azp = payload.get("azp")
    if len(audiences) > 1 and not azp:
        raise LtiValidationError("Con varias audiencias el claim azp es obligatorio.")
    if azp is not None and azp != client_id:
        raise LtiValidationError("El claim azp no corresponde a GenOVA.")
    if payload.get("nonce") != expected_nonce:
        raise LtiValidationError("El nonce no coincide con el del inicio de sesión.")
    if payload.get(CLAIM + "version") != LTI_VERSION:
        raise LtiValidationError("Versión de LTI no soportada (se requiere 1.3.0).")
    message_type = _str_claim(payload, CLAIM + "message_type")
    if message_type not in SUPPORTED_MESSAGES:
        raise LtiValidationError(f"Tipo de mensaje LTI no soportado: {message_type}.")
    deployment_id = _str_claim(payload, CLAIM + "deployment_id")
    if deployment_id not in deployment_ids:
        raise LtiValidationError("El deployment_id no está registrado para esta plataforma.")
    subject = _str_claim(payload, "sub")

    roles = payload.get(CLAIM + "roles") or []
    custom = payload.get(CLAIM + "custom") or {}
    resource_link = payload.get(CLAIM + "resource_link") or {}
    dl_settings = payload.get(DL_CLAIM + "deep_linking_settings") or {}
    ags = payload.get(AGS_CLAIM_ENDPOINT) or {}

    if message_type == MSG_RESOURCE_LINK and not resource_link.get("id"):
        raise LtiValidationError("Falta el claim resource_link.")
    if message_type == MSG_DEEP_LINKING and not dl_settings.get("deep_link_return_url"):
        raise LtiValidationError("Falta deep_link_return_url en deep_linking_settings.")

    return LaunchClaims(
        message_type=message_type,
        deployment_id=deployment_id,
        subject=subject,
        nonce=expected_nonce,
        email=payload.get("email") or None,
        name=payload.get("name") or None,
        roles=tuple(r for r in roles if isinstance(r, str)),
        custom=custom if isinstance(custom, dict) else {},
        resource_link_id=resource_link.get("id"),
        deep_link_return_url=dl_settings.get("deep_link_return_url"),
        deep_link_data=dl_settings.get("data"),
        deep_link_accept_types=tuple(dl_settings.get("accept_types") or ()),
        ags_lineitem=ags.get("lineitem") or None,
        ags_scopes=tuple(ags.get("scope") or ()),
    )


def deep_linking_response_claims(
    *,
    client_id: str,
    platform_issuer: str,
    deployment_id: str,
    nonce: str,
    now: int,
    data: str | None,
    launch_url: str,
    ova_id: str,
    title: str,
    with_line_item: bool,
    ttl_seconds: int = 300,
) -> dict:
    """Payload del `LtiDeepLinkingResponse` con un `ltiResourceLink` a la OVA."""
    item: dict = {
        "type": "ltiResourceLink",
        "title": title,
        "url": launch_url,
        "custom": {CUSTOM_OVA_ID: ova_id},
    }
    if with_line_item:
        item["lineItem"] = {"scoreMaximum": SCORE_MAXIMUM, "label": title, "resourceId": ova_id}
    claims = {
        "iss": client_id,
        "aud": platform_issuer,
        "iat": now,
        "exp": now + ttl_seconds,
        "nonce": nonce,
        CLAIM + "message_type": MSG_DEEP_LINKING_RESPONSE,
        CLAIM + "version": LTI_VERSION,
        CLAIM + "deployment_id": deployment_id,
        DL_CLAIM + "content_items": [item],
    }
    if data:
        claims[DL_CLAIM + "data"] = data
    return claims


def scores_url(lineitem: str) -> str:
    """`…/lineitems/5/lineitem?type_id=1` → `…/lineitems/5/lineitem/scores?type_id=1`."""
    parts = urlsplit(lineitem)
    path = parts.path.rstrip("/") + "/scores"
    return urlunsplit((parts.scheme, parts.netloc, path, parts.query, parts.fragment))


def score_payload(user_id: str, score: float, when: datetime | None = None) -> dict:
    """Cuerpo `application/vnd.ims.lis.v1.score+json` (escala 0-100)."""
    given = max(0.0, min(SCORE_MAXIMUM, float(score)))
    timestamp = (when or datetime.now(UTC)).isoformat(timespec="milliseconds")
    return {
        "userId": user_id,
        "scoreGiven": given,
        "scoreMaximum": SCORE_MAXIMUM,
        "activityProgress": "Completed",
        "gradingProgress": "FullyGraded",
        "timestamp": timestamp,
    }
