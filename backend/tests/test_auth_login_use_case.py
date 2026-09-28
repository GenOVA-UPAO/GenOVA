"""Pruebas unitarias del caso de uso de inicio de sesión (LoginUser)."""

from datetime import UTC, datetime, timedelta

import pytest

from auth.application.dto import LoginInput
from auth.application.use_cases.login_user import LoginUser
from auth.domain.errors import (
    AccountLocked,
    EmailNotVerified,
    InvalidCredentials,
    TooManyAttempts,
)
from auth.domain.user import AuthUser


class DummyUserRepository:
    def __init__(self, user: AuthUser | None = None) -> None:
        self.user = user
        self.recorded_failures: list[tuple[str, int, datetime | None]] = []
        self.reset_counter_calls: list[str] = []
        self.searched_emails: list[str] = []

    def find_by_normalized_email(self, normalized_email: str) -> AuthUser | None:
        self.searched_emails.append(normalized_email)
        return self.user

    def record_failed_attempt(
        self, user_id: str, attempts: int, locked_until: datetime | None
    ) -> None:
        self.recorded_failures.append((user_id, attempts, locked_until))

    def reset_counters(self, user_id: str) -> None:
        self.reset_counter_calls.append(user_id)


class DummyPasswordVerifier:
    def __init__(self, valid: bool = True) -> None:
        self.valid = valid
        self.verify_calls: list[tuple[str, str]] = []
        self.dummy_calls: int = 0

    def verify(self, raw: str, hashed: str) -> bool:
        self.verify_calls.append((raw, hashed))
        return self.valid

    def verify_dummy(self) -> None:
        self.dummy_calls += 1


class DummyThrottle:
    def __init__(self, throttled: bool = False) -> None:
        self.throttled = throttled
        self.checked_emails: list[str] = []

    def is_throttled(self, normalized_email: str) -> bool:
        self.checked_emails.append(normalized_email)
        return self.throttled


class DummyTotpTicketIssuer:
    def __init__(self, issued_ticket: str = "ticket-test-123") -> None:
        self.issued_ticket = issued_ticket
        self.calls: list[tuple[str, bool]] = []

    def issue(self, user_id: str, *, remember_me: bool) -> str:
        self.calls.append((user_id, remember_me))
        return self.issued_ticket


def build_user(
    user_id: str = "user-123",
    email: str = "usuario@genova.ai",
    password_hash: str = "hashed_pw",
    failed_attempts: int = 0,
    locked_until: datetime | None = None,
    email_verified: bool = True,
    totp_enabled: bool = False,
) -> AuthUser:
    return AuthUser(
        id=user_id,
        email=email,
        password_hash=password_hash,
        failed_login_attempts=failed_attempts,
        locked_until=locked_until,
        email_verified=email_verified,
        totp_enabled=totp_enabled,
    )


def test_login_bloqueado_por_throttle_si_rate_limit_esta_activado():
    repo = DummyUserRepository()
    passwords = DummyPasswordVerifier()
    throttle = DummyThrottle(throttled=True)
    tickets = DummyTotpTicketIssuer()

    use_case = LoginUser(
        repo=repo,
        passwords=passwords,
        throttle=throttle,
        tickets=tickets,
        rate_limit_enabled=True,
        email_verification_enabled=True,
    )

    with pytest.raises(TooManyAttempts):
        use_case.execute(LoginInput(email="test@upao.edu", password="password123"))

    assert len(repo.searched_emails) == 0


def test_login_ignora_throttle_cuando_rate_limit_esta_desactivado():
    user = build_user()
    repo = DummyUserRepository(user=user)
    passwords = DummyPasswordVerifier(valid=True)
    throttle = DummyThrottle(throttled=True)
    tickets = DummyTotpTicketIssuer()

    use_case = LoginUser(
        repo=repo,
        passwords=passwords,
        throttle=throttle,
        tickets=tickets,
        rate_limit_enabled=False,
        email_verification_enabled=True,
    )

    result = use_case.execute(LoginInput(email="test@upao.edu", password="password123"))
    assert result.user_id == user.id


def test_login_usuario_inexistente_llama_verify_dummy_por_timing():
    repo = DummyUserRepository(user=None)
    passwords = DummyPasswordVerifier()
    throttle = DummyThrottle()
    tickets = DummyTotpTicketIssuer()

    use_case = LoginUser(
        repo=repo,
        passwords=passwords,
        throttle=throttle,
        tickets=tickets,
        rate_limit_enabled=True,
        email_verification_enabled=True,
    )

    with pytest.raises(InvalidCredentials):
        use_case.execute(LoginInput(email="inexistente@upao.edu", password="password123"))

    assert passwords.dummy_calls == 1
    assert len(passwords.verify_calls) == 0


def test_login_cuenta_bloqueada_no_comprueba_password_y_lanza_account_locked():
    ahora = datetime.now(UTC)
    user = build_user(locked_until=ahora + timedelta(minutes=10))
    repo = DummyUserRepository(user=user)
    passwords = DummyPasswordVerifier()
    throttle = DummyThrottle()
    tickets = DummyTotpTicketIssuer()

    use_case = LoginUser(
        repo=repo,
        passwords=passwords,
        throttle=throttle,
        tickets=tickets,
        rate_limit_enabled=True,
        email_verification_enabled=True,
    )

    with pytest.raises(AccountLocked) as exc_info:
        use_case.execute(LoginInput(email="bloqueado@upao.edu", password="password123"))

    assert exc_info.value.retry_after_minutes >= 1
    assert len(passwords.verify_calls) == 0
    assert len(repo.recorded_failures) == 0


def test_login_password_incorrecta_registra_intento_fallido():
    user = build_user(failed_attempts=2)
    repo = DummyUserRepository(user=user)
    passwords = DummyPasswordVerifier(valid=False)
    throttle = DummyThrottle()
    tickets = DummyTotpTicketIssuer()

    use_case = LoginUser(
        repo=repo,
        passwords=passwords,
        throttle=throttle,
        tickets=tickets,
        rate_limit_enabled=True,
        email_verification_enabled=True,
    )

    with pytest.raises(InvalidCredentials):
        use_case.execute(LoginInput(email="usuario@upao.edu", password="wrongpassword"))

    assert len(repo.recorded_failures) == 1
    user_id, attempts, locked_until = repo.recorded_failures[0]
    assert user_id == user.id
    assert attempts == 3
    assert locked_until is None


def test_login_quinto_fallo_bloquea_cuenta_15_minutos_y_resetea_contador():
    user = build_user(failed_attempts=4)
    repo = DummyUserRepository(user=user)
    passwords = DummyPasswordVerifier(valid=False)
    throttle = DummyThrottle()
    tickets = DummyTotpTicketIssuer()

    use_case = LoginUser(
        repo=repo,
        passwords=passwords,
        throttle=throttle,
        tickets=tickets,
        rate_limit_enabled=True,
        email_verification_enabled=True,
    )

    with pytest.raises(InvalidCredentials):
        use_case.execute(LoginInput(email="usuario@upao.edu", password="wrongpassword"))

    assert len(repo.recorded_failures) == 1
    user_id, attempts, locked_until = repo.recorded_failures[0]
    assert user_id == user.id
    assert attempts == 0
    assert locked_until is not None
    assert locked_until > datetime.now(UTC)


def test_login_correo_no_verificado_lanza_email_not_verified():
    user = build_user(email_verified=False)
    repo = DummyUserRepository(user=user)
    passwords = DummyPasswordVerifier(valid=True)
    throttle = DummyThrottle()
    tickets = DummyTotpTicketIssuer()

    use_case = LoginUser(
        repo=repo,
        passwords=passwords,
        throttle=throttle,
        tickets=tickets,
        rate_limit_enabled=True,
        email_verification_enabled=True,
    )

    with pytest.raises(EmailNotVerified):
        use_case.execute(LoginInput(email="noverificado@upao.edu", password="password123"))

    assert len(repo.reset_counter_calls) == 0


def test_login_correo_no_verificado_se_permite_si_verificacion_esta_desactivada():
    user = build_user(email_verified=False)
    repo = DummyUserRepository(user=user)
    passwords = DummyPasswordVerifier(valid=True)
    throttle = DummyThrottle()
    tickets = DummyTotpTicketIssuer()

    use_case = LoginUser(
        repo=repo,
        passwords=passwords,
        throttle=throttle,
        tickets=tickets,
        rate_limit_enabled=True,
        email_verification_enabled=False,
    )

    result = use_case.execute(LoginInput(email="noverificado@upao.edu", password="password123"))
    assert result.user_id == user.id


def test_login_exitoso_optimizacion_rn001_no_llama_reset_counters_si_estaban_limpios():
    user = build_user(failed_attempts=0, locked_until=None)
    repo = DummyUserRepository(user=user)
    passwords = DummyPasswordVerifier(valid=True)
    throttle = DummyThrottle()
    tickets = DummyTotpTicketIssuer()

    use_case = LoginUser(
        repo=repo,
        passwords=passwords,
        throttle=throttle,
        tickets=tickets,
        rate_limit_enabled=True,
        email_verification_enabled=True,
    )

    result = use_case.execute(LoginInput(email="usuario@upao.edu", password="password123"))
    assert result.user_id == user.id
    assert len(repo.reset_counter_calls) == 0


def test_login_exitoso_limpia_contadores_si_habia_fallos_previos():
    user = build_user(failed_attempts=3, locked_until=None)
    repo = DummyUserRepository(user=user)
    passwords = DummyPasswordVerifier(valid=True)
    throttle = DummyThrottle()
    tickets = DummyTotpTicketIssuer()

    use_case = LoginUser(
        repo=repo,
        passwords=passwords,
        throttle=throttle,
        tickets=tickets,
        rate_limit_enabled=True,
        email_verification_enabled=True,
    )

    result = use_case.execute(LoginInput(email="usuario@upao.edu", password="password123"))
    assert result.user_id == user.id
    assert repo.reset_counter_calls == [user.id]


def test_login_exitoso_limpia_contadores_si_habia_bloqueo_expirado():
    ahora = datetime.now(UTC)
    user = build_user(failed_attempts=0, locked_until=ahora - timedelta(minutes=5))
    repo = DummyUserRepository(user=user)
    passwords = DummyPasswordVerifier(valid=True)
    throttle = DummyThrottle()
    tickets = DummyTotpTicketIssuer()

    use_case = LoginUser(
        repo=repo,
        passwords=passwords,
        throttle=throttle,
        tickets=tickets,
        rate_limit_enabled=True,
        email_verification_enabled=True,
    )

    result = use_case.execute(LoginInput(email="usuario@upao.edu", password="password123"))
    assert result.user_id == user.id
    assert repo.reset_counter_calls == [user.id]


def test_login_exitoso_con_totp_emite_ticket_temporal():
    user = build_user(totp_enabled=True)
    repo = DummyUserRepository(user=user)
    passwords = DummyPasswordVerifier(valid=True)
    throttle = DummyThrottle()
    tickets = DummyTotpTicketIssuer(issued_ticket="ticket-totp-xyz")

    use_case = LoginUser(
        repo=repo,
        passwords=passwords,
        throttle=throttle,
        tickets=tickets,
        rate_limit_enabled=True,
        email_verification_enabled=True,
    )

    result = use_case.execute(
        LoginInput(email="usuario@upao.edu", password="password123", remember_me=True)
    )
    assert result.totp_required is True
    assert result.totp_ticket == "ticket-totp-xyz"
    assert tickets.calls == [(user.id, True)]


def test_login_exitoso_sin_totp_devuelve_sesion_directa():
    user = build_user(totp_enabled=False)
    repo = DummyUserRepository(user=user)
    passwords = DummyPasswordVerifier(valid=True)
    throttle = DummyThrottle()
    tickets = DummyTotpTicketIssuer()

    use_case = LoginUser(
        repo=repo,
        passwords=passwords,
        throttle=throttle,
        tickets=tickets,
        rate_limit_enabled=True,
        email_verification_enabled=True,
    )

    result = use_case.execute(
        LoginInput(email="usuario@upao.edu", password="password123", remember_me=False)
    )
    assert result.totp_required is False
    assert result.totp_ticket is None
    assert len(tickets.calls) == 0


def test_login_normaliza_email_antes_de_consultar_repositorio():
    user = build_user(email="anaperez@gmail.com")
    repo = DummyUserRepository(user=user)
    passwords = DummyPasswordVerifier(valid=True)
    throttle = DummyThrottle()
    tickets = DummyTotpTicketIssuer()

    use_case = LoginUser(
        repo=repo,
        passwords=passwords,
        throttle=throttle,
        tickets=tickets,
        rate_limit_enabled=True,
        email_verification_enabled=True,
    )

    use_case.execute(LoginInput(email="  Ana.Perez+promo@GMAIL.com  ", password="password123"))
    assert repo.searched_emails == ["anaperez@gmail.com"]
