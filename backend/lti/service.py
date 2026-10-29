"""Orquestación del flujo LTI 1.3: login OIDC, launch, Deep Linking, sesión LTI
acotada del reproductor y publicación de notas (AGS).

La sesión LTI es un JWT HS256 propio (audiencia `genova-lti`, firmado con
`JWT_SECRET`) que viaja en la URL del reproductor o del selector, no en cookies:
dentro del iframe del LMS las cookies de terceros pueden estar bloqueadas. Solo
identifica un `lti_launches.id`; no sirve como sesión de GenOVA (otra audiencia)
ni da acceso a nada más que a esa OVA y a su nota.
"""

from __future__ import annotations

import secrets
import time
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode, urlsplit

import jwt
import structlog
from sqlalchemy import delete, update
from sqlalchemy.orm import Session

from core.config import settings
from lti.domain.claims import (
    CUSTOM_OVA_ID,
    MSG_DEEP_LINKING,
    LaunchClaims,
    deep_linking_response_claims,
    validate_launch_claims,
)
from lti.domain.errors import (
    LtiError,
    LtiForbidden,
    LtiNotFound,
    LtiValidationError,
)
from lti.infrastructure import ova_content
from lti.infrastructure.keys import get_tool_key
from lti.infrastructure.orm import LtiLaunch, LtiOidcState, LtiPlatform
from lti.infrastructure.platform_http import AgsClient, PlatformJwks

logger = structlog.get_logger(__name__)

STATE_TTL = timedelta(minutes=10)
SESSION_AUDIENCE = "genova-lti"
SESSION_PLAY = "play"
SESSION_DEEP_LINK = "deep-link"
_ID_TOKEN_LEEWAY_S = 60


def _now() -> datetime:
    return datetime.now(UTC)


def _aware(value: datetime | None) -> datetime | None:
    # SQLite (tests) devuelve datetimes sin zona; Postgres, con zona.
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def origin_of(url: str) -> str | None:
    parts = urlsplit(url or "")
    if parts.scheme in ("http", "https") and parts.netloc:
        return f"{parts.scheme}://{parts.netloc}"
    return None


def platform_origins(platform: LtiPlatform) -> list[str]:
    """Orígenes desde los que el LMS puede enmarcar a GenOVA (CSP frame-ancestors)."""
    found = {origin_of(platform.issuer), origin_of(platform.auth_login_url)}
    return sorted(o for o in found if o)


@dataclass(frozen=True, slots=True)
class LoginRedirect:
    url: str
    state: str


@dataclass(frozen=True, slots=True)
class LaunchOutcome:
    kind: str  # SESSION_PLAY | SESSION_DEEP_LINK
    token: str
    platform: LtiPlatform


@dataclass(frozen=True, slots=True)
class DeepLinkForm:
    return_url: str
    jwt: str


class LtiService:
    def __init__(self, db: Session, jwks: PlatformJwks, ags: AgsClient) -> None:
        self.db = db
        self.jwks = jwks
        self.ags = ags

    # --- login OIDC (third-party initiated) ------------------------------------

    def find_platform(self, issuer: str, client_id: str | None) -> LtiPlatform:
        query = self.db.query(LtiPlatform).filter(
            LtiPlatform.issuer == issuer, LtiPlatform.is_active.is_(True)
        )
        if client_id:
            query = query.filter(LtiPlatform.client_id == client_id)
        platforms = query.all()
        if not platforms:
            raise LtiNotFound("Esta plataforma no está registrada en GenOVA.")
        if len(platforms) > 1:
            raise LtiValidationError("Hay varias plataformas con ese issuer: falta client_id.")
        return platforms[0]

    def login(
        self,
        *,
        issuer: str,
        login_hint: str,
        target_link_uri: str,
        redirect_uri: str,
        client_id: str | None = None,
        lti_message_hint: str | None = None,
        deployment_id: str | None = None,
    ) -> LoginRedirect:
        if not issuer or not login_hint or not target_link_uri:
            raise LtiValidationError("Faltan iss, login_hint o target_link_uri.")
        platform = self.find_platform(issuer, client_id)
        if deployment_id and deployment_id not in (platform.deployment_ids or []):
            raise LtiValidationError("El deployment_id no está registrado para esta plataforma.")

        now = _now()
        self.db.execute(
            delete(LtiOidcState).where(LtiOidcState.expires_at < now - timedelta(days=1))
        )
        state = secrets.token_urlsafe(32)
        nonce = secrets.token_urlsafe(32)
        self.db.add(
            LtiOidcState(
                state=state, nonce=nonce, platform_id=platform.id, expires_at=now + STATE_TTL
            )
        )
        self.db.commit()

        params = {
            "scope": "openid",
            "response_type": "id_token",
            "response_mode": "form_post",
            "prompt": "none",
            "client_id": platform.client_id,
            "redirect_uri": redirect_uri,
            "login_hint": login_hint,
            "state": state,
            "nonce": nonce,
        }
        if lti_message_hint:
            params["lti_message_hint"] = lti_message_hint
        separator = "&" if "?" in platform.auth_login_url else "?"
        return LoginRedirect(
            url=f"{platform.auth_login_url}{separator}{urlencode(params)}", state=state
        )

    # --- launch ------------------------------------------------------------------

    def _consume_state(self, state: str) -> LtiOidcState:
        row = self.db.get(LtiOidcState, state) if state else None
        if row is None:
            raise LtiValidationError("El inicio de sesión LTI no es válido (state desconocido).")
        now = _now()
        consumed = self.db.execute(
            update(LtiOidcState)
            .where(
                LtiOidcState.state == state,
                LtiOidcState.used_at.is_(None),
                LtiOidcState.expires_at > now,
            )
            .values(used_at=now)
            .execution_options(synchronize_session=False)
        ).rowcount
        self.db.commit()
        if consumed != 1:
            raise LtiValidationError("El inicio de sesión LTI caducó o ya se usó (nonce repetido).")
        self.db.refresh(row)
        return row

    def _decode_id_token(self, id_token: str, platform: LtiPlatform) -> dict:
        try:
            header = jwt.get_unverified_header(id_token)
        except jwt.PyJWTError as exc:
            raise LtiValidationError("El id_token no es un JWT válido.") from exc
        if header.get("alg") != "RS256":
            raise LtiValidationError("El id_token debe firmarse con RS256.")
        key = self.jwks.signing_key(platform.jwks_url, header.get("kid"))
        try:
            return jwt.decode(
                id_token,
                key.key,
                algorithms=["RS256"],
                audience=platform.client_id,
                issuer=platform.issuer,
                leeway=_ID_TOKEN_LEEWAY_S,
                options={"require": ["exp", "iat", "iss", "aud", "sub", "nonce"]},
            )
        except jwt.InvalidSignatureError as exc:
            raise LtiValidationError("La firma del id_token no es válida.") from exc
        except jwt.InvalidAudienceError as exc:
            raise LtiValidationError("El id_token no está dirigido a GenOVA (aud).") from exc
        except jwt.InvalidIssuerError as exc:
            raise LtiValidationError("El emisor del id_token no coincide (iss).") from exc
        except jwt.ExpiredSignatureError as exc:
            raise LtiValidationError("El id_token caducó.") from exc
        except jwt.PyJWTError as exc:
            raise LtiValidationError(f"id_token inválido: {exc}") from exc

    def validate_launch(self, id_token: str, state: str) -> tuple[LtiPlatform, LaunchClaims]:
        if not id_token:
            raise LtiValidationError("Falta el id_token.")
        state_row = self._consume_state(state)
        platform = self.db.get(LtiPlatform, state_row.platform_id)
        if platform is None or not platform.is_active:
            raise LtiNotFound("Esta plataforma no está registrada en GenOVA.")
        payload = self._decode_id_token(id_token, platform)
        claims = validate_launch_claims(
            payload,
            client_id=platform.client_id,
            expected_nonce=state_row.nonce,
            deployment_ids=list(platform.deployment_ids or []),
        )
        return platform, claims

    def launch(self, id_token: str, state: str) -> LaunchOutcome:
        platform, claims = self.validate_launch(id_token, state)
        now = _now()
        row = LtiLaunch(
            id=uuid.uuid4(),
            platform_id=platform.id,
            deployment_id=claims.deployment_id,
            message_type=claims.message_type,
            subject=claims.subject,
            email=claims.email,
            ags_lineitem=claims.ags_lineitem,
            can_post_score=claims.can_post_score,
            expires_at=now + timedelta(hours=settings.lti_session_hours),
        )
        if claims.message_type == MSG_DEEP_LINKING:
            if not claims.is_instructor:
                raise LtiForbidden("Solo el docente del curso puede elegir una OVA.")
            if (
                claims.deep_link_accept_types
                and "ltiResourceLink" not in claims.deep_link_accept_types
            ):
                raise LtiValidationError("El LMS no acepta enlaces LTI en esta ubicación.")
            row.deep_link_return_url = claims.deep_link_return_url
            row.deep_link_data = claims.deep_link_data
            kind = SESSION_DEEP_LINK
        else:
            ova_id = str(claims.custom.get(CUSTOM_OVA_ID) or "").strip()
            ova = ova_content.get_ready_ova(self.db, ova_id) if _is_uuid(ova_id) else None
            if ova is None:
                raise LtiNotFound(
                    "La OVA de esta actividad ya no está disponible. Pide al docente que la vuelva a elegir."
                )
            row.ova_id = uuid.UUID(ova.id)
            row.has_evaluation = ova.has_evaluation
            kind = SESSION_PLAY
        self.db.add(row)
        self.db.commit()
        logger.info(
            "Lanzamiento LTI aceptado",
            platform=str(platform.id),
            message_type=claims.message_type,
            launch=str(row.id),
        )
        return LaunchOutcome(
            kind=kind, token=issue_session_token(str(row.id), kind), platform=platform
        )

    # --- sesión LTI acotada ----------------------------------------------------

    def session_launch(self, token: str, kind: str) -> tuple[LtiLaunch, LtiPlatform]:
        launch_id = read_session_token(token, kind)
        launch = self.db.get(LtiLaunch, uuid.UUID(launch_id))
        if launch is None or _aware(launch.expires_at) < _now():
            raise LtiValidationError(
                "La sesión LTI caducó. Vuelve a abrir la actividad desde el LMS."
            )
        platform = self.db.get(LtiPlatform, launch.platform_id)
        if platform is None or not platform.is_active:
            raise LtiNotFound("Esta plataforma ya no está registrada en GenOVA.")
        return launch, platform

    # --- Deep Linking -----------------------------------------------------------

    def deep_link_choices(
        self, launch: LtiLaunch
    ) -> tuple[str | None, list[ova_content.OvaSummary]]:
        owner_id = ova_content.find_user_id_by_email(self.db, launch.email)
        if owner_id is None:
            return None, []
        return owner_id, ova_content.list_ready_ovas(self.db, owner_id)

    def deep_link_response(
        self, launch: LtiLaunch, platform: LtiPlatform, ova_id: str, launch_url: str
    ) -> DeepLinkForm:
        if launch.consumed_at is not None:
            raise LtiValidationError(
                "Esta selección ya se envió al LMS. Vuelve a empezar desde el curso."
            )
        owner_id, choices = self.deep_link_choices(launch)
        chosen = next((o for o in choices if o.id == ova_id), None)
        if owner_id is None or chosen is None:
            raise LtiForbidden("Esa OVA no es tuya o todavía no está lista.")
        claims = deep_linking_response_claims(
            client_id=platform.client_id,
            platform_issuer=platform.issuer,
            deployment_id=launch.deployment_id,
            nonce=secrets.token_urlsafe(16),
            now=int(time.time()),
            data=launch.deep_link_data,
            launch_url=launch_url,
            ova_id=chosen.id,
            title=chosen.title,
            with_line_item=chosen.has_evaluation,
        )
        token = get_tool_key(self.db).sign(claims)
        launch.consumed_at = _now()
        self.db.commit()
        return DeepLinkForm(return_url=launch.deep_link_return_url or "", jwt=token)

    # --- AGS --------------------------------------------------------------------

    def post_score(self, launch: LtiLaunch, platform: LtiPlatform, score: float) -> dict:
        if not launch.has_evaluation:
            return {"sent": False, "reason": "sin_evaluacion"}
        if not launch.can_post_score or not launch.ags_lineitem:
            return {"sent": False, "reason": "sin_ags"}
        payload = self.ags.post_score(
            get_tool_key(self.db),
            client_id=platform.client_id,
            token_url=platform.auth_token_url,
            lineitem=launch.ags_lineitem,
            user_id=launch.subject,
            score=score,
        )
        launch.last_score = f"{payload['scoreGiven']:g}"
        self.db.commit()
        return {"sent": True, "score": payload["scoreGiven"]}


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
    except (ValueError, TypeError):
        return False
    return True


def issue_session_token(launch_id: str, kind: str) -> str:
    now = int(time.time())
    return jwt.encode(
        {
            "lid": launch_id,
            "typ": kind,
            "aud": SESSION_AUDIENCE,
            "iat": now,
            "exp": now + settings.lti_session_hours * 3600,
        },
        settings.jwt_secret,
        algorithm="HS256",
    )


def read_session_token(token: str, kind: str) -> str:
    try:
        claims = jwt.decode(
            token, settings.jwt_secret, algorithms=["HS256"], audience=SESSION_AUDIENCE
        )
    except jwt.ExpiredSignatureError as exc:
        raise LtiValidationError(
            "La sesión LTI caducó. Vuelve a abrir la actividad desde el LMS."
        ) from exc
    except jwt.PyJWTError as exc:
        raise LtiValidationError("Sesión LTI no válida.") from exc
    if claims.get("typ") != kind or not _is_uuid(str(claims.get("lid"))):
        raise LtiValidationError("Sesión LTI no válida.")
    return str(claims["lid"])


__all__ = [
    "LtiError",
    "LtiService",
    "issue_session_token",
    "platform_origins",
    "read_session_token",
]
