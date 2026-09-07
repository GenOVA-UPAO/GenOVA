"""Composition root del dominio de generación.

FastAPI es el contenedor: ``Depends(build_generation)`` en el router cablea
los casos de uso con sus adaptadores concretos.
"""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import get_db


@dataclass(frozen=True, slots=True)
class GenerationUseCases:
    """Casos de uso del ciclo de vida de un job. Se rellenan por flujo extraído."""


def build_generation(db: Session = Depends(get_db)) -> GenerationUseCases:
    return GenerationUseCases()
