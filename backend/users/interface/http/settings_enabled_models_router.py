"""Per-user enabled model allowlist — toggle which models from the catalog
the user wants visible in their LLM settings dropdowns.

GET returns the current list; PUT persists a new list, validated against the
curated catalog. System default models can never be disabled.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from auth.dependencies import get_current_user
from core.rate_limit import limiter
from llm.catalog.catalog_refresh import get_full_catalog_entries
from llm.catalog.model_catalog import DEFAULTS
from models import User
from users.application.dto import SaveEnabledModelsInput
from users.container import UsersUseCases, build_users
from users.domain.enabled_models import validate_enabled_models
from users.domain.errors import UserError
from users.interface.http.error_map import to_http_exception

router = APIRouter(tags=["Ajustes de usuario"])


class EnabledModelsUpdate(BaseModel):
    models: list[dict]


def _validate_enabled_models(payload: list[dict]) -> list[dict]:
    # `get_full_catalog_entries` se resuelve por el namespace de ESTE módulo a
    # propósito: un test hace monkeypatch del símbolo aquí.
    return validate_enabled_models(
        payload, full_entries=get_full_catalog_entries(), defaults=DEFAULTS.values()
    )


@router.get("/me/enabled-models", summary="Obtener los modelos habilitados")
def get_enabled_models(current_user: User = Depends(get_current_user)):
    models = current_user.enabled_models or []
    defaults = {(d["provider"], d["model_id"]) for d in DEFAULTS.values()}
    return {"models": models, "defaults": [{"provider": p, "model_id": m} for p, m in defaults]}


@router.put("/me/enabled-models", summary="Actualizar los modelos habilitados")
@limiter.limit("20/minute")
def put_enabled_models(
    request: Request,
    payload: EnabledModelsUpdate,
    current_user: User = Depends(get_current_user),
    users: UsersUseCases = Depends(build_users),
):
    try:
        clean = _validate_enabled_models(payload.models)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None

    try:
        users.save_enabled_models.execute(
            SaveEnabledModelsInput(user_id=current_user.id, models=clean)
        )
    except UserError as err:
        raise to_http_exception(err) from None

    return {"models": clean}
