"""Adaptador SQLAlchemy para acceso y persistencia de versiones del editor visual."""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.ids import is_uuid
from editor.application.ports import EditorPhaseRepositoryPort
from models import Ova, OvaPhase, OvaPhaseVersion, OvaVersion


class SqlAlchemyEditorPhaseRepository(EditorPhaseRepositoryPort):
    def __init__(self, db: Session):
        self._db = db

    def get_ova_owner(self, ova_id: str) -> str | None:
        if not is_uuid(ova_id):
            return None
        row = self._db.execute(
            select(Ova.user_id).where(Ova.id == ova_id, Ova.deleted_at.is_(None))
        ).scalar_one_or_none()
        return str(row) if row is not None else None

    def phase_exists(self, ova_id: str, phase_id: str) -> bool:
        if not is_uuid(ova_id) or not is_uuid(phase_id):
            return False
        row = self._db.execute(
            select(OvaPhase.id)
            .join(OvaVersion, OvaPhase.version_id == OvaVersion.id)
            .where(OvaVersion.ova_id == ova_id, OvaPhase.id == phase_id)
        ).scalar_one_or_none()
        return row is not None

    def can_edit(self, ova_id: str, actor_id: str, is_admin: bool) -> bool:
        if is_admin:
            return True
        owner = self.get_ova_owner(ova_id)
        if owner is None:
            return False
        return owner == str(actor_id)

    def get_phase_content(self, ova_id: str, phase_id: str) -> str | None:
        if not is_uuid(ova_id) or not is_uuid(phase_id):
            return None
        active = self._db.execute(
            select(OvaVersion).where(OvaVersion.ova_id == ova_id, OvaVersion.is_active.is_(True))
        ).scalar_one_or_none()
        if active is None:
            return None
        phase = self._db.execute(
            select(OvaPhase).where(OvaPhase.id == phase_id, OvaPhase.version_id == active.id)
        ).scalar_one_or_none()
        return phase.content if phase else None

    def update_phase_and_create_version(
        self,
        ova_id: str,
        phase_id: str,
        html_content: str,
        instruction: str,
    ) -> dict[str, Any]:
        active = self._db.execute(
            select(OvaVersion).where(OvaVersion.ova_id == ova_id, OvaVersion.is_active.is_(True))
        ).scalar_one_or_none()
        if active is None:
            # Si no hay versión activa, buscar la última versión
            active = self._db.execute(
                select(OvaVersion).where(OvaVersion.ova_id == ova_id).order_by(OvaVersion.version_number.desc())
            ).scalars().first()

        phase = self._db.execute(
            select(OvaPhase).where(OvaPhase.id == phase_id)
        ).scalar_one_or_none()

        if phase:
            phase.content = html_content
            phase.regenerated = True

        minor = self._db.execute(
            select(func.max(OvaPhaseVersion.minor_number)).where(
                OvaPhaseVersion.phase_id == phase_id,
                OvaPhaseVersion.ova_id == ova_id,
            )
        ).scalar()
        next_minor = (minor or 0) + 1

        phase_version = OvaPhaseVersion(
            phase_id=phase_id,
            ova_id=ova_id,
            minor_number=next_minor,
            content=html_content,
        )
        self._db.add(phase_version)
        self._db.commit()

        return {
            "minor_number": next_minor,
            "phase_id": phase_id,
            "version_id": str(active.id) if active else None,
        }
