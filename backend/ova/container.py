"""Composition root de los casos de uso del agregado OVA."""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import get_db
from ova.application.use_cases import (
    BatchDeleteOvas,
    BatchMoveOvasToTrash,
    BatchRestoreOvas,
    CountTrashedOvas,
    DeleteOva,
    ListTrashedOvas,
    PermanentlyDeleteOva,
    RestoreOva,
    UpdateOvaMetadata,
)
from ova.infrastructure.scorm_package_cleaner import ProjectScormPackageCleaner
from ova.infrastructure.sqlalchemy_lifecycle_repository import (
    SqlAlchemyOvaLifecycleRepository,
)


@dataclass(frozen=True, slots=True)
class OvaUseCases:
    update_metadata: UpdateOvaMetadata
    delete_ova: DeleteOva
    count_trashed: CountTrashedOvas
    list_trashed: ListTrashedOvas
    restore_ova: RestoreOva
    permanently_delete_ova: PermanentlyDeleteOva
    batch_move_to_trash: BatchMoveOvasToTrash
    batch_restore: BatchRestoreOvas
    batch_permanently_delete: BatchDeleteOvas


def build_ova(db: Session = Depends(get_db)) -> OvaUseCases:
    lifecycle = SqlAlchemyOvaLifecycleRepository(db)
    packages = ProjectScormPackageCleaner()
    return OvaUseCases(
        update_metadata=UpdateOvaMetadata(lifecycle),
        delete_ova=DeleteOva(lifecycle),
        count_trashed=CountTrashedOvas(lifecycle),
        list_trashed=ListTrashedOvas(lifecycle),
        restore_ova=RestoreOva(lifecycle),
        permanently_delete_ova=PermanentlyDeleteOva(lifecycle, packages),
        batch_move_to_trash=BatchMoveOvasToTrash(lifecycle),
        batch_restore=BatchRestoreOvas(lifecycle),
        batch_permanently_delete=BatchDeleteOvas(lifecycle, packages),
    )
