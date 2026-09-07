"""Per-user resource generation configs: {"phase:id": {"key": value, ...}}.

Adaptador HTTP de los casos de uso de configuración de recursos.
"""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from auth.dependencies import get_current_user
from core.rate_limit import limiter
from users.application.dto import SaveResourceConfigsInput
from users.container import UsersUseCases, build_users
from users.domain.errors import UserError
from users.interface.http.error_map import to_http_exception

router = APIRouter(tags=["Ajustes de usuario"])


class ResourceConfigsUpdate(BaseModel):
    configs: dict


@router.get("/me/resource-configs", summary="Obtener la configuración de recursos")
def get_resource_configs(
    current_user=Depends(get_current_user),
    users: UsersUseCases = Depends(build_users),
):
    return {"configs": users.get_resource_configs.execute(current_user.id)}


@router.put("/me/resource-configs", summary="Actualizar la configuración de recursos")
@limiter.limit("30/minute")
def put_resource_configs(
    request: Request,
    payload: ResourceConfigsUpdate,
    current_user=Depends(get_current_user),
    users: UsersUseCases = Depends(build_users),
):
    try:
        configs = users.save_resource_configs.execute(
            SaveResourceConfigsInput(user_id=current_user.id, configs=payload.configs)
        )
    except UserError as err:
        raise to_http_exception(err) from None

    return {"configs": configs}
