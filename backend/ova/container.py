"""Composition root de los casos de uso del agregado OVA."""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import get_db
from ova.application.use_cases import DeleteOva, UpdateOvaMetadata
from ova.infrastructure.sqlalchemy_lifecycle_repository import (
    SqlAlchemyOvaLifecycleRepository,
)


@dataclass(frozen=True, slots=True)
class OvaUseCases:
    update_metadata: UpdateOvaMetadata
    delete_ova: DeleteOva


def build_ova(db: Session = Depends(get_db)) -> OvaUseCases:
    lifecycle = SqlAlchemyOvaLifecycleRepository(db)
    return OvaUseCases(
        update_metadata=UpdateOvaMetadata(lifecycle),
        delete_ova=DeleteOva(lifecycle),
    )
