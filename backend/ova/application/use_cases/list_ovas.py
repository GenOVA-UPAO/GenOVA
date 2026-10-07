"""Caso de uso: listado paginado de OVAs activas."""

from __future__ import annotations

from dataclasses import dataclass

from ova.application.dto import OvaListPage, OvaListQuery
from ova.application.ports import OvaCatalogRepository
from ova.domain.catalog import OvaListFilter


def _filters(data: OvaListQuery) -> OvaListFilter:
    # «Mis OVAs» son los propios, también para el admin; la vista de toda la
    # plataforma es explícita (`all_users`) y solo existe para él.
    everyone = data.actor.is_admin and data.all_users
    return OvaListFilter(
        owner_id=None if everyone else data.actor.id,
        include_owner=everyone,
        search=data.search,
        status=data.status,
        page=data.page,
        limit=data.limit,
    )


@dataclass(frozen=True, slots=True)
class ListOvas:
    catalog: OvaCatalogRepository

    def generating_ids(self, data: OvaListQuery) -> tuple:
        return self.catalog.list_generating_ids(_filters(data))

    def execute(self, data: OvaListQuery) -> OvaListPage:
        ovas, total_items = self.catalog.list_page(_filters(data))
        return OvaListPage(
            ovas=ovas,
            total_items=total_items,
            page=data.page,
            limit=data.limit,
        )
