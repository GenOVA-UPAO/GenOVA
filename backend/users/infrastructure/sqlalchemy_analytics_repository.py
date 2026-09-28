"""Consultas agregadas de la analítica de aprendizaje (SQLAlchemy, solo lectura).

Los cálculos/formatos viven en `users.domain.analytics`; aquí solo SQL y los
cortocircuitos que evitan consultas con cohortes vacías.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from models import Ova, Role, User, UserRole
from users.domain.analytics import RECENT_DAYS, TOP_N


class SqlAlchemyAnalyticsRepository:
    """Implementa `AnalyticsRepository` estructuralmente (sin importarlo)."""

    def __init__(self, db: Session) -> None:
        self._db = db

    def is_admin(self, user_id) -> bool:
        return (
            self._db.execute(
                select(UserRole)
                .join(Role)
                .where(UserRole.user_id == user_id, Role.name == "administrador")
            )
            .scalars()
            .first()
            is not None
        )

    def linked_student_ids(self, professor_id) -> list:
        """Accepted, still-linked student user ids for a professor."""
        from models import UserLink

        rows = self._db.execute(
            select(UserLink.linked_user_id).where(
                UserLink.owner_user_id == professor_id,
                UserLink.status == "accepted",
                UserLink.linked_user_id.isnot(None),
            )
        ).all()
        return [r[0] for r in rows]

    def count_ovas(self, owner_ids: list | None) -> int:
        stmt = select(func.count()).select_from(Ova).where(Ova.deleted_at.is_(None))
        if owner_ids is not None:
            stmt = stmt.where(Ova.user_id.in_(owner_ids or [None]))
        return self._db.scalar(stmt) or 0

    def count_users(self) -> int:
        return self._db.scalar(select(func.count()).select_from(User))

    def ova_status_breakdown(self, owner_ids: list | None) -> list:
        stmt = select(Ova.status, func.count()).where(Ova.deleted_at.is_(None))
        if owner_ids is not None:
            if not owner_ids:
                return []
            stmt = stmt.where(Ova.user_id.in_(owner_ids))
        return list(self._db.execute(stmt.group_by(Ova.status)).all())

    def ovas_per_day(self, owner_ids: list | None) -> list:
        since = datetime.now(UTC) - timedelta(days=RECENT_DAYS)
        day = func.date_trunc("day", Ova.created_at)
        stmt = select(day.label("d"), func.count()).where(
            Ova.deleted_at.is_(None), Ova.created_at >= since
        )
        if owner_ids is not None:
            if not owner_ids:
                return []
            stmt = stmt.where(Ova.user_id.in_(owner_ids))
        return list(self._db.execute(stmt.group_by("d").order_by("d")).all())

    def top_creators(self, owner_ids: list | None) -> list:
        stmt = (
            select(User.id, User.full_name, User.email, func.count(Ova.id).label("c"))
            .join(Ova, Ova.user_id == User.id)
            .where(Ova.deleted_at.is_(None))
        )
        if owner_ids is not None:
            if not owner_ids:
                return []
            stmt = stmt.where(User.id.in_(owner_ids))
        rows = self._db.execute(
            stmt.group_by(User.id, User.full_name, User.email)
            .order_by(func.count(Ova.id).desc())
            .limit(TOP_N)
        ).all()
        return list(rows)

    def recent_ovas(self, owner_ids: list | None) -> list:
        stmt = (
            select(Ova.id, Ova.title, Ova.status, Ova.created_at, User.full_name, User.email)
            .join(User, Ova.user_id == User.id)
            .where(Ova.deleted_at.is_(None))
        )
        if owner_ids is not None:
            if not owner_ids:
                return []
            stmt = stmt.where(Ova.user_id.in_(owner_ids))
        return list(self._db.execute(stmt.order_by(Ova.created_at.desc()).limit(10)).all())
