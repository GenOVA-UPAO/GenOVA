"""Políticas puras del catálogo de OVAs activas."""

from __future__ import annotations

from dataclasses import dataclass

LISTABLE_STATUSES = frozenset({"borrador", "generando", "listo", "error"})


@dataclass(frozen=True, slots=True)
class OvaListFilter:
    owner_id: str | None
    include_owner: bool
    search: str
    status: str
    page: int
    limit: int
