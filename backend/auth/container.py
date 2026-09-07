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
    GetSessionProfile,
    LoginUser,
    LogoutSession,
    RegisterUser,
    RequestPasswordReset,
    ResendVerification,
    ResetPassword,
    VerifyEmail,
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
from auth.infrastructure.session_adapters import (
    JwtSessionTokenDecoder,
    SqlAlchemyRevokedTokenRepository,
    SqlAlchemySessionUserRepository,
)
from auth.infrastructure.verify_adapters import SqlAlchemyEmailVerificationTokenRepository
from core.config import settings
from core.database import get_db


@dataclass(frozen=True, slots=True)
class AuthUseCases:
    get_session_profile: GetSessionProfile
    login_user: LoginUser
    logout_session: LogoutSession
    register_user: RegisterUser
    request_password_reset: RequestPasswordReset
    reset_password: ResetPassword
    verify_email: VerifyEmail
    resend_verification: ResendVerification


def build_auth(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> AuthUseCases:
    passwords = BcryptPasswordHasher()
    password_policy = ProjectPasswordPolicy()
    tokens = SecureTokenGenerator()
    emails = SmtpAuthEmailSender(background_tasks, settings.frontend_url)
    password_reset_repo = SqlAlchemyPasswordResetTokenRepository(db)
    email_verification_repo = SqlAlchemyEmailVerificationTokenRepository(db)
    return AuthUseCases(
        get_session_profile=GetSessionProfile(users=SqlAlchemySessionUserRepository(db)),
        login_user=LoginUser(
            repo=SqlAlchemyAuthUserRepository(db),
            passwords=BcryptPasswordVerifier(),
            throttle=EmailLoginThrottle(),
            tickets=TotpTicketAdapter(),
            rate_limit_enabled=settings.rate_limit_enabled,
            email_verification_enabled=settings.email_verification_enabled,
        ),
        logout_session=LogoutSession(
            tokens=JwtSessionTokenDecoder(),
            revoked_tokens=SqlAlchemyRevokedTokenRepository(db),
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
        verify_email=VerifyEmail(repo=email_verification_repo),
        resend_verification=ResendVerification(
            repo=email_verification_repo,
            tokens=tokens,
            emails=emails,
        ),
    )
