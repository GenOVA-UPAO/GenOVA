"""DTOs de entrada y salida del ciclo de vida de una OVA."""

from __future__ import annotations

from dataclasses import dataclass

from ova.domain.model import Ova, OvaActor, OvaPhase


@dataclass(frozen=True, slots=True)
class UpdateOvaMetadataInput:
    ova_id: str
    actor: OvaActor
    title: str
    description: str | None


@dataclass(frozen=True, slots=True)
class OvaMetadataResult:
    id: str
    title: str
    description: str | None


@dataclass(frozen=True, slots=True)
class ManageOvaInput:
    ova_id: str
    actor: OvaActor


@dataclass(frozen=True, slots=True)
class OvaMutationResult:
    id: str


@dataclass(frozen=True, slots=True)
class TrashPageInput:
    actor: OvaActor
    page: int
    limit: int


@dataclass(frozen=True, slots=True)
class TrashPageResult:
    ovas: tuple[Ova, ...]
    total_items: int
    page: int
    limit: int


@dataclass(frozen=True, slots=True)
class BatchOvaInput:
    ova_ids: tuple[str, ...]
    actor: OvaActor


@dataclass(frozen=True, slots=True)
class BatchOvaResult:
    completed: tuple[str, ...]
    skipped: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class SaveOvaInput:
    actor_id: str
    title: str
    prompt: str
    phases: tuple[OvaPhase, ...]
    upload_ids: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class SaveOvaResult:
    ova_id: str


@dataclass(frozen=True, slots=True)
class DuplicateOvaInput:
    ova_id: str
    actor: OvaActor


@dataclass(frozen=True, slots=True)
class DuplicateOvaResult:
    id: str
    title: str


@dataclass(frozen=True, slots=True)
class PhaseReorder:
    phase_id: str
    new_order: int


@dataclass(frozen=True, slots=True)
class ReorderPhasesInput:
    ova_id: str
    actor: OvaActor
    reorders: tuple[PhaseReorder, ...]


@dataclass(frozen=True, slots=True)
class PhaseContentInput:
    ova_id: str
    phase_id: str
    actor: OvaActor
    content: str


@dataclass(frozen=True, slots=True)
class AddPhaseInput:
    ova_id: str
    actor: OvaActor
    phase_type: str
    prompt: str


@dataclass(frozen=True, slots=True)
class VersionInput:
    ova_id: str
    version_id: str
    actor: OvaActor


@dataclass(frozen=True, slots=True)
class SubelementEditInput:
    ova_id: str
    phase_id: str
    subelement_id: str
    actor: OvaActor
    prompt: str


@dataclass(frozen=True, slots=True)
class PhaseVersionInput:
    ova_id: str
    phase_id: str
    actor: OvaActor
    micro_version_id: str = ""


@dataclass(frozen=True, slots=True)
class PackageDownload:
    kind: str
    filename: str
    url: str | None = None
    file_path: str | None = None
