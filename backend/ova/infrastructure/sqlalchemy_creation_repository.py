"""Persistencia SQLAlchemy para crear y duplicar OVAs."""

from __future__ import annotations

import time

import structlog
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.database import commit_or_500
from models import Ova, OvaPhase, OvaVersion, User
from ova.domain.model import OvaDuplicateSource
from ova.domain.model import OvaPhase as DomainOvaPhase
from rag import tie_uploads_to_ova

logger = structlog.get_logger(__name__)

# Lo que una copia hereda del original además del contenido.
COPIED_SETTINGS = (
    "package_theme", "license", "language", "keywords", "educational_level", "audience",
    "typical_learning_time",
)


class SqlAlchemyOvaCreationRepository:
    """Implementa los puertos de creación estructuralmente, sin importarlos."""

    def __init__(self, db: Session, build_scorm_zip=None, persist_scorm_zip=None) -> None:
        self._db = db
        # Los inyecta la raíz de composición (container): la capa de infraestructura
        # no importa la de aplicación.
        self._build_scorm_zip = build_scorm_zip
        self._persist_scorm_zip = persist_scorm_zip
        self._ovas: dict[str, Ova] = {}

    def create_ova(
        self, owner_id: str, title: str, description: str | None, status: str
    ) -> str:
        owner = self._db.get(User, owner_id)
        ova = Ova(user_id=owner_id, title=title, description=description, status=status,
                  author=(owner.full_name or owner.email) if owner else "")
        self._db.add(ova)
        self._db.flush()
        self._ovas[str(ova.id)] = ova
        return str(ova.id)

    def create_version(self, ova_id: str, version_number: int, prompt: str) -> str:
        version = OvaVersion(
            ova_id=ova_id,
            version_number=version_number,
            prompt=prompt,
            is_active=True,
        )
        self._db.add(version)
        self._db.flush()
        return str(version.id)

    def add_phases(self, version_id: str, phases: tuple[DomainOvaPhase, ...]) -> None:
        for phase in phases:
            self._db.add(
                OvaPhase(
                    version_id=version_id,
                    phase_type=phase.type,
                    phase_order=phase.order,
                    content=phase.content,
                    regenerated=False,
                    resource_type_id=phase.resource_type_id,
                    title=phase.title,
                )
            )

    def set_scorm_package(
        self,
        ova_id: str,
        version_id: str,
        storage_key: str | None,
        file_path: str | None,
    ) -> None:
        ova = self._ovas[ova_id]
        ova.storage_key = storage_key
        ova.file_path = file_path
        ova.current_version_id = version_id

    def tie_uploads_to_ova(
        self, upload_ids: tuple[str, ...], ova_id: str, actor_id: str
    ) -> None:
        try:
            tie_uploads_to_ova(self._db, upload_ids, ova_id, user_id=actor_id)
        except Exception:
            logger.exception("failed to tie RAG chunks to ova", ova_id=ova_id)

    def get_duplicate_source(self, ova_id: str) -> OvaDuplicateSource | None:
        ova = self._db.execute(
            select(Ova).where(Ova.id == ova_id, Ova.deleted_at.is_(None))
        ).scalar_one_or_none()
        if ova is None:
            return None

        active_version = self._db.execute(
            select(OvaVersion).where(OvaVersion.ova_id == ova_id, OvaVersion.is_active.is_(True))
        ).scalar_one_or_none()
        prompt = ova.description or ova.title or ""
        phases: tuple[DomainOvaPhase, ...] = ()
        if active_version:
            prompt = active_version.prompt
            phases = tuple(
                DomainOvaPhase(
                    type=phase.phase_type,
                    order=phase.phase_order,
                    content=phase.content,
                    title=phase.title,
                    resource_type_id=phase.resource_type_id,
                )
                for phase in self._db.execute(
                    select(OvaPhase)
                    .where(OvaPhase.version_id == active_version.id)
                    .order_by(OvaPhase.phase_order)
                )
                .scalars()
                .all()
            )
        return OvaDuplicateSource(
            owner_id=str(ova.user_id),
            title=ova.title,
            description=ova.description,
            status=ova.status,
            prompt=prompt,
            phases=phases,
            settings={name: getattr(ova, name) for name in COPIED_SETTINGS},
        )

    def next_copy_title(self, base_title: str, owner_id: str) -> str:
        candidate = f"{base_title} (copia)"
        if not self._title_exists(owner_id, candidate):
            return candidate
        for number in range(2, 12):
            candidate = f"{base_title} (copia {number})"
            if not self._title_exists(owner_id, candidate):
                return candidate
        return f"{base_title} (copia {int(time.time())})"

    def set_current_version(self, ova_id: str, version_id: str) -> None:
        self._ovas[ova_id].current_version_id = version_id

    def apply_settings(self, ova_id: str, settings: dict) -> None:
        """Tema de paquete y metadatos del original (no el autor: lo pone el dueño de la copia)."""
        ova = self._ovas[ova_id]
        for name, value in settings.items():
            if name in COPIED_SETTINGS:
                setattr(ova, name, value)

    def build_package(self, ova_id: str, version_id: str, user_id: str) -> None:
        """Genera el SCORM de la copia, para que se pueda descargar sin regenerar nada."""
        from core.educational_metadata import metadata_from_ova

        if self._build_scorm_zip is None or self._persist_scorm_zip is None:
            return
        ova = self._ovas[ova_id]
        phases = (
            self._db.execute(
                select(OvaPhase).where(OvaPhase.version_id == version_id).order_by(OvaPhase.phase_order)
            )
            .scalars()
            .all()
        )
        zip_bytes = self._build_scorm_zip(
            theme=ova.package_theme,
            course_title=ova.title,
            module_title="OVA Generado por GenOVA",
            metadata=metadata_from_ova(ova),
            phases=[
                {"type": p.phase_type, "order": p.phase_order, "content": p.content, "title": p.title}
                for p in phases
            ],
        )
        ova.storage_key, ova.file_path = self._persist_scorm_zip(zip_bytes, user_id, ova_id, 1)

    def commit(self, operation: str) -> None:
        commit_or_500(self._db, operation)

    def _title_exists(self, owner_id: str, title: str) -> bool:
        return (
            self._db.execute(
                select(Ova).where(
                    Ova.user_id == owner_id,
                    Ova.title == title,
                    Ova.deleted_at.is_(None),
                )
            ).scalar_one_or_none()
            is not None
        )
