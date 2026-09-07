"""Caso de uso: listado paginado de OVAs activas."""

from __future__ import annotations

from dataclasses import dataclass

from ova.application.dto import OvaListPage, OvaListQuery
from ova.application.ports import OvaCatalogRepository
from ova.domain.catalog import OvaListFilter


@dataclass(frozen=True, slots=True)
class ListOvas:
    catalog: OvaCatalogRepository

    def execute(self, data: OvaListQuery) -> OvaListPage:
        ovas, total_items = self.catalog.list_page(
            OvaListFilter(
                owner_id=None if data.actor.is_admin else data.actor.id,
                include_owner=data.actor.is_admin,
                search=data.search,
                status=data.status,
                page=data.page,
                limit=data.limit,
            )
        )
        return OvaListPage(
            ovas=ovas,
            total_items=total_items,
            page=data.page,
            limit=data.limit,
        )
