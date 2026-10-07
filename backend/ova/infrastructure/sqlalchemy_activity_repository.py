"""Lectura de los datos estructurados por recurso (`ova_resource_activities`)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import ResourceActivityRow


class SqlAlchemyResourceActivityRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def find_by_hashes(self, hashes: tuple[str, ...]) -> dict[str, dict]:
        if not hashes:
            return {}
        rows = self._db.execute(
            select(
                ResourceActivityRow.content_sha256,
                ResourceActivityRow.template_key,
                ResourceActivityRow.data,
                ResourceActivityRow.params,
            ).where(ResourceActivityRow.content_sha256.in_(hashes))
        ).all()
        return {
            sha: {"template": template, "data": data, "params": dict(params or {})}
            for sha, template, data, params in rows
        }
