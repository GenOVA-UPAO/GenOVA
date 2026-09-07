"""Composition root de los casos de uso del agregado OVA."""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import get_db
from ova.application.scorm_persist import persist_scorm_zip
from ova.application.use_cases import (
    AddPhase,
    BatchDeleteOvas,
    BatchMoveOvasToTrash,
    BatchRestoreOvas,
    CountTrashedOvas,
    DeleteOva,
    DuplicateOva,
    EditPhases,
    EditSubelement,
    EditView,
    EditorChat,
    ExportScorm,
    ListTrashedOvas,
    PermanentlyDeleteOva,
    PhaseVersions,
    RestoreOva,
    SaveOva,
    UpdateOvaMetadata,
)
from ova.infrastructure.scorm_package_cleaner import ProjectScormPackageCleaner
from ova.infrastructure.sqlalchemy_chat_repository import SqlAlchemyChatRepository
from ova.infrastructure.sqlalchemy_creation_repository import SqlAlchemyOvaCreationRepository
from ova.infrastructure.sqlalchemy_editor_repository import SqlAlchemyOvaEditorRepository
from ova.infrastructure.sqlalchemy_lifecycle_repository import (
    SqlAlchemyOvaLifecycleRepository,
)
from ova.infrastructure.storage_packages import StoragePackageSource
from scorm import build_scorm_zip_bytes


@dataclass(frozen=True, slots=True)
class OvaUseCases:
    save_ova: SaveOva
    duplicate_ova: DuplicateOva
    edit_phases: EditPhases
    edit_subelement: EditSubelement
    add_phase: AddPhase
    edit_view: EditView
    export_scorm: ExportScorm
    editor_chat: EditorChat
    phase_versions: PhaseVersions
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
    creation = SqlAlchemyOvaCreationRepository(db)
    editor = SqlAlchemyOvaEditorRepository(db)
    chat = SqlAlchemyChatRepository(db)
    packages = ProjectScormPackageCleaner()
    downloads = StoragePackageSource()
    return OvaUseCases(
        save_ova=SaveOva(
            creation,
            build_scorm_zip=build_scorm_zip_bytes,
            persist_scorm_zip=persist_scorm_zip,
        ),
        duplicate_ova=DuplicateOva(creation),
        edit_phases=EditPhases(editor),
        edit_subelement=EditSubelement(editor),
        add_phase=AddPhase(editor),
        edit_view=EditView(editor),
        export_scorm=ExportScorm(lifecycle, editor, downloads),
        editor_chat=EditorChat(editor, chat),
        phase_versions=PhaseVersions(editor),
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
