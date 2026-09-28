"""Persistencia SQLAlchemy para el ciclo de vida de una OVA."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, joinedload

from core.database import commit_or_500
from models import Ova as OvaORM
from models import OvaVersion
from ova.domain.model import Ova, OvaOwner


def _to_domain(
    row: OvaORM,
    *,
    version_number: int | None = None,
    include_owner: bool = False,
) -> Ova:
    owner = row.owner if include_owner else None
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
        owner=(
            OvaOwner(
                id=str(owner.id),
                display_name=str(owner.full_name or owner.email),
            )
            if owner is not None
            else None
        ),
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

    def get_trashed(self, ova_id: str) -> Ova | None:
        row = self._db.execute(
            select(OvaORM).where(OvaORM.id == ova_id, OvaORM.deleted_at.is_not(None))
        ).scalar_one_or_none()
        return self._remember(row)

    def count_trashed(self, owner_id: str | None) -> int:
        query = select(func.count()).select_from(OvaORM).where(OvaORM.deleted_at.is_not(None))
        if owner_id is not None:
            query = query.where(OvaORM.user_id == owner_id)
        return self._db.execute(query).scalar_one()

    def list_trashed(self, owner_id: str | None, offset: int, limit: int) -> list[Ova]:
        query = (
            select(OvaORM, OvaVersion.version_number)
            .outerjoin(
                OvaVersion,
                and_(OvaVersion.ova_id == OvaORM.id, OvaVersion.is_active.is_(True)),
            )
            .where(OvaORM.deleted_at.is_not(None))
            .order_by(OvaORM.deleted_at.desc())
            .offset(offset)
            .limit(limit)
        )
        include_owner = owner_id is None
        if include_owner:
            query = query.options(joinedload(OvaORM.owner))
        else:
            query = query.where(OvaORM.user_id == owner_id)
        rows = self._db.execute(query).all()
        return [
            _to_domain(row, version_number=version_number, include_owner=include_owner)
            for row, version_number in rows
        ]

    def update_metadata(self, ova_id: str, title: str, description: str | None) -> None:
        row = self._loaded[ova_id]
        row.title = title
        row.description = description

    def move_to_trash(self, ova_id: str, deleted_at: datetime) -> None:
        self._loaded[ova_id].deleted_at = deleted_at

    def restore(self, ova_id: str) -> None:
        self._loaded[ova_id].deleted_at = None

    def stage_permanent_delete(self, ova_id: str) -> None:
        self._db.delete(self._loaded[ova_id])

    def commit(self, operation: str) -> None:
        commit_or_500(self._db, operation)

    def _remember(self, row: OvaORM | None) -> Ova | None:
        if row is None:
            return None
        self._loaded[str(row.id)] = row
        return _to_domain(row)
