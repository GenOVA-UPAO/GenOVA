"""Composition root del dominio de usuarios.

Cablea los casos de uso con los repositorios concretos a través de la DI de
FastAPI. FastAPI es el contenedor: `Depends(build_users)` en el router.
"""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends
from sqlalchemy.orm import Session

from core.database import get_db
from users.application.use_cases import (
    ChangePassword,
    DeleteAccount,
    GetResourceConfigs,
    SaveResourceConfigs,
    UpdateUserProfile,
    UpdateUserTheme,
)
from users.infrastructure.password_adapters import CorePasswordHasher
from users.infrastructure.sqlalchemy_account_repository import SqlAlchemyUserAccountRepository
from users.infrastructure.sqlalchemy_profile_repository import SqlAlchemyUserProfileRepository
from users.infrastructure.sqlalchemy_resource_config_repository import (
    SqlAlchemyResourceConfigRepository,
)


@dataclass(frozen=True, slots=True)
class UsersUseCases:
    update_profile: UpdateUserProfile
    update_theme: UpdateUserTheme
    change_password: ChangePassword
    delete_account: DeleteAccount
    get_resource_configs: GetResourceConfigs
    save_resource_configs: SaveResourceConfigs


def build_users(db: Session = Depends(get_db)) -> UsersUseCases:
    profiles = SqlAlchemyUserProfileRepository(db)
    accounts = SqlAlchemyUserAccountRepository(db)
    configs = SqlAlchemyResourceConfigRepository(db)
    hasher = CorePasswordHasher()
    return UsersUseCases(
        update_profile=UpdateUserProfile(profiles),
        update_theme=UpdateUserTheme(profiles),
        change_password=ChangePassword(accounts, hasher),
        delete_account=DeleteAccount(accounts, hasher),
        get_resource_configs=GetResourceConfigs(configs),
        save_resource_configs=SaveResourceConfigs(configs),
    )
