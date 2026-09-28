"""Pruebas unitarias de los casos de uso de recuperación de contraseña."""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest

from auth.application.dto import RequestPasswordResetInput, ResetPasswordInput
from auth.application.use_cases.request_password_reset import RequestPasswordReset
from auth.application.use_cases.reset_password import ResetPassword
from auth.domain.errors import (
    ExpiredPasswordResetToken,
    InvalidPasswordResetToken,
    PasswordResetUserNotFound,
    WeakResetPassword,
)
from auth.domain.user import PasswordResetTokenRecord, PasswordResetUser


class DummyPasswordResetRepository:
    def __init__(
        self,
        active_user: PasswordResetUser | None = None,
        token_record: PasswordResetTokenRecord | None = None,
        user_exists: bool = True,
    ) -> None:
        self.active_user = active_user
        self.token_record = token_record
        self.user_exists = user_exists
        self.searched_emails: list[str] = []
        self.replaced_tokens: list[tuple[UUID, str, datetime]] = []
        self.deleted_tokens: list[str] = []
        self.applied_passwords: list[tuple[UUID, str]] = []

    def find_active_user(self, normalized_email: str) -> PasswordResetUser | None:
        self.searched_emails.append(normalized_email)
        return self.active_user

    def replace_for_user(self, user_id: UUID, token: str, expires_at: datetime) -> None:
        self.replaced_tokens.append((user_id, token, expires_at))

    def find_by_token(self, token: str) -> PasswordResetTokenRecord | None:
        if self.token_record is not None and self.token_record.token == token:
            return self.token_record
        return None

    def delete(self, token: str) -> None:
        self.deleted_tokens.append(token)

    def find_user(self, user_id: UUID) -> bool:
        return self.user_exists

    def apply_new_password(self, user_id: UUID, password_hash: str) -> None:
        self.applied_passwords.append((user_id, password_hash))


class DummyTokenGenerator:
    def __init__(self, token: str = "reset-token-xyz") -> None:
        self.token = token
        self.calls: int = 0

    def generate(self) -> str:
        self.calls += 1
        return self.token


class DummyEmailSender:
    def __init__(self) -> None:
        self.sent_resets: list[tuple[PasswordResetUser, str]] = []

    def send_verification(self, user: object, token: str) -> None:
        pass

    def send_password_reset(self, user: PasswordResetUser, token: str) -> None:
        self.sent_resets.append((user, token))


class DummyPasswordHasher:
    def hash(self, raw: str) -> str:
        return f"hashed::{raw}"


class DummyPasswordPolicy:
    def __init__(self, accepts_passwords: bool = True) -> None:
        self.accepts_passwords = accepts_passwords

    def accepts(self, raw: str) -> bool:
        return self.accepts_passwords


def test_solicitar_reset_con_usuario_existente_genera_token_y_envia_correo():
    user_id = uuid4()
    user = PasswordResetUser(id=user_id, email="alumno@upao.edu", full_name="Alumno GenOVA")
    repo = DummyPasswordResetRepository(active_user=user)
    tokens = DummyTokenGenerator(token="token-secreto-123")
    emails = DummyEmailSender()

    use_case = RequestPasswordReset(repo=repo, tokens=tokens, emails=emails)

    antes = datetime.now(UTC)
    resultado = use_case.execute(RequestPasswordResetInput(email="alumno@upao.edu"))
    despues = datetime.now(UTC)

    # Defensa contra enumeración: execute retorna None
    assert resultado is None
    assert tokens.calls == 1
    assert len(repo.replaced_tokens) == 1

    uid, tok, expires_at = repo.replaced_tokens[0]
    assert uid == user_id
    assert tok == "token-secreto-123"
    assert antes + timedelta(minutes=59) <= expires_at <= despues + timedelta(hours=1, minutes=1)

    assert len(emails.sent_resets) == 1
    destinatario, email_tok = emails.sent_resets[0]
    assert destinatario.id == user_id
    assert email_tok == "token-secreto-123"


def test_solicitar_reset_con_usuario_inexistente_retorna_none_sin_revelar_nada():
    repo = DummyPasswordResetRepository(active_user=None)
    tokens = DummyTokenGenerator()
    emails = DummyEmailSender()

    use_case = RequestPasswordReset(repo=repo, tokens=tokens, emails=emails)

    resultado = use_case.execute(RequestPasswordResetInput(email="fantasma@upao.edu"))

    # Mismo retorno que con usuario existente, sin emitir token ni enviar email
    assert resultado is None
    assert tokens.calls == 0
    assert len(repo.replaced_tokens) == 0
    assert len(emails.sent_resets) == 0


def test_solicitar_reset_normaliza_email_de_busqueda():
    user_id = uuid4()
    user = PasswordResetUser(id=user_id, email="alumno@gmail.com", full_name="Alumno")
    repo = DummyPasswordResetRepository(active_user=user)
    tokens = DummyTokenGenerator()
    emails = DummyEmailSender()

    use_case = RequestPasswordReset(repo=repo, tokens=tokens, emails=emails)
    use_case.execute(RequestPasswordResetInput(email="  Alumno.UPAO+soporte@GMAIL.com  "))

    assert repo.searched_emails == ["alumnoupao@gmail.com"]


def test_reset_password_falla_si_nueva_password_no_cumple_politica():
    repo = DummyPasswordResetRepository()
    hasher = DummyPasswordHasher()
    policy = DummyPasswordPolicy(accepts_passwords=False)

    use_case = ResetPassword(repo=repo, passwords=hasher, password_policy=policy)

    with pytest.raises(WeakResetPassword):
        use_case.execute(ResetPasswordInput(token="token-valido", new_password="123"))

    assert len(repo.applied_passwords) == 0


def test_reset_password_falla_si_token_no_existe():
    repo = DummyPasswordResetRepository(token_record=None)
    hasher = DummyPasswordHasher()
    policy = DummyPasswordPolicy(accepts_passwords=True)

    use_case = ResetPassword(repo=repo, passwords=hasher, password_policy=policy)

    with pytest.raises(InvalidPasswordResetToken):
        use_case.execute(ResetPasswordInput(token="token-inexistente", new_password="NewSecurePassword123"))

    assert len(repo.applied_passwords) == 0


def test_reset_password_falla_y_borra_token_si_esta_caducado():
    user_id = uuid4()
    hace_diez_minutos = datetime.now(UTC) - timedelta(minutes=10)
    record = PasswordResetTokenRecord(user_id=user_id, token="token-caducado", expires_at=hace_diez_minutos)
    repo = DummyPasswordResetRepository(token_record=record)
    hasher = DummyPasswordHasher()
    policy = DummyPasswordPolicy(accepts_passwords=True)

    use_case = ResetPassword(repo=repo, passwords=hasher, password_policy=policy)

    with pytest.raises(ExpiredPasswordResetToken):
        use_case.execute(ResetPasswordInput(token="token-caducado", new_password="NewSecurePassword123"))

    assert repo.deleted_tokens == ["token-caducado"]
    assert len(repo.applied_passwords) == 0


def test_reset_password_soporta_fecha_de_expiracion_naive_de_sqlite():
    user_id = uuid4()
    # Fecha naive en el pasado
    hace_cinco_minutos_naive = datetime.now(UTC).replace(tzinfo=None) - timedelta(minutes=5)
    record = PasswordResetTokenRecord(
        user_id=user_id, token="token-naive-expirado", expires_at=hace_cinco_minutos_naive
    )
    repo = DummyPasswordResetRepository(token_record=record)
    hasher = DummyPasswordHasher()
    policy = DummyPasswordPolicy(accepts_passwords=True)

    use_case = ResetPassword(repo=repo, passwords=hasher, password_policy=policy)

    with pytest.raises(ExpiredPasswordResetToken):
        use_case.execute(ResetPasswordInput(token="token-naive-expirado", new_password="NewSecurePassword123"))

    assert repo.deleted_tokens == ["token-naive-expirado"]


def test_reset_password_falla_si_usuario_asociado_ya_no_existe():
    user_id = uuid4()
    en_una_hora = datetime.now(UTC) + timedelta(hours=1)
    record = PasswordResetTokenRecord(user_id=user_id, token="token-valido", expires_at=en_una_hora)
    repo = DummyPasswordResetRepository(token_record=record, user_exists=False)
    hasher = DummyPasswordHasher()
    policy = DummyPasswordPolicy(accepts_passwords=True)

    use_case = ResetPassword(repo=repo, passwords=hasher, password_policy=policy)

    with pytest.raises(PasswordResetUserNotFound):
        use_case.execute(ResetPasswordInput(token="token-valido", new_password="NewSecurePassword123"))

    assert len(repo.applied_passwords) == 0


def test_reset_password_exitoso_aplica_hash_de_nueva_password():
    user_id = uuid4()
    en_una_hora = datetime.now(UTC) + timedelta(hours=1)
    record = PasswordResetTokenRecord(user_id=user_id, token="token-valido", expires_at=en_una_hora)
    repo = DummyPasswordResetRepository(token_record=record, user_exists=True)
    hasher = DummyPasswordHasher()
    policy = DummyPasswordPolicy(accepts_passwords=True)

    use_case = ResetPassword(repo=repo, passwords=hasher, password_policy=policy)

    resultado = use_case.execute(
        ResetPasswordInput(token="  token-valido  ", new_password="NewSecurePassword123")
    )

    assert resultado is None
    assert repo.applied_passwords == [(user_id, "hashed::NewSecurePassword123")]
    assert len(repo.deleted_tokens) == 0
