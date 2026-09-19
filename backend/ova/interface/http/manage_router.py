"""Adaptadores HTTP para actualizar y enviar OVAs a la papelera."""

from fastapi import APIRouter, Depends, Request

from auth.dependencies import get_current_user
from core.rate_limit import limiter
from ova.application.dto import ManageOvaInput, UpdateOvaMetadataInput
from ova.container import OvaUseCases, build_ova
from ova.domain.errors import OvaError
from ova.domain.model import OvaActor
from ova.interface.http._shared import UpdateOvaMetadataRequest
from ova.interface.http.error_map import ova_error_to_response

router = APIRouter(tags=["OVA · CRUD"])


def _actor_from_user(user) -> OvaActor:
    return OvaActor(id=str(user.id), is_admin=bool(user.admin_flag_cached))


@router.patch("/{ova_id}/metadata", summary="Actualizar los metadatos de la OVA")
@limiter.limit("30/minute")
def update_ova_metadata(
    request: Request,
    ova_id: str,
    payload: UpdateOvaMetadataRequest,
    current_user=Depends(get_current_user),
    ova: OvaUseCases = Depends(build_ova),
):
    try:
        result = ova.update_metadata.execute(
            UpdateOvaMetadataInput(
                ova_id=ova_id,
                actor=_actor_from_user(current_user),
                title=payload.title,
                description=payload.description,
            )
        )
    except OvaError as error:
        return ova_error_to_response(error)
    return {
        "id": result.id,
        "title": result.title,
        "description": result.description,
        "message": "Metadatos actualizados correctamente.",
    }


@router.delete("/{ova_id}", summary="Enviar la OVA a la papelera")
@limiter.limit("20/minute")
def delete_ova(
    request: Request,
    ova_id: str,
    current_user=Depends(get_current_user),
    ova: OvaUseCases = Depends(build_ova),
):
    try:
        result = ova.delete_ova.execute(
            ManageOvaInput(ova_id=ova_id, actor=_actor_from_user(current_user))
        )
    except OvaError as error:
        return ova_error_to_response(error)
    return {"message": "OVA eliminado correctamente.", "id": result.id}
