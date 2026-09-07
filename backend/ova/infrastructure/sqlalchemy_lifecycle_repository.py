"""Persistencia SQLAlchemy para el ciclo de vida de una OVA."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import commit_or_500
from models import Ova as OvaORM
from ova.domain.model import Ova


def _to_domain(row: OvaORM, *, version_number: int | None = None) -> Ova:
    return Ova(
        id=str(row.id),
        owner_id=str(row.user_id),
        title=str(row.title),
        description=row.description,
        status=str(row.status),
        file_path=str(row.file_path) if row.file_path else None,
        storage_key=str(row.storage_key) if row.storage_key else None,
        version_number=version_number,
        created_at=row.created_at,
        updated_at=row.updated_at,
        deleted_at=row.deleted_at,
    )


class SqlAlchemyOvaLifecycleRepository:
    """Implementa el puerto estructural sin importar `ova.application`."""

    def __init__(self, db: Session) -> None:
        self._db = db
        self._loaded: dict[str, OvaORM] = {}

    def get_active(self, ova_id: str) -> Ova | None:
        row = self._db.execute(
            select(OvaORM).where(OvaORM.id == ova_id, OvaORM.deleted_at.is_(None))
        ).scalar_one_or_none()
        return self._remember(row)

    def update_metadata(self, ova_id: str, title: str, description: str | None) -> None:
        row = self._loaded[ova_id]
        row.title = title
        row.description = description

    def move_to_trash(self, ova_id: str, deleted_at: datetime) -> None:
        self._loaded[ova_id].deleted_at = deleted_at

    def commit(self, operation: str) -> None:
        commit_or_500(self._db, operation)

    def _remember(self, row: OvaORM | None) -> Ova | None:
        if row is None:
            return None
        self._loaded[str(row.id)] = row
        return _to_domain(row)
