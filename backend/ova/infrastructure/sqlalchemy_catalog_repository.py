"""Listado paginado de OVAs activas. No importa `ova.application`."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from models import Ova as OvaORM
from models import OvaVersion
from ova.domain.catalog import LISTABLE_STATUSES, OvaListFilter
from ova.domain.model import Ova
from ova.infrastructure.sqlalchemy_lifecycle_repository import _to_domain


class SqlAlchemyOvaCatalogRepository:
    def __init__(self, db: Session, sweep_generating: Callable[[list[Any]], None]) -> None:
        self._db = db
        self._sweep_generating = sweep_generating

    def list_page(self, filters: OvaListFilter) -> tuple[tuple[Ova, ...], int]:
        base_query = self._base_query(filters)
        rows = self._fetch_rows(base_query, filters)
        total_items = self._total_items(base_query, rows, filters.page)
        ovas = [row[0] for row in rows]
        # GN-03: los jobs zombis ("generando" con worker muerto o cola abandonada)
        # solo se barrían al consultar el job exacto; al listar la página los
        # finalizamos aquí para que el badge muestre el estado real.
        self._sweep_generating([ova.id for ova in ovas if ova.status == "generando"])
        mapped = tuple(
            _to_domain(
                row[0],
                version_number=row.active_version_number,
                include_owner=filters.include_owner,
            )
            for row in rows
        )
        return mapped, int(total_items)

    def _base_query(self, filters: OvaListFilter):
        query = select(OvaORM).where(OvaORM.deleted_at.is_(None))
        if filters.owner_id is not None:
            query = query.where(OvaORM.user_id == filters.owner_id)
        if filters.search.strip():
            query = query.where(OvaORM.title.ilike(f"%{filters.search.strip()}%"))
        if filters.status.strip() and filters.status.strip() in LISTABLE_STATUSES:
            query = query.where(OvaORM.status == filters.status.strip())
        return query

    def _fetch_rows(self, base_query, filters: OvaListFilter):
        # El número de versión activa (HU-030) se resuelve con una subconsulta escalar
        # en vez de joinedload(Ova.versions): la colección duplicaba filas e impedía
        # fusionar el COUNT con la consulta de página. Sin duplicación, `count(*) OVER ()`
        # devuelve el total del conjunto filtrado (Postgres evalúa la ventana antes del
        # LIMIT), así que listado y total viajan en un único round-trip (RN-001).
        active_version_sq = (
            select(OvaVersion.version_number)
            .where(OvaVersion.ova_id == OvaORM.id, OvaVersion.is_active.is_(True))
            .correlate(OvaORM)
            .limit(1)
            .scalar_subquery()
        )
        page_query = base_query.add_columns(
            active_version_sq.label("active_version_number"),
            func.count().over().label("total_items"),
        )
        if filters.include_owner:
            # many-to-one: no duplica filas, no afecta a la ventana.
            page_query = page_query.options(joinedload(OvaORM.owner))
        return (
            self._db.execute(
                page_query.order_by(OvaORM.created_at.desc())
                .offset((filters.page - 1) * filters.limit)
                .limit(filters.limit)
            )
            .unique()
            .all()
        )

    def _total_items(self, base_query, rows, page: int) -> int:
        if rows:
            return rows[0].total_items
        if page > 1:
            # Página vacía más allá del final: la ventana no devuelve filas, así que el
            # total se consulta aparte (caso raro, no está en la ruta caliente).
            return self._db.execute(
                select(func.count()).select_from(base_query.subquery())
            ).scalar_one()
        return 0
