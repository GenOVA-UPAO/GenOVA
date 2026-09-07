"""Composition root del dominio de autenticación.

FastAPI es el contenedor: ``Depends(build_auth)`` en el router cablea los casos
de uso con sus adaptadores concretos. Por ahora solo el flujo de login está
extraído a caso de uso; el resto de routers sigue en pase estructural.
"""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import BackgroundTasks, Depends
from sqlalchemy.orm import Session

from auth.application.use_cases import (
    LoginUser,
    RegisterUser,
    RequestPasswordReset,
    ResetPassword,
)
from auth.infrastructure.email_adapters import SmtpAuthEmailSender
from auth.infrastructure.login_adapters import (
    BcryptPasswordVerifier,
    EmailLoginThrottle,
    SqlAlchemyAuthUserRepository,
    TotpTicketAdapter,
)
from auth.infrastructure.register_adapters import SqlAlchemyRegistrationRepository
from auth.infrastructure.reset_adapters import SqlAlchemyPasswordResetTokenRepository
from auth.infrastructure.security_adapters import (
    BcryptPasswordHasher,
    ProjectPasswordPolicy,
    SecureTokenGenerator,
)
from core.config import settings
from core.database import get_db


@dataclass(frozen=True, slots=True)
class AuthUseCases:
    login_user: LoginUser
    register_user: RegisterUser
    request_password_reset: RequestPasswordReset
    reset_password: ResetPassword


def build_auth(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> AuthUseCases:
    passwords = BcryptPasswordHasher()
    password_policy = ProjectPasswordPolicy()
    tokens = SecureTokenGenerator()
    emails = SmtpAuthEmailSender(background_tasks, settings.frontend_url)
    password_reset_repo = SqlAlchemyPasswordResetTokenRepository(db)
    return AuthUseCases(
        login_user=LoginUser(
            repo=SqlAlchemyAuthUserRepository(db),
            passwords=BcryptPasswordVerifier(),
            throttle=EmailLoginThrottle(),
            tickets=TotpTicketAdapter(),
            rate_limit_enabled=settings.rate_limit_enabled,
            email_verification_enabled=settings.email_verification_enabled,
        ),
        register_user=RegisterUser(
            repo=SqlAlchemyRegistrationRepository(db),
            passwords=passwords,
            password_policy=password_policy,
            tokens=tokens,
            emails=emails,
            email_verification_enabled=settings.email_verification_enabled,
        ),
        request_password_reset=RequestPasswordReset(
            repo=password_reset_repo,
            tokens=tokens,
            emails=emails,
        ),
        reset_password=ResetPassword(
            repo=password_reset_repo,
            passwords=passwords,
            password_policy=password_policy,
        ),
    )
