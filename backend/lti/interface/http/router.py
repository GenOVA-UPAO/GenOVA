"""Endpoints públicos de LTI 1.3 (los llama el LMS o el navegador dentro del LMS).

- `GET  /lti/jwks`                      claves públicas de GenOVA
- `GET|POST /lti/login`                 inicio OIDC (third-party initiated login)
- `POST /lti/launch`                    redirect_uri: valida el id_token
- `GET|POST /lti/deep-link/{token}`     selector de OVA del docente → LtiDeepLinkingResponse
- `GET  /lti/play/{token}/`             reproductor de la OVA (sin editor)
- `GET  /lti/play/{token}/content/...`  archivos del paquete web de la OVA
- `POST /lti/play/{token}/score`        puente runtime → AGS
"""

from __future__ import annotations

import mimetypes
from typing import Annotated

import structlog
from fastapi import APIRouter, Body, Depends, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from starlette.concurrency import run_in_threadpool

from core.config import settings
from core.database import get_db
from core.openapi_tags import TAG_LTI
from core.rate_limit import limiter
from lti.domain.errors import LtiError
from lti.infrastructure import ova_content
from lti.infrastructure.keys import public_jwks
from lti.infrastructure.platform_http import AgsClient, PlatformJwks
from lti.interface.http import pages
from lti.service import (
    SESSION_DEEP_LINK,
    SESSION_PLAY,
    LtiService,
    platform_origins,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/lti", tags=[TAG_LTI])

_STATE_COOKIE_PREFIX = "lti_state_"
_STATE_COOKIE_MAX_AGE = 600

# Cachés compartidas entre peticiones (JWKS de las plataformas, tokens de AGS).
_platform_jwks = PlatformJwks()
_ags_client = AgsClient()


def get_lti_service(db=Depends(get_db)) -> LtiService:
    return LtiService(db, _platform_jwks, _ags_client)


Service = Annotated[LtiService, Depends(get_lti_service)]


def tool_url(request: Request) -> str:
    return (settings.lti_tool_url or str(request.base_url)).rstrip("/")


def _frame_headers(origins: list[str] | None = None) -> dict[str, str]:
    ancestors = " ".join(["'self'", *(origins or [])])
    return {
        "Content-Security-Policy": f"frame-ancestors {ancestors}",
        "Cache-Control": "no-store",
    }


def _html(content: str, status_code: int = 200, origins: list[str] | None = None) -> HTMLResponse:
    # Sin plataforma conocida (error temprano) cualquier LMS https puede enmarcar el
    # mensaje de error: no contiene datos.
    frame = origins if origins is not None else ["https:"]
    return HTMLResponse(content, status_code=status_code, headers=_frame_headers(frame))


def _error(error: LtiError, origins: list[str] | None = None) -> HTMLResponse:
    logger.info("LTI rechazado", reason=error.message, status=error.status_code)
    return _html(pages.error_page(error.message), error.status_code, origins)


def _set_state_cookie(response: Response, state: str) -> None:
    response.set_cookie(
        key=_STATE_COOKIE_PREFIX + state,
        value=state,
        max_age=_STATE_COOKIE_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="none",
        path="/lti",
    )
    # CHIPS: la cookie sobrevive al bloqueo de cookies de terceros dentro del iframe.
    for i, (k, v) in enumerate(response.raw_headers):
        if k == b"set-cookie" and v.startswith((_STATE_COOKIE_PREFIX + state).encode()):
            response.raw_headers[i] = (k, v + b"; Partitioned")


def _clear_state_cookie(response: Response, state: str) -> None:
    response.delete_cookie(
        _STATE_COOKIE_PREFIX + state, path="/lti", secure=True, httponly=True, samesite="none"
    )


@router.get("/jwks", summary="JWKS público de GenOVA como herramienta LTI")
def jwks(db=Depends(get_db)):
    try:
        body = public_jwks(db)
    except LtiError as error:
        return JSONResponse({"detail": error.message}, status_code=error.status_code)
    return JSONResponse(body, headers={"Cache-Control": "public, max-age=300"})


async def _login_params(request: Request) -> dict[str, str]:
    params = dict(request.query_params)
    if request.method == "POST":
        form = await request.form()
        params.update({k: v for k, v in form.items() if isinstance(v, str)})
    return params


async def _login(request: Request, service: LtiService) -> Response:
    params = await _login_params(request)
    try:
        redirect = await run_in_threadpool(
            service.login,
            issuer=params.get("iss", ""),
            login_hint=params.get("login_hint", ""),
            target_link_uri=params.get("target_link_uri", ""),
            redirect_uri=f"{tool_url(request)}/lti/launch",
            client_id=params.get("client_id") or None,
            lti_message_hint=params.get("lti_message_hint") or None,
            deployment_id=params.get("lti_deployment_id") or None,
        )
    except LtiError as error:
        return _error(error)
    response = RedirectResponse(redirect.url, status_code=302)
    _set_state_cookie(response, redirect.state)
    return response


@router.get("/login", summary="Inicio de sesión OIDC (LTI, GET)")
@limiter.limit("60/minute")
async def login_get(request: Request, service: Service):
    return await _login(request, service)


@router.post("/login", summary="Inicio de sesión OIDC (LTI, POST)")
@limiter.limit("60/minute")
async def login_post(request: Request, service: Service):
    return await _login(request, service)


@router.post("/launch", summary="Lanzamiento LTI (redirect_uri del id_token)")
@limiter.limit("60/minute")
def launch(
    request: Request,
    service: Service,
    id_token: Annotated[str, Form()] = "",
    state: Annotated[str, Form()] = "",
):
    if settings.lti_state_cookie_required and (
        not state or request.cookies.get(_STATE_COOKIE_PREFIX + state) != state
    ):
        return _error(
            LtiError(
                "El navegador no devolvió la cookie de seguridad del inicio de sesión. "
                "Abre la actividad en una ventana nueva o permite las cookies de GenOVA."
            ),
        )
    try:
        outcome = service.launch(id_token, state)
    except LtiError as error:
        return _error(error)
    base = tool_url(request)
    target = (
        f"{base}/lti/deep-link/{outcome.token}"
        if outcome.kind == SESSION_DEEP_LINK
        else f"{base}/lti/play/{outcome.token}/"
    )
    response = RedirectResponse(target, status_code=303)
    _clear_state_cookie(response, state)
    return response


@router.get("/deep-link/{token}", summary="Selector de OVA (Deep Linking)")
def deep_link_select(token: str, request: Request, service: Service):
    try:
        launch_row, platform = service.session_launch(token, SESSION_DEEP_LINK)
        owner_id, ovas = service.deep_link_choices(launch_row)
    except LtiError as error:
        return _error(error)
    html = pages.deep_link_page(
        ovas=ovas,
        has_account=owner_id is not None,
        post_url=f"{tool_url(request)}/lti/deep-link/{token}",
    )
    return _html(html, origins=platform_origins(platform))


@router.post("/deep-link/{token}", summary="Devolver la OVA elegida al LMS")
@limiter.limit("30/minute")
def deep_link_submit(
    token: str,
    request: Request,
    service: Service,
    ova_id: Annotated[str, Form()] = "",
):
    try:
        launch_row, platform = service.session_launch(token, SESSION_DEEP_LINK)
        form = service.deep_link_response(
            launch_row, platform, ova_id.strip(), f"{tool_url(request)}/lti/launch"
        )
    except LtiError as error:
        return _error(error)
    html = pages.deep_link_autopost(return_url=form.return_url, token=form.jwt)
    return _html(html, origins=platform_origins(platform))


@router.get("/play/{token}", include_in_schema=False)
def play_without_slash(token: str, request: Request):
    # Las rutas relativas del reproductor (content/…, score) necesitan la barra final.
    return RedirectResponse(f"{tool_url(request)}/lti/play/{token}/", status_code=307)


@router.get("/play/{token}/", summary="Reproductor de la OVA dentro del LMS")
def play(token: str, request: Request, service: Service):
    try:
        launch_row, platform = service.session_launch(token, SESSION_PLAY)
        summary = ova_content.get_ready_ova(service.db, str(launch_row.ova_id))
    except LtiError as error:
        return _error(error)
    if summary is None:
        return _error(LtiError("La OVA de esta actividad ya no está disponible."))
    html = pages.player_page(
        title=summary.title,
        content_url="content/index.html",
        score_url="score",
        has_evaluation=summary.has_evaluation and launch_row.can_post_score,
    )
    return _html(html, origins=platform_origins(platform))


@router.get("/play/{token}/content/{path:path}", include_in_schema=False)
def play_content(token: str, path: str, service: Service):
    try:
        launch_row, _platform = service.session_launch(token, SESSION_PLAY)
    except LtiError as error:
        return _error(error, origins=[])
    package = ova_content.build_player_package(service.db, str(launch_row.ova_id))
    data = package.files.get(path) if package else None
    if data is None:
        return Response("No encontrado", status_code=404, media_type="text/plain")
    media_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
    if media_type.startswith("text/") or media_type in ("application/javascript",):
        media_type += "; charset=utf-8"
    return Response(
        data,
        media_type=media_type,
        headers={
            "Content-Security-Policy": "frame-ancestors 'self'",
            "Cache-Control": "private, max-age=300",
        },
    )


@router.post("/play/{token}/score", summary="Publicar la nota de la OVA en el LMS (AGS)")
@limiter.limit("30/minute")
def play_score(
    token: str,
    request: Request,
    service: Service,
    score: Annotated[float, Body(embed=True, ge=0, le=100)],
):
    try:
        launch_row, platform = service.session_launch(token, SESSION_PLAY)
        result = service.post_score(launch_row, platform, score)
    except LtiError as error:
        return JSONResponse({"detail": error.message}, status_code=error.status_code)
    return JSONResponse(result, headers={"Cache-Control": "no-store"})
