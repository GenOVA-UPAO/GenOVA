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
    AcceptLink,
    AdminSendResetEmail,
    AdminUnlockAccount,
    AdminUpdateProfile,
    AdminUpdateRole,
    AdminUpdateStatus,
    ChangePassword,
    CreateLinkCode,
    DeleteAccount,
    DeleteAnyLink,
    DeleteMyLink,
    GetResourceConfigs,
    GetUserAnalytics,
    ListAllLinks,
    ListMyLinks,
    ListUsers,
    ResendLink,
    SaveResourceConfigs,
    UpdateUserProfile,
    UpdateUserTheme,
)
from users.infrastructure.password_adapters import CorePasswordHasher
from users.infrastructure.sqlalchemy_account_repository import SqlAlchemyUserAccountRepository
from users.infrastructure.sqlalchemy_admin_repository import SqlAlchemyAdminUserRepository
from users.infrastructure.sqlalchemy_analytics_repository import SqlAlchemyAnalyticsRepository
from users.infrastructure.sqlalchemy_profile_repository import SqlAlchemyUserProfileRepository
from users.infrastructure.sqlalchemy_resource_config_repository import (
    SqlAlchemyResourceConfigRepository,
)
from users.infrastructure.sqlalchemy_user_link_repository import SqlAlchemyUserLinkRepository


@dataclass(frozen=True, slots=True)
class UsersUseCases:
    update_profile: UpdateUserProfile
    update_theme: UpdateUserTheme
    change_password: ChangePassword
    delete_account: DeleteAccount
    get_resource_configs: GetResourceConfigs
    save_resource_configs: SaveResourceConfigs
    list_users: ListUsers
    admin_update_profile: AdminUpdateProfile
    admin_update_role: AdminUpdateRole
    admin_update_status: AdminUpdateStatus
    admin_unlock_account: AdminUnlockAccount
    admin_send_reset_email: AdminSendResetEmail
    get_user_analytics: GetUserAnalytics
    list_my_links: ListMyLinks
    create_link_code: CreateLinkCode
    accept_link: AcceptLink
    delete_my_link: DeleteMyLink
    resend_link: ResendLink
    list_all_links: ListAllLinks
    delete_any_link: DeleteAnyLink


def build_users(db: Session = Depends(get_db)) -> UsersUseCases:
    profiles = SqlAlchemyUserProfileRepository(db)
    accounts = SqlAlchemyUserAccountRepository(db)
    configs = SqlAlchemyResourceConfigRepository(db)
    admin = SqlAlchemyAdminUserRepository(db)
    analytics = SqlAlchemyAnalyticsRepository(db)
    links = SqlAlchemyUserLinkRepository(db)
    hasher = CorePasswordHasher()
    return UsersUseCases(
        update_profile=UpdateUserProfile(profiles),
        update_theme=UpdateUserTheme(profiles),
        change_password=ChangePassword(accounts, hasher),
        delete_account=DeleteAccount(accounts, hasher),
        get_resource_configs=GetResourceConfigs(configs),
        save_resource_configs=SaveResourceConfigs(configs),
        list_users=ListUsers(admin),
        admin_update_profile=AdminUpdateProfile(admin),
        admin_update_role=AdminUpdateRole(admin),
        admin_update_status=AdminUpdateStatus(admin),
        admin_unlock_account=AdminUnlockAccount(admin),
        admin_send_reset_email=AdminSendResetEmail(admin),
        get_user_analytics=GetUserAnalytics(analytics),
        list_my_links=ListMyLinks(links),
        create_link_code=CreateLinkCode(links, hasher),
        accept_link=AcceptLink(links, hasher),
        delete_my_link=DeleteMyLink(links),
        resend_link=ResendLink(links, hasher),
        list_all_links=ListAllLinks(links),
        delete_any_link=DeleteAnyLink(links),
    )
