"""Adaptadores HTTP para consultar y gestionar la papelera de OVAs."""

from fastapi import APIRouter, Depends, Query, Request

from auth.dependencies import get_current_user
from core.pagination import page_meta
from core.rate_limit import limiter
from ova.application.dto import ManageOvaInput, TrashPageInput
from ova.container import OvaUseCases, build_ova
from ova.domain.errors import OvaError
from ova.domain.model import Ova, OvaActor
from ova.interface.http.error_map import ova_error_to_response
from ova.interface.http.trash_batch_router import router as trash_batch_router

router = APIRouter(tags=["OVA · Papelera"])


def _actor_from_user(user) -> OvaActor:
    return OvaActor(id=str(user.id), is_admin=bool(user.admin_flag_cached))


def _ova_to_dict(ova: Ova, include_owner: bool) -> dict:
    data = {
        "id": ova.id,
        "title": ova.title,
        "description": ova.description,
        "status": ova.status,
        "file_path": ova.file_path,
        "version_number": ova.version_number,
        "created_at": ova.created_at.isoformat() if ova.created_at else None,
        "updated_at": ova.updated_at.isoformat() if ova.updated_at else None,
        "deleted_at": ova.deleted_at.isoformat() if ova.deleted_at else None,
    }
    if include_owner and ova.owner:
        data["owner"] = {"id": ova.owner.id, "full_name": ova.owner.display_name}
    return data


@router.get("/papelera/count", summary="Contar las OVA en la papelera")
def count_trashed_ovas(
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    count = use_cases.count_trashed.execute(_actor_from_user(current_user))
    return {"count": count}


@router.get("/papelera", summary="Listar las OVA en la papelera")
def list_trashed_ovas(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    actor = _actor_from_user(current_user)
    result = use_cases.list_trashed.execute(
        TrashPageInput(actor=actor, page=page, limit=limit)
    )
    return {
        "ovas": [_ova_to_dict(item, include_owner=actor.is_admin) for item in result.ovas],
        **page_meta(result.total_items, result.page, result.limit),
    }


# Batch /lote/* routes registered before /{ova_id}/* so literal paths match first.
router.include_router(trash_batch_router)


@router.patch("/{ova_id}/restaurar", summary="Restaurar una OVA de la papelera")
@limiter.limit("30/minute")
def restore_ova(
    request: Request,
    ova_id: str,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        result = use_cases.restore_ova.execute(
            ManageOvaInput(ova_id=ova_id, actor=_actor_from_user(current_user))
        )
    except OvaError as error:
        return ova_error_to_response(error)
    return {"message": "OVA restaurado correctamente.", "id": result.id}


@router.delete("/{ova_id}/permanente", summary="Eliminar una OVA de forma permanente")
@limiter.limit("20/minute")
def permanent_delete_ova(
    request: Request,
    ova_id: str,
    current_user=Depends(get_current_user),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        result = use_cases.permanently_delete_ova.execute(
            ManageOvaInput(ova_id=ova_id, actor=_actor_from_user(current_user))
        )
    except OvaError as error:
        return ova_error_to_response(error)
    return {"message": "OVA eliminado permanentemente.", "id": result.id}
