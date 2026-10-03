"""Persistencia SQLAlchemy de la valoración por recurso. No importa `ova.application`."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from core.database import commit_or_500
from models import ResourceFeedbackRow
from ova.domain.feedback import ResourceFeedback, ResourceFeedbackDraft


def _to_domain(row: ResourceFeedbackRow) -> ResourceFeedback:
    return ResourceFeedback(
        phase_id=str(row.phase_id),
        phase=row.phase,
        resource_type=row.resource_type,
        template_key=row.template_key,
        params=dict(row.params or {}),
        rating=row.rating,
        reason=row.reason,
        comment=row.comment,
        updated_at=row.updated_at,
    )


class SqlAlchemyFeedbackRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def upsert(self, draft: ResourceFeedbackDraft) -> ResourceFeedback:
        values = {
            "user_id": draft.user_id,
            "ova_id": draft.ova_id,
            "phase_id": draft.phase_id,
            "phase": draft.phase,
            "resource_type": draft.resource_type,
            "template_key": draft.template_key,
            "params": draft.params,
            "rating": draft.rating,
            "reason": draft.reason,
            "comment": draft.comment,
        }
        update = {k: v for k, v in values.items() if k not in ("user_id", "phase_id")} | {"updated_at": func.now()}
        stmt = (
            pg_insert(ResourceFeedbackRow)
            .values(**values)
            .on_conflict_do_update(constraint="uq_resource_feedback_user_phase", set_=update)
        )
        self._db.execute(stmt)
        commit_or_500(self._db, "upsert_resource_feedback")
        return self.get(draft.user_id, draft.phase_id)  # type: ignore[return-value]

    def get(self, user_id: str, phase_id: str) -> ResourceFeedback | None:
        row = self._db.execute(
            select(ResourceFeedbackRow).where(
                ResourceFeedbackRow.user_id == user_id, ResourceFeedbackRow.phase_id == phase_id
            )
        ).scalar_one_or_none()
        return _to_domain(row) if row else None

    def list_for_ova(self, user_id: str, ova_id: str) -> tuple[ResourceFeedback, ...]:
        rows = (
            self._db.execute(
                select(ResourceFeedbackRow).where(
                    ResourceFeedbackRow.user_id == user_id, ResourceFeedbackRow.ova_id == ova_id
                )
            )
            .scalars()
            .all()
        )
        return tuple(_to_domain(r) for r in rows)

    def delete(self, user_id: str, phase_id: str) -> bool:
        row = self._db.execute(
            select(ResourceFeedbackRow).where(
                ResourceFeedbackRow.user_id == user_id, ResourceFeedbackRow.phase_id == phase_id
            )
        ).scalar_one_or_none()
        if row is None:
            return False
        self._db.delete(row)
        commit_or_500(self._db, "delete_resource_feedback")
        return True
