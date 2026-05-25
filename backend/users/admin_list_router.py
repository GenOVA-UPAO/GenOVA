"""Admin endpoint: paginated user listing."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from auth.dependencies import require_permission
from database import get_db
from models import Role, User, UserRole

router = APIRouter()


def _serialize_user(u: User, role: Role | None) -> dict:
    return {
        "id": str(u.id),
        "email": u.email,
        "full_name": u.full_name or "",
        "university_id": u.university_id,
        "gender": u.gender or "",
        "phone_number": u.phone_number or "",
        "is_active": u.is_active,
        "failed_login_attempts": u.failed_login_attempts,
        "locked_until": u.locked_until.isoformat() if u.locked_until else None,
        "role": {"id": str(role.id), "name": role.name} if role else None,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


@router.get("/")
def get_users(
    page: int = 1,
    limit: int = 10,
    _: User = Depends(require_permission("manage_users")),
    db: Session = Depends(get_db),
):
    if page < 1:
        page = 1
    if limit < 1 or limit > 100:
        limit = 10

    offset = (page - 1) * limit
    total_items = db.execute(select(func.count(User.id))).scalar() or 0
    total_pages = (total_items + limit - 1) // limit

    users_db = (
        db.execute(
            select(User).order_by(User.created_at.desc()).offset(offset).limit(limit)
        )
        .scalars()
        .all()
    )

    users_list = []
    for u in users_db:
        user_role = (
            db.execute(select(Role).join(UserRole).where(UserRole.user_id == u.id))
            .scalars()
            .first()
        )
        users_list.append(_serialize_user(u, user_role))

    return {
        "total_items": total_items,
        "total_pages": total_pages,
        "page": page,
        "limit": limit,
        "users": users_list,
    }
