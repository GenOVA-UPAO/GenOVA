"""Admin-only user-link management endpoints (list/delete any link).

Adaptador HTTP de los casos de uso de administración de vínculos. Montado
dentro del router de vínculos propios para conservar el prefijo.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Request

from auth.dependencies import require_permission
from core.rate_limit import limiter
from models import User
from users.container import UsersUseCases, build_users
from users.domain.errors import UserError
from users.domain.links import serialize_link
from users.interface.http.error_map import to_http_exception

router = APIRouter(tags=["Admin · Usuarios"])


@router.get("/links/admin", summary="Listar todos los vínculos")
def list_all_links(
    current_user: User = Depends(require_permission("users:link:admin")),
    users: UsersUseCases = Depends(build_users),
):
    result = users.list_all_links.execute()
    return {
        "links": [
            serialize_link(
                link,
                owner=result.participants.get(link.owner_user_id),
                linked=result.participants.get(link.linked_user_id)
                if link.linked_user_id
                else None,
            )
            for link in result.links
        ]
    }


@router.delete("/links/admin/{link_id}", summary="Eliminar cualquier vínculo")
@limiter.limit("20/minute")
def delete_any_link(
    request: Request,
    link_id: UUID,
    current_user: User = Depends(require_permission("users:link:admin")),
    users: UsersUseCases = Depends(build_users),
):
    try:
        users.delete_any_link.execute(link_id)
    except UserError as err:
        raise to_http_exception(err) from None

    return {"status": "ok"}
