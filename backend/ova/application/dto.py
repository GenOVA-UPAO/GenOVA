"""DTOs de entrada y salida del ciclo de vida de una OVA."""

from __future__ import annotations

from dataclasses import dataclass

from ova.domain.model import Ova, OvaActor


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
