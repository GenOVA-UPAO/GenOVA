"""Learning-analytics aggregates, scoped by role.

- admin (manage_users): platform-wide across all users/OVAs.
- profesor: restricted to the students linked to them (UserLink, accepted).

All queries are read-only. OVA statuses are the canonical set
{borrador, generando, listo, error}; deleted OVAs (deleted_at) are excluded.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from models import Role, User, UserRole
from ova.models import Ova

_STATUSES = ("borrador", "generando", "listo", "error")
_RECENT_DAYS = 30
_TOP_N = 5


def _is_admin(db: Session, user_id) -> bool:
    return (
        db.execute(
            select(UserRole)
            .join(Role)
            .where(UserRole.user_id == user_id, Role.name == "administrador")
        )
        .scalars()
        .first()
        is not None
    )


def linked_student_ids(db: Session, professor_id) -> list:
    """Accepted, still-linked student user ids for a professor."""
    from models import UserLink

    rows = db.execute(
        select(UserLink.linked_user_id).where(
            UserLink.owner_user_id == professor_id,
            UserLink.status == "accepted",
            UserLink.linked_user_id.isnot(None),
        )
    ).all()
    return [r[0] for r in rows]


def _ova_status_breakdown(db: Session, owner_ids: list | None) -> dict:
    stmt = select(Ova.status, func.count()).where(Ova.deleted_at.is_(None))
    if owner_ids is not None:
        if not owner_ids:
            return dict.fromkeys(_STATUSES, 0)
        stmt = stmt.where(Ova.user_id.in_(owner_ids))
    stmt = stmt.group_by(Ova.status)
    counts = {status: 0 for status in _STATUSES}
    for status, n in db.execute(stmt).all():
        counts[status] = n
    return counts


def _ovas_per_day(db: Session, owner_ids: list | None) -> list[dict]:
    since = datetime.now(UTC) - timedelta(days=_RECENT_DAYS)
    day = func.date_trunc("day", Ova.created_at)
    stmt = select(day.label("d"), func.count()).where(
        Ova.deleted_at.is_(None), Ova.created_at >= since
    )
    if owner_ids is not None:
        if not owner_ids:
            return []
        stmt = stmt.where(Ova.user_id.in_(owner_ids))
    stmt = stmt.group_by("d").order_by("d")
    return [
        {"date": d.date().isoformat() if hasattr(d, "date") else str(d), "count": n}
        for d, n in db.execute(stmt).all()
    ]


def _top_creators(db: Session, owner_ids: list | None) -> list[dict]:
    stmt = (
        select(User.id, User.full_name, User.email, func.count(Ova.id).label("c"))
        .join(Ova, Ova.user_id == User.id)
        .where(Ova.deleted_at.is_(None))
    )
    if owner_ids is not None:
        if not owner_ids:
            return []
        stmt = stmt.where(User.id.in_(owner_ids))
    stmt = stmt.group_by(User.id, User.full_name, User.email).order_by(func.count(Ova.id).desc())
    rows = db.execute(stmt.limit(_TOP_N)).all()
    return [
        {"user_id": str(uid), "name": name or "", "email": email, "ova_count": c}
        for uid, name, email, c in rows
    ]


def _recent_ovas(db: Session, owner_ids: list | None) -> list[dict]:
    stmt = (
        select(Ova.id, Ova.title, Ova.status, Ova.created_at, User.full_name, User.email)
        .join(User, Ova.user_id == User.id)
        .where(Ova.deleted_at.is_(None))
    )
    if owner_ids is not None:
        if not owner_ids:
            return []
        stmt = stmt.where(Ova.user_id.in_(owner_ids))
    stmt = stmt.order_by(Ova.created_at.desc()).limit(10)
    return [
        {
            "id": str(oid),
            "title": title,
            "status": status,
            "owner_name": name or email,
            "created_at": created.isoformat() if created else None,
        }
        for oid, title, status, created, name, email in db.execute(stmt).all()
    ]


def get_analytics(db: Session, user_id) -> dict:
    """Role-scoped analytics payload. Admin → platform; otherwise → linked
    students cohort. `owner_ids=None` means 'all users' (admin scope)."""
    admin = _is_admin(db, user_id)
    if admin:
        owner_ids: list | None = None
        scope = "platform"
        total_students = None
    else:
        owner_ids = linked_student_ids(db, user_id)
        scope = "linked_students"
        total_students = len(owner_ids)

    ova_count_stmt = select(func.count()).select_from(Ova).where(Ova.deleted_at.is_(None))
    if owner_ids is not None:
        ova_count_stmt = ova_count_stmt.where(Ova.user_id.in_(owner_ids or [None]))
    total_ovas = db.scalar(ova_count_stmt) or 0

    total_users = (
        db.scalar(select(func.count()).select_from(User)) if admin else total_students
    ) or 0

    return {
        "scope": scope,
        "totals": {
            "users": total_users,
            "ovas": total_ovas,
            "students": total_students,
        },
        "ova_by_status": _ova_status_breakdown(db, owner_ids),
        "ovas_per_day": _ovas_per_day(db, owner_ids),
        "top_creators": _top_creators(db, owner_ids),
        "recent_ovas": _recent_ovas(db, owner_ids),
    }
