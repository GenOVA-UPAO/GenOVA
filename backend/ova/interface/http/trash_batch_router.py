"""Adaptadores HTTP para operaciones por lotes sobre la papelera."""

from fastapi import APIRouter, Depends, Request

from auth.dependencies import get_current_user
from core.rate_limit import limiter
from ova.application.dto import BatchOvaInput
from ova.container import OvaUseCases, build_ova
from ova.domain.model import OvaActor
from ova.interface.http._shared import BatchIdsRequest

router = APIRouter()


def _input(payload: BatchIdsRequest, current_user) -> BatchOvaInput:
    actor = OvaActor(
        id=str(current_user.id),
        is_admin=bool(current_user.admin_flag_cached),
    )
    return BatchOvaInput(ova_ids=tuple(payload.ova_ids), actor=actor)


@router.post("/lote/papelera", summary="Enviar varias OVA a la papelera")
@limiter.limit("10/minute")
def batch_move_to_trash(
    request: Request,
    payload: BatchIdsRequest,
    current_user=Depends(get_current_user),
    ova: OvaUseCases = Depends(build_ova),
):
    result = ova.batch_move_to_trash.execute(_input(payload, current_user))
    moved = list(result.completed)
    skipped = list(result.skipped)
    return {
        "moved": moved,
        "skipped": skipped,
        "message": f"{len(moved)} OVA(s) movido(s) a la papelera. {len(skipped)} omitido(s).",
    }


@router.post("/lote/restaurar", summary="Restaurar varias OVA")
@limiter.limit("10/minute")
def batch_restore(
    request: Request,
    payload: BatchIdsRequest,
    current_user=Depends(get_current_user),
    ova: OvaUseCases = Depends(build_ova),
):
    result = ova.batch_restore.execute(_input(payload, current_user))
    restored = list(result.completed)
    skipped = list(result.skipped)
    return {
        "restored": restored,
        "skipped": skipped,
        "message": f"{len(restored)} OVA(s) restaurado(s). {len(skipped)} omitido(s).",
    }


@router.delete("/lote/permanente", summary="Eliminar varias OVA de forma permanente")
@limiter.limit("10/minute")
def batch_permanent_delete(
    request: Request,
    payload: BatchIdsRequest,
    current_user=Depends(get_current_user),
    ova: OvaUseCases = Depends(build_ova),
):
    result = ova.batch_permanently_delete.execute(_input(payload, current_user))
    deleted = list(result.completed)
    skipped = list(result.skipped)
    return {
        "deleted": deleted,
        "skipped": skipped,
        "message": (
            f"{len(deleted)} OVA(s) eliminado(s) permanentemente. "
            f"{len(skipped)} omitido(s)."
        ),
    }
