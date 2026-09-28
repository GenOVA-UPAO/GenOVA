"""Perfiles de modelos e historial de la config de plataforma (solo admin).

La lógica y la persistencia viven en ``llm.utils.llm_config_versions``; aquí
solo se traducen las peticiones y los errores a HTTP.
"""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from auth.dependencies import require_admin
from core.rate_limit import limiter
from llm.utils import llm_config_store
from llm.utils import llm_config_versions as versions
from models import User

router = APIRouter(tags=["Admin · Plataforma"])
logger = structlog.get_logger(__name__)

_PROFILE_STATUS = {
    "invalid_name": 422,
    "duplicate_name": status.HTTP_409_CONFLICT,
    "limit_reached": status.HTTP_409_CONFLICT,
    "not_found": status.HTTP_404_NOT_FOUND,
}


class ProfileName(BaseModel):
    name: str


class RestoreRequest(BaseModel):
    # «after» deja la config como quedó tras ese cambio; «before», como estaba
    # antes (es lo que hace «Deshacer» justo después de guardar).
    target: str = "after"


def _http(err: versions.ProfileError) -> HTTPException:
    code = _PROFILE_STATUS.get(err.code, status.HTTP_400_BAD_REQUEST)
    return HTTPException(status_code=code, detail=err.message)


def _effective() -> dict:
    from llm.router import effective_llm_config

    return effective_llm_config()


def apply_config(config: dict, user, *, source: str, detail: str | None = None) -> dict:
    """Guarda `config` como config de plataforma y lo anota en el historial."""
    before = _effective()
    try:
        clean = llm_config_store.sanitize_config(config)
        llm_config_store.save_stored(clean)
    except Exception:
        logger.exception("LLM model config write failed", source=source)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo guardar la configuración de modelos.",
        ) from None
    after = _effective()
    entry = versions.record_change(before, after, user, source=source, detail=detail)
    return {
        "config": after,
        "tasks": list(llm_config_store.CONFIG_TASKS),
        "history_entry": entry,
        # Algún modelo del perfil o de la versión ya no está en el catálogo y se
        # descartó: la tarea se quedó con su semilla.
        "incomplete": _dropped(config, clean),
    }


def _dropped(requested: dict, clean: dict) -> bool:
    a, b = versions.snapshot(requested), versions.snapshot(clean)
    return a["defaults"] != b["defaults"] or a["fallbacks"] != b["fallbacks"]


# ── Perfiles ───────────────────────────────────────────────────────────────────


@router.get("/llm-profiles", summary="Listar los perfiles de modelos")
def list_profiles(_admin: User = Depends(require_admin)):
    """Perfiles guardados, cada uno con lo que cambiaría si se aplicara ahora."""
    current = _effective()
    labels = versions.model_labels()
    return {
        "profiles": [versions.profile_view(p, current, labels) for p in versions.load_profiles()],
        "limit": versions.PROFILES_LIMIT,
    }


@router.post(
    "/llm-profiles",
    summary="Guardar la configuración actual como perfil",
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("20/minute")
def create_profile(request: Request, body: ProfileName, admin: User = Depends(require_admin)):
    try:
        profile = versions.create_profile(body.name, _effective(), admin)
    except versions.ProfileError as err:
        raise _http(err) from None
    return {"profile": versions.profile_view(profile, _effective(), versions.model_labels())}


@router.patch("/llm-profiles/{profile_id}", summary="Renombrar un perfil de modelos")
@limiter.limit("20/minute")
def rename_profile(
    request: Request,
    profile_id: str,
    body: ProfileName,
    _admin: User = Depends(require_admin),
):
    try:
        profile = versions.rename_profile(profile_id, body.name)
    except versions.ProfileError as err:
        raise _http(err) from None
    return {"profile": versions.profile_view(profile, _effective(), versions.model_labels())}


@router.delete(
    "/llm-profiles/{profile_id}",
    summary="Borrar un perfil de modelos",
    status_code=status.HTTP_204_NO_CONTENT,
)
@limiter.limit("20/minute")
def delete_profile(request: Request, profile_id: str, _admin: User = Depends(require_admin)):
    try:
        versions.delete_profile(profile_id)
    except versions.ProfileError as err:
        raise _http(err) from None


@router.post("/llm-profiles/{profile_id}/apply", summary="Aplicar un perfil de modelos")
@limiter.limit("10/minute")
def apply_profile(request: Request, profile_id: str, admin: User = Depends(require_admin)):
    try:
        profile = versions.get_profile(profile_id)
    except versions.ProfileError as err:
        raise _http(err) from None
    return apply_config(profile.get("config") or {}, admin, source="profile", detail=profile["name"])


# ── Historial ──────────────────────────────────────────────────────────────────


@router.get("/llm-config/history", summary="Historial de cambios de la config de modelos")
def get_history(_admin: User = Depends(require_admin)):
    return {
        "entries": [versions.public_entry(e) for e in versions.load_history()],
        "limit": versions.HISTORY_LIMIT,
    }


@router.post(
    "/llm-config/history/{entry_id}/restore",
    summary="Restaurar la config de modelos de una entrada del historial",
)
@limiter.limit("10/minute")
def restore_history(
    request: Request,
    entry_id: str,
    body: RestoreRequest | None = None,
    admin: User = Depends(require_admin),
):
    target = (body.target if body else "after").lower()
    if target not in ("after", "before"):
        raise HTTPException(
            status_code=422,
            detail="`target` debe ser «after» o «before».",
        )
    entry = versions.find_history_entry(entry_id)
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Esa versión ya no está en el historial.",
        )
    source = "undo" if target == "before" else "restore"
    return apply_config(entry.get(target) or {}, admin, source=source, detail=entry.get("at"))
