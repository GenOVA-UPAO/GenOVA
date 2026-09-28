"""Pruebas unitarias del caso de uso de registro de usuario (RegisterUser)."""

from datetime import UTC, datetime, timedelta

import pytest

from auth.application.dto import RegisterInput
from auth.application.use_cases.register_user import RegisterUser
from auth.domain.errors import (
    EmailAlreadyRegistered,
    InvalidFullName,
    WeakRegistrationPassword,
)
from auth.domain.user import EmailRecipient, RegisteredUser


class DummyRegistrationRepository:
    def __init__(self, raise_on_create: Exception | None = None) -> None:
        self.raise_on_create = raise_on_create
        self.created_calls: list[dict[str, object]] = []

    def create(
        self,
        *,
        email: str,
        normalized_email: str,
        password_hash: str,
        full_name: str | None,
        email_verified: bool,
        verification_token: str | None,
        verification_expires_at: datetime | None,
    ) -> RegisteredUser:
        if self.raise_on_create is not None:
            raise self.raise_on_create

        call_data = {
            "email": email,
            "normalized_email": normalized_email,
            "password_hash": password_hash,
            "full_name": full_name,
            "email_verified": email_verified,
            "verification_token": verification_token,
            "verification_expires_at": verification_expires_at,
        }
        self.created_calls.append(call_data)
        return RegisteredUser(id="new-user-uuid", email=email, full_name=full_name)


class DummyPasswordHasher:
    def hash(self, raw: str) -> str:
        return f"hashed::{raw}"


class DummyPasswordPolicy:
    def __init__(self, accepts_passwords: bool = True) -> None:
        self.accepts_passwords = accepts_passwords
        self.checked: list[str] = []

    def accepts(self, raw: str) -> bool:
        self.checked.append(raw)
        return self.accepts_passwords


class DummyTokenGenerator:
    def __init__(self, token: str = "token-verificacion-abc") -> None:
        self.token = token
        self.calls: int = 0

    def generate(self) -> str:
        self.calls += 1
        return self.token


class DummyEmailSender:
    def __init__(self) -> None:
        self.sent_verifications: list[tuple[EmailRecipient, str]] = []
        self.sent_resets: list[tuple[object, str]] = []

    def send_verification(self, user: EmailRecipient, token: str) -> None:
        self.sent_verifications.append((user, token))

    def send_password_reset(self, user: object, token: str) -> None:
        self.sent_resets.append((user, token))


def test_registro_falla_si_password_no_cumple_politica():
    repo = DummyRegistrationRepository()
    hasher = DummyPasswordHasher()
    policy = DummyPasswordPolicy(accepts_passwords=False)
    tokens = DummyTokenGenerator()
    emails = DummyEmailSender()

    use_case = RegisterUser(
        repo=repo,
        passwords=hasher,
        password_policy=policy,
        tokens=tokens,
        emails=emails,
        email_verification_enabled=True,
    )

    with pytest.raises(WeakRegistrationPassword):
        use_case.execute(RegisterInput(email="usuario@upao.edu", password="123"))

    assert len(repo.created_calls) == 0
    assert tokens.calls == 0


@pytest.mark.parametrize(
    "nombre_invalido",
    [
        "123456",
        "!@#$%",
        "   999   ",
    ],
)
def test_registro_falla_si_nombre_completo_no_tiene_letras(nombre_invalido: str):
    repo = DummyRegistrationRepository()
    hasher = DummyPasswordHasher()
    policy = DummyPasswordPolicy(accepts_passwords=True)
    tokens = DummyTokenGenerator()
    emails = DummyEmailSender()

    use_case = RegisterUser(
        repo=repo,
        passwords=hasher,
        password_policy=policy,
        tokens=tokens,
        emails=emails,
        email_verification_enabled=True,
    )

    with pytest.raises(InvalidFullName):
        use_case.execute(
            RegisterInput(
                email="usuario@upao.edu",
                password="SecurePassword123",
                full_name=nombre_invalido,
            )
        )

    assert len(repo.created_calls) == 0


@pytest.mark.parametrize(
    ("nombre_valido", "nombre_esperado"),
    [
        (None, None),
        ("", None),
        ("    ", None),
        ("Juan Perez", "Juan Perez"),
        ("  Maria  ", "Maria"),
        ("Alumno 01", "Alumno 01"),
    ],
)
def test_registro_acepta_nombres_validos_o_vacios(
    nombre_valido: str | None, nombre_esperado: str | None
):
    repo = DummyRegistrationRepository()
    hasher = DummyPasswordHasher()
    policy = DummyPasswordPolicy(accepts_passwords=True)
    tokens = DummyTokenGenerator()
    emails = DummyEmailSender()

    use_case = RegisterUser(
        repo=repo,
        passwords=hasher,
        password_policy=policy,
        tokens=tokens,
        emails=emails,
        email_verification_enabled=False,
    )

    result = use_case.execute(
        RegisterInput(
            email="usuario@upao.edu",
            password="SecurePassword123",
            full_name=nombre_valido,
        )
    )

    assert result.user_id == "new-user-uuid"
    assert repo.created_calls[0]["full_name"] == nombre_esperado


def test_registro_falla_si_email_ya_esta_registrado():
    repo = DummyRegistrationRepository(raise_on_create=EmailAlreadyRegistered())
    hasher = DummyPasswordHasher()
    policy = DummyPasswordPolicy(accepts_passwords=True)
    tokens = DummyTokenGenerator()
    emails = DummyEmailSender()

    use_case = RegisterUser(
        repo=repo,
        passwords=hasher,
        password_policy=policy,
        tokens=tokens,
        emails=emails,
        email_verification_enabled=True,
    )

    with pytest.raises(EmailAlreadyRegistered):
        use_case.execute(
            RegisterInput(
                email="existente@upao.edu",
                password="SecurePassword123",
            )
        )

    assert len(emails.sent_verifications) == 0


def test_registro_con_verificacion_activa_genera_token_y_envia_correo():
    repo = DummyRegistrationRepository()
    hasher = DummyPasswordHasher()
    policy = DummyPasswordPolicy(accepts_passwords=True)
    tokens = DummyTokenGenerator(token="tok-verif-xyz")
    emails = DummyEmailSender()

    use_case = RegisterUser(
        repo=repo,
        passwords=hasher,
        password_policy=policy,
        tokens=tokens,
        emails=emails,
        email_verification_enabled=True,
    )

    antes = datetime.now(UTC)
    result = use_case.execute(
        RegisterInput(
            email="  Nuevo.Alumno+genova@GMAIL.com  ",
            password="SecurePassword123",
            full_name="Nuevo Alumno",
        )
    )
    despues = datetime.now(UTC)

    assert result.user_id == "new-user-uuid"
    assert result.email == "nuevo.alumno+genova@gmail.com"
    assert result.email_verification_required is True

    call = repo.created_calls[0]
    assert call["email"] == "nuevo.alumno+genova@gmail.com"
    assert call["normalized_email"] == "nuevoalumno@gmail.com"
    assert call["password_hash"] == "hashed::SecurePassword123"
    assert call["full_name"] == "Nuevo Alumno"
    assert call["email_verified"] is False
    assert call["verification_token"] == "tok-verif-xyz"

    expires_at = call["verification_expires_at"]
    assert isinstance(expires_at, datetime)
    assert antes + timedelta(hours=23, minutes=59) <= expires_at <= despues + timedelta(hours=24, minutes=1)

    assert len(emails.sent_verifications) == 1
    destinatario, token = emails.sent_verifications[0]
    assert destinatario.email == "nuevo.alumno+genova@gmail.com"
    assert token == "tok-verif-xyz"


def test_registro_con_verificacion_desactivada_marca_verificado_sin_emitir_token():
    repo = DummyRegistrationRepository()
    hasher = DummyPasswordHasher()
    policy = DummyPasswordPolicy(accepts_passwords=True)
    tokens = DummyTokenGenerator()
    emails = DummyEmailSender()

    use_case = RegisterUser(
        repo=repo,
        passwords=hasher,
        password_policy=policy,
        tokens=tokens,
        emails=emails,
        email_verification_enabled=False,
    )

    result = use_case.execute(
        RegisterInput(
            email="usuario@upao.edu",
            password="SecurePassword123",
        )
    )

    assert result.email_verification_required is False
    assert tokens.calls == 0
    assert len(emails.sent_verifications) == 0

    call = repo.created_calls[0]
    assert call["email_verified"] is True
    assert call["verification_token"] is None
    assert call["verification_expires_at"] is None
