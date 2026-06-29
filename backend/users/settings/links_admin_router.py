"""Admin-only user-link management endpoints (list/delete any link).

Mounted by including it into the user-facing links router, so the paths stay
under the same prefix without changing the users-router wiring.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth.dependencies import require_permission
from core.database import commit_or_500, get_db
from models import User, UserLink
from users.settings.links_helpers import _serialize

router = APIRouter()


@router.get("/links/admin")
def list_all_links(
    current_user: User = Depends(require_permission("users:link:admin")),
    db: Session = Depends(get_db),
):
    del current_user
    links = db.execute(select(UserLink).order_by(UserLink.created_at.desc())).scalars().all()
    user_ids = {lnk.owner_user_id for lnk in links} | {
        lnk.linked_user_id for lnk in links if lnk.linked_user_id
    }
    users_map = (
        {u.id: u for u in db.execute(select(User).where(User.id.in_(user_ids))).scalars().all()}
        if user_ids
        else {}
    )
    return {
        "links": [
            _serialize(
                link,
                owner=users_map.get(link.owner_user_id),
                linked=users_map.get(link.linked_user_id) if link.linked_user_id else None,
            )
            for link in links
        ]
    }


@router.delete("/links/admin/{link_id}")
def delete_any_link(
    link_id: UUID,
    current_user: User = Depends(require_permission("users:link:admin")),
    db: Session = Depends(get_db),
):
    del current_user
    link = db.get(UserLink, link_id)
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vinculo no encontrado.")
    db.delete(link)
    commit_or_500(db, "la desvinculacion")
    return {"status": "ok"}
