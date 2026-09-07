"""Adaptador SQLAlchemy para los flujos del editor de OVAs."""

from __future__ import annotations

import os

import structlog
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from core.database import commit_or_500
from core.ids import is_uuid
from models import Ova, OvaPhase, OvaPhaseVersion, OvaVersion
from ova.domain.editor import EditorMicroVersion, EditorOva, EditorPhase, EditorVersion
from storage import StorageError, is_configured, upload_zip

logger = structlog.get_logger(__name__)


class SqlAlchemyOvaEditorRepository:
    """Implementa puertos del editor sin importar la capa application."""

    def __init__(self, db: Session) -> None:
        self._db = db
        self._ovas: dict[str, Ova] = {}
        self._versions: dict[str, OvaVersion] = {}

    def get_ova(self, ova_id: str) -> EditorOva | None:
        if not is_uuid(ova_id):
            return None
        row = self._db.execute(
            select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_(None))
        ).scalar_one_or_none()
        if row is None:
            return None
        self._ovas[str(row.id)] = row
        return EditorOva(
            id=str(row.id),
            owner_id=str(row.user_id),
            title=row.title,
            description=row.description,
            status=row.status,
        )

    def get_or_create_active_version(self, ova: EditorOva) -> EditorVersion:
        row = self._db.execute(
            select(OvaVersion).where(OvaVersion.ova_id == ova.id, OvaVersion.is_active.is_(True))
        ).scalar_one_or_none()
        if row is None:
            from scorm import DEFAULT_PHASES

            row = OvaVersion(
                ova_id=ova.id,
                version_number=1,
                prompt=ova.description or ova.title,
                is_active=True,
            )
            self._db.add(row)
            self._db.flush()
            for phase in DEFAULT_PHASES:
                self._db.add(
                    OvaPhase(
                        version_id=row.id,
                        phase_type=phase["type"],
                        phase_order=phase["order"],
                        content=phase["content"],
                        regenerated=False,
                    )
                )
            self._db.flush()
        self._versions[str(row.id)] = row
        return self._version_state(row, with_phases=True)

    def get_active_version(self, ova_id: str) -> EditorVersion | None:
        row = self._db.execute(
            select(OvaVersion).where(OvaVersion.ova_id == ova_id, OvaVersion.is_active.is_(True))
        ).scalar_one_or_none()
        if row is None:
            return None
        self._versions[str(row.id)] = row
        return self._version_state(row)

    def get_phase(self, phase_id: str, version_id: str) -> EditorPhase | None:
        row = self._db.execute(
            select(OvaPhase).where(OvaPhase.id == phase_id, OvaPhase.version_id == version_id)
        ).scalar_one_or_none()
        return self._phase_state(row) if row is not None else None

    def list_phases(self, version_id: str) -> tuple[EditorPhase, ...]:
        return tuple(
            self._phase_state(row)
            for row in self._db.execute(
                select(OvaPhase)
                .where(OvaPhase.version_id == version_id)
                .order_by(OvaPhase.phase_order)
            )
            .scalars()
            .all()
        )

    def get_phases(self, phase_ids: tuple[str, ...], version_id: str) -> tuple[EditorPhase, ...]:
        return tuple(
            self._phase_state(row)
            for row in self._db.execute(
                select(OvaPhase).where(
                    OvaPhase.id.in_(phase_ids), OvaPhase.version_id == version_id
                )
            )
            .scalars()
            .all()
        )

    def reorder(self, reorders: tuple[tuple[str, int], ...]) -> None:
        for phase_id, new_order in reorders:
            self._db.get(OvaPhase, phase_id).phase_order = new_order

    def create_next_version(
        self, ova: EditorOva, active: EditorVersion, phases: tuple[EditorPhase, ...]
    ) -> EditorVersion:
        active_row = self._versions.get(active.id)
        if active_row is None:
            active_row = self._db.get(OvaVersion, active.id)
        active_row.is_active = False
        row = OvaVersion(
            ova_id=ova.id,
            version_number=active.version_number + 1,
            prompt=active.prompt,
            is_active=True,
        )
        self._db.add(row)
        self._db.flush()
        for phase in phases:
            self._db.add(
                OvaPhase(
                    version_id=row.id,
                    phase_type=phase.phase_type,
                    phase_order=phase.phase_order,
                    content=phase.content,
                    regenerated=False,
                )
            )
        self._db.flush()
        self._versions[str(row.id)] = row
        return self._version_state(row, with_phases=True)

    def set_current_version(self, ova_id: str, version_id: str) -> None:
        self._ovas[ova_id].current_version_id = version_id

    def rebuild_scorm(self, ova_id: str, version_id: str, user_id: str) -> None:
        ova = self._ovas[ova_id]
        version = self._versions.get(version_id) or self._db.get(OvaVersion, version_id)
        phases = self.list_phases(version_id)
        from scorm import build_scorm_zip_bytes

        zip_bytes = build_scorm_zip_bytes(
            course_title=ova.title,
            module_title="OVA Generado por GenOVA",
            phases=[
                {"type": phase.phase_type, "order": phase.phase_order, "content": phase.content}
                for phase in phases
            ],
        )
        object_key = f"{user_id}/{ova_id}_v{version.version_number}.zip"
        storage_key: str | None = None
        file_path: str | None = None
        if is_configured():
            try:
                upload_zip(object_key, zip_bytes)
                storage_key = object_key
            except StorageError:
                logger.warning(
                    "supabase upload failed on revert, falling back to disk", object_key=object_key
                )
        if storage_key is None:
            output_dir = os.getenv("OVA_OUTPUT_DIR") or os.path.join(
                os.path.dirname(__file__), "..", "scorm_output"
            )
            os.makedirs(output_dir, exist_ok=True)
            file_path = os.path.join(output_dir, f"{ova_id}_v{version.version_number}.zip")
            with open(file_path, "wb") as output:
                output.write(zip_bytes)
        ova.storage_key = storage_key
        ova.file_path = file_path

    def record_micro_version(self, phase_id: str, ova_id: str, content: str) -> None:
        minor = self._db.execute(
            select(func.max(OvaPhaseVersion.minor_number)).where(
                OvaPhaseVersion.phase_id == phase_id, OvaPhaseVersion.ova_id == ova_id
            )
        ).scalar()
        self._db.add(
            OvaPhaseVersion(
                phase_id=phase_id,
                ova_id=ova_id,
                minor_number=(minor or 0) + 1,
                content=content,
            )
        )

    def count_phases(self, version_id: str, phase_type: str) -> int:
        return self._db.execute(
            select(func.count(OvaPhase.id)).where(
                OvaPhase.version_id == version_id, OvaPhase.phase_type == phase_type
            )
        ).scalar() or 0

    def next_phase_order(self, version_id: str, phase_type: str) -> int:
        highest = self._db.execute(
            select(func.max(OvaPhase.phase_order)).where(
                OvaPhase.version_id == version_id, OvaPhase.phase_type == phase_type
            )
        ).scalar()
        return (highest or 0) + 1

    def add_phase(
        self, version_id: str, phase_type: str, phase_order: int, content: str
    ) -> EditorPhase:
        row = OvaPhase(
            version_id=version_id,
            phase_type=phase_type,
            phase_order=phase_order,
            content=content,
            regenerated=False,
        )
        self._db.add(row)
        self._db.flush()
        return self._phase_state(row)

    def list_versions(self, ova_id: str) -> tuple[EditorVersion, ...]:
        return tuple(
            self._version_state(row)
            for row in self._db.execute(
                select(OvaVersion)
                .where(OvaVersion.ova_id == ova_id)
                .order_by(OvaVersion.version_number.desc())
            )
            .scalars()
            .all()
        )

    def get_version(self, version_id: str, ova_id: str, with_phases: bool = False) -> EditorVersion | None:
        if not is_uuid(version_id) or not is_uuid(ova_id):
            return None
        row = self._db.execute(
            select(OvaVersion).where(OvaVersion.id == version_id, OvaVersion.ova_id == ova_id)
        ).scalar_one_or_none()
        if row is None:
            return None
        self._versions[str(row.id)] = row
        return self._version_state(row, with_phases=with_phases)

    def activate_version(self, ova_id: str, version_id: str) -> None:
        rows = self._db.execute(select(OvaVersion).where(OvaVersion.ova_id == ova_id)).scalars().all()
        for row in rows:
            row.is_active = False
        self._db.flush()
        self._versions[version_id].is_active = True

    def list_micro_versions(self, phase_id: str, ova_id: str) -> tuple[EditorMicroVersion, ...]:
        return tuple(
            EditorMicroVersion(
                id=str(row.id),
                minor_number=row.minor_number,
                content=row.content,
                created_at=row.created_at,
            )
            for row in self._db.execute(
                select(OvaPhaseVersion)
                .where(OvaPhaseVersion.phase_id == phase_id, OvaPhaseVersion.ova_id == ova_id)
                .order_by(OvaPhaseVersion.minor_number.desc())
            )
            .scalars()
            .all()
        )

    def get_micro_version(self, micro_id: str, phase_id: str) -> EditorMicroVersion | None:
        row = self._db.execute(
            select(OvaPhaseVersion).where(
                OvaPhaseVersion.id == micro_id, OvaPhaseVersion.phase_id == phase_id
            )
        ).scalar_one_or_none()
        if row is None:
            return None
        return EditorMicroVersion(
            id=str(row.id),
            minor_number=row.minor_number,
            content=row.content,
            created_at=row.created_at,
        )

    def set_phase_content(self, phase_id: str, content: str) -> None:
        self._db.get(OvaPhase, phase_id).content = content

    def commit(self, operation: str) -> None:
        commit_or_500(self._db, operation)

    @staticmethod
    def _phase_state(row: OvaPhase) -> EditorPhase:
        return EditorPhase(
            id=str(row.id),
            phase_type=row.phase_type,
            phase_order=row.phase_order,
            content=row.content,
            regenerated=row.regenerated,
            resource_type_id=row.resource_type_id,
            title=row.title,
        )

    def _version_state(self, row: OvaVersion, with_phases: bool = False) -> EditorVersion:
        phases = self.list_phases(str(row.id)) if with_phases else ()
        return EditorVersion(
            id=str(row.id),
            version_number=row.version_number,
            prompt=row.prompt,
            is_active=row.is_active,
            created_at=row.created_at,
            phases=phases,
        )
