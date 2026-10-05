from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user, require_permission
from core.database import get_db
from core.educational_metadata import metadata_from_ova
from core.pagination import page_meta
from generation.jobs.jobs_service import sweep_stale_jobs_for_ovas
from ova.application.dto import ExportOvaInput, OvaListQuery
from ova.container import OvaUseCases, build_ova
from ova.domain.errors import OvaError
from ova.domain.model import Ova, OvaActor
from ova.interface.http._shared import _is_admin
from ova.interface.http.error_map import ova_error_to_response
from ova.interface.http.export_router import _download_response

router = APIRouter()


def _actor(user, db: Session) -> OvaActor:
    return OvaActor(id=str(user.id), is_admin=_is_admin(user, db))


def _ova_to_dict(ova: Ova, include_owner: bool) -> dict:
    data = {
        "id": ova.id,
        "title": ova.title,
        "description": ova.description,
        **metadata_from_ova(ova).as_dict(),
        "package_theme": ova.package_theme,
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


@router.get("", tags=["OVA · CRUD"], summary="Listar las OVA del usuario")
def list_ovas(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    search: str = Query(default=""),
    status: str = Query(default=""),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    use_cases: OvaUseCases = Depends(build_ova),
):
    actor = _actor(current_user, db)
    list_query = OvaListQuery(
        actor=actor, page=page, limit=limit, search=search, status=status
    )
    # GN-03: barrer jobs zombis de esta página ANTES del listado. El SQL vive
    # en el catálogo; aquí solo se invoca generation desde interface.
    sweep_stale_jobs_for_ovas(db, list(use_cases.list_ovas.generating_ids(list_query)))
    result = use_cases.list_ovas.execute(list_query)
    return {
        "ovas": [_ova_to_dict(item, include_owner=actor.is_admin) for item in result.ovas],
        **page_meta(result.total_items, result.page, result.limit),
    }


@router.get("/{ova_id}/download", tags=["SCORM y descargas"], summary="Descargar la OVA")
def download_ova(
    ova_id: str,
    current_user=Depends(require_permission("export_ova")),
    db: Session = Depends(get_db),
    use_cases: OvaUseCases = Depends(build_ova),
):
    try:
        result = use_cases.export_package.execute(
            ExportOvaInput(ova_id=ova_id, actor=_actor(current_user, db), format="scorm12")
        )
    except OvaError as error:
        return ova_error_to_response(error)
    return _download_response(result)


from ova.interface.http.duplicate_router import router as duplicate_router  # noqa: E402
from ova.interface.http.manage_router import router as manage_router  # noqa: E402
from ova.interface.http.package_theme_router import router as package_theme_router  # noqa: E402
from ova.interface.http.trash_router import router as trash_router  # noqa: E402

router.include_router(trash_router)
router.include_router(duplicate_router)
router.include_router(manage_router)
router.include_router(package_theme_router)
