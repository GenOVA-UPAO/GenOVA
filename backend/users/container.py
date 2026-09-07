"""Composition root del dominio de usuarios.

Cablea los casos de uso con los repositorios concretos a través de la DI de
FastAPI. FastAPI es el contenedor: `Depends(build_users)` en el router.
"""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import get_db
from users.application.use_cases import UpdateUserProfile, UpdateUserTheme
from users.infrastructure.sqlalchemy_profile_repository import SqlAlchemyUserProfileRepository


@dataclass(frozen=True, slots=True)
class UsersUseCases:
    update_profile: UpdateUserProfile
    update_theme: UpdateUserTheme


def build_users(db: Session = Depends(get_db)) -> UsersUseCases:
    profiles = SqlAlchemyUserProfileRepository(db)
    return UsersUseCases(
        update_profile=UpdateUserProfile(profiles),
        update_theme=UpdateUserTheme(profiles),
    )
