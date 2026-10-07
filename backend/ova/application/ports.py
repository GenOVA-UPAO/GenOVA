"""Puertos estructurales del ciclo de vida de una OVA."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol

from ova.domain.catalog import OvaListFilter
from ova.domain.chat import ChatMessage, ChatMessageDraft, ChatMessagePatch
from ova.domain.editor import EditorMicroVersion, EditorOva, EditorPhase, EditorVersion
from ova.domain.feedback import ResourceFeedback, ResourceFeedbackDraft
from ova.domain.model import Ova, OvaDuplicateSource, OvaPhase


class OvaLifecycleRepository(Protocol):
    def get_active(self, ova_id: str) -> Ova | None:
        raise NotImplementedError

    def get_trashed(self, ova_id: str) -> Ova | None:
        raise NotImplementedError

    def count_trashed(self, owner_id: str | None) -> int:
        raise NotImplementedError

    def list_trashed(self, owner_id: str | None, offset: int, limit: int) -> list[Ova]:
        raise NotImplementedError

    def update_metadata(self, ova_id: str, title: str, description: str | None, **metadata) -> None:
        raise NotImplementedError

    def update_package_theme(self, ova_id: str, theme: str) -> None:
        raise NotImplementedError

    def move_to_trash(self, ova_id: str, deleted_at: datetime) -> None:
        raise NotImplementedError

    def restore(self, ova_id: str) -> None:
        raise NotImplementedError

    def stage_permanent_delete(self, ova_id: str) -> None:
        raise NotImplementedError

    def commit(self, operation: str) -> None:
        raise NotImplementedError


class ScormPackageCleaner(Protocol):
    def delete(self, file_path: str | None, storage_key: str | None) -> None:
        raise NotImplementedError


class OvaCreationRepository(Protocol):
    def create_ova(
        self, owner_id: str, title: str, description: str | None, status: str
    ) -> str:
        raise NotImplementedError

    def create_version(self, ova_id: str, version_number: int, prompt: str) -> str:
        raise NotImplementedError

    def add_phases(self, version_id: str, phases: tuple[OvaPhase, ...]) -> None:
        raise NotImplementedError

    def set_scorm_package(
        self,
        ova_id: str,
        version_id: str,
        storage_key: str | None,
        file_path: str | None,
    ) -> None:
        raise NotImplementedError

    def tie_uploads_to_ova(
        self, upload_ids: tuple[str, ...], ova_id: str, actor_id: str
    ) -> None:
        raise NotImplementedError

    def commit(self, operation: str) -> None:
        raise NotImplementedError


class OvaDuplicationRepository(Protocol):
    def get_duplicate_source(self, ova_id: str) -> OvaDuplicateSource | None:
        raise NotImplementedError

    def next_copy_title(self, base_title: str, owner_id: str) -> str:
        raise NotImplementedError

    def create_ova(
        self, owner_id: str, title: str, description: str | None, status: str
    ) -> str:
        raise NotImplementedError

    def create_version(self, ova_id: str, version_number: int, prompt: str) -> str:
        raise NotImplementedError

    def add_phases(self, version_id: str, phases: tuple[OvaPhase, ...]) -> None:
        raise NotImplementedError

    def set_current_version(self, ova_id: str, version_id: str) -> None:
        raise NotImplementedError

    def apply_settings(self, ova_id: str, settings: dict) -> None:
        raise NotImplementedError

    def build_package(self, ova_id: str, version_id: str, user_id: str) -> None:
        raise NotImplementedError

    def commit(self, operation: str) -> None:
        raise NotImplementedError


class OvaEditorRepository(Protocol):
    def get_ova(self, ova_id: str) -> EditorOva | None:
        raise NotImplementedError

    def get_or_create_active_version(self, ova: EditorOva) -> EditorVersion:
        raise NotImplementedError

    def get_active_version(self, ova_id: str) -> EditorVersion | None:
        raise NotImplementedError

    def get_phase(self, phase_id: str, version_id: str) -> EditorPhase | None:
        raise NotImplementedError

    def list_phases(self, version_id: str) -> tuple[EditorPhase, ...]:
        raise NotImplementedError

    def get_phases(self, phase_ids: tuple[str, ...], version_id: str) -> tuple[EditorPhase, ...]:
        raise NotImplementedError

    def reorder(self, reorders: tuple[tuple[str, int], ...]) -> None:
        raise NotImplementedError

    def create_next_version(
        self, ova: EditorOva, active: EditorVersion, phases: tuple[EditorPhase, ...]
    ) -> EditorVersion:
        raise NotImplementedError

    def set_current_version(self, ova_id: str, version_id: str) -> None:
        raise NotImplementedError

    def rebuild_scorm(self, ova_id: str, version_id: str, user_id: str) -> None:
        raise NotImplementedError

    def record_micro_version(self, phase_id: str, ova_id: str, content: str) -> None:
        raise NotImplementedError

    def count_phases(self, version_id: str, phase_type: str) -> int:
        raise NotImplementedError

    def next_phase_order(self, version_id: str, phase_type: str) -> int:
        raise NotImplementedError

    def add_phase(
        self, version_id: str, phase_type: str, phase_order: int, content: str
    ) -> EditorPhase:
        raise NotImplementedError

    def list_versions(self, ova_id: str) -> tuple[EditorVersion, ...]:
        raise NotImplementedError

    def get_version(self, version_id: str, ova_id: str, with_phases: bool = False) -> EditorVersion | None:
        raise NotImplementedError

    def activate_version(self, ova_id: str, version_id: str) -> None:
        raise NotImplementedError

    def list_micro_versions(self, phase_id: str, ova_id: str) -> tuple[EditorMicroVersion, ...]:
        raise NotImplementedError

    def get_micro_version(self, micro_id: str, phase_id: str) -> EditorMicroVersion | None:
        raise NotImplementedError

    def set_phase_content(self, phase_id: str, content: str) -> None:
        raise NotImplementedError

    def commit(self, operation: str) -> None:
        raise NotImplementedError


class PackageSource(Protocol):
    def try_signed_url(
        self,
        storage_key: str | None,
        filename: str | None = None,
        ova_id: str | None = None,
    ) -> str | None:
        raise NotImplementedError

    def disk_available(self, file_path: str | None) -> bool:
        raise NotImplementedError


class ExportFormatSpec(Protocol):
    """Un formato de exportación (lo implementa `scorm.ExportFormat`)."""

    @property
    def id(self) -> str:
        raise NotImplementedError

    @property
    def extension(self) -> str:
        raise NotImplementedError

    @property
    def media_type(self) -> str:
        raise NotImplementedError

    def build(
        self, course_title: str, phases: list[dict] | None, *, metadata=None, theme: str = "upao"
    ) -> bytes:
        raise NotImplementedError


class ResourceActivityRepository(Protocol):
    """Datos estructurados de recursos generados por plantilla, por huella del HTML."""

    def find_by_hashes(self, hashes: tuple[str, ...]) -> dict[str, dict]:
        """Huella → {"template", "data", "params"} de las huellas que tengan datos."""
        raise NotImplementedError


class ChatRepository(Protocol):
    def list_messages(self, ova_id: str, limit: int = 200) -> tuple[ChatMessage, ...]:
        raise NotImplementedError

    def create_message(self, draft: ChatMessageDraft) -> ChatMessage:
        raise NotImplementedError

    def update_message(self, patch: ChatMessagePatch) -> ChatMessage | None:
        raise NotImplementedError

    def delete_message(self, ova_id: str, message_id: str) -> bool:
        raise NotImplementedError

    def clear_messages(self, ova_id: str) -> int:
        raise NotImplementedError


class FeedbackRepository(Protocol):
    def upsert(self, draft: ResourceFeedbackDraft) -> ResourceFeedback:
        raise NotImplementedError

    def get(self, user_id: str, phase_id: str) -> ResourceFeedback | None:
        raise NotImplementedError

    def list_for_ova(self, user_id: str, ova_id: str) -> tuple[ResourceFeedback, ...]:
        raise NotImplementedError

    def delete(self, user_id: str, phase_id: str) -> bool:
        raise NotImplementedError


class OvaCatalogRepository(Protocol):
    def list_page(self, filters: OvaListFilter) -> tuple[tuple[Ova, ...], int]:
        raise NotImplementedError

    def list_generating_ids(self, filters: OvaListFilter) -> tuple:
        raise NotImplementedError
