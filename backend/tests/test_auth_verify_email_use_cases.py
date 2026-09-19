"""Pruebas unitarias de los casos de uso de verificación de correo."""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest

from auth.application.dto import ResendVerificationInput, VerifyEmailInput
from auth.application.use_cases.resend_verification import ResendVerification
from auth.application.use_cases.verify_email import VerifyEmail
from auth.domain.errors import (
    EmailVerificationUserNotFound,
    ExpiredEmailVerificationToken,
    InvalidEmailVerificationToken,
)
from auth.domain.user import EmailRecipient, EmailVerificationTokenRecord, EmailVerificationUser


class DummyEmailVerificationRepository:
    def __init__(
        self,
        user: EmailVerificationUser | None = None,
        token_record: EmailVerificationTokenRecord | None = None,
    ) -> None:
        self.user = user
        self.token_record = token_record
        self.searched_tokens: list[str] = []
        self.deleted_tokens: list[str] = []
        self.verified_users: list[UUID] = []
        self.searched_emails: list[str] = []
        self.replaced_tokens: list[tuple[UUID, str, datetime]] = []

    def find_by_token(self, token: str) -> EmailVerificationTokenRecord | None:
        self.searched_tokens.append(token)
        if self.token_record is not None and self.token_record.token == token:
            return self.token_record
        return None

    def delete(self, token: str) -> None:
        self.deleted_tokens.append(token)

    def find_user(self, user_id: UUID) -> EmailVerificationUser | None:
        if self.user is not None and self.user.id == user_id:
            return self.user
        return None

    def mark_verified(self, user_id: UUID) -> None:
        self.verified_users.append(user_id)

    def find_user_by_normalized_email(self, normalized_email: str) -> EmailVerificationUser | None:
        self.searched_emails.append(normalized_email)
        return self.user

    def replace_for_user(self, user_id: UUID, token: str, expires_at: datetime) -> None:
        self.replaced_tokens.append((user_id, token, expires_at))


class DummyTokenGenerator:
    def __init__(self, token: str = "tok-reenvio-123") -> None:
        self.token = token
        self.calls: int = 0

    def generate(self) -> str:
        self.calls += 1
        return self.token


class DummyEmailSender:
    def __init__(self) -> None:
        self.sent_verifications: list[tuple[EmailRecipient, str]] = []

    def send_verification(self, user: EmailRecipient, token: str) -> None:
        self.sent_verifications.append((user, token))

    def send_password_reset(self, user: object, token: str) -> None:
        pass


def test_verificar_email_falla_si_token_no_existe():
    repo = DummyEmailVerificationRepository(token_record=None)
    use_case = VerifyEmail(repo=repo)

    with pytest.raises(InvalidEmailVerificationToken):
        use_case.execute(VerifyEmailInput(token="token-inexistente"))

    assert len(repo.verified_users) == 0


def test_verificar_email_falla_y_borra_token_si_esta_caducado():
    user_id = uuid4()
    hace_un_minuto = datetime.now(UTC) - timedelta(minutes=1)
    record = EmailVerificationTokenRecord(
        user_id=user_id, token="token-caducado", expires_at=hace_un_minuto
    )
    repo = DummyEmailVerificationRepository(token_record=record)
    use_case = VerifyEmail(repo=repo)

    with pytest.raises(ExpiredEmailVerificationToken):
        use_case.execute(VerifyEmailInput(token="token-caducado"))

    assert repo.deleted_tokens == ["token-caducado"]
    assert len(repo.verified_users) == 0


def test_verificar_email_soporta_fecha_de_expiracion_naive_de_sqlite():
    user_id = uuid4()
    hace_una_hora_naive = datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=1)
    record = EmailVerificationTokenRecord(
        user_id=user_id, token="token-naive-caducado", expires_at=hace_una_hora_naive
    )
    repo = DummyEmailVerificationRepository(token_record=record)
    use_case = VerifyEmail(repo=repo)

    with pytest.raises(ExpiredEmailVerificationToken):
        use_case.execute(VerifyEmailInput(token="token-naive-caducado"))

    assert repo.deleted_tokens == ["token-naive-caducado"]


def test_verificar_email_falla_y_borra_token_si_usuario_asociado_no_existe():
    user_id = uuid4()
    en_un_dia = datetime.now(UTC) + timedelta(days=1)
    record = EmailVerificationTokenRecord(
        user_id=user_id, token="token-huerfano", expires_at=en_un_dia
    )
    repo = DummyEmailVerificationRepository(user=None, token_record=record)
    use_case = VerifyEmail(repo=repo)

    with pytest.raises(EmailVerificationUserNotFound):
        use_case.execute(VerifyEmailInput(token="token-huerfano"))

    assert repo.deleted_tokens == ["token-huerfano"]
    assert len(repo.verified_users) == 0


def test_verificar_email_exitoso_marca_usuario_verificado_y_retorna_dto():
    user_id = uuid4()
    en_un_dia = datetime.now(UTC) + timedelta(days=1)
    user = EmailVerificationUser(
        id=user_id, email="alumno@upao.edu", full_name="Alumno GenOVA", email_verified=False
    )
    record = EmailVerificationTokenRecord(
        user_id=user_id, token="token-valido", expires_at=en_un_dia
    )
    repo = DummyEmailVerificationRepository(user=user, token_record=record)
    use_case = VerifyEmail(repo=repo)

    resultado = use_case.execute(VerifyEmailInput(token="  token-valido  "))

    assert resultado.user_id == str(user_id)
    assert resultado.email == "alumno@upao.edu"
    assert repo.verified_users == [user_id]
    assert len(repo.deleted_tokens) == 0


def test_reenviar_verificacion_con_usuario_inexistente_retorna_sin_efectos():
    repo = DummyEmailVerificationRepository(user=None)
    tokens = DummyTokenGenerator()
    emails = DummyEmailSender()
    use_case = ResendVerification(repo=repo, tokens=tokens, emails=emails)

    resultado = use_case.execute(ResendVerificationInput(email="fantasma@upao.edu"))

    assert resultado is None
    assert tokens.calls == 0
    assert len(repo.replaced_tokens) == 0
    assert len(emails.sent_verifications) == 0


def test_reenviar_verificacion_con_usuario_ya_verificado_no_emite_token():
    user_id = uuid4()
    user = EmailVerificationUser(
        id=user_id, email="yaverificado@upao.edu", full_name="Usuario", email_verified=True
    )
    repo = DummyEmailVerificationRepository(user=user)
    tokens = DummyTokenGenerator()
    emails = DummyEmailSender()
    use_case = ResendVerification(repo=repo, tokens=tokens, emails=emails)

    resultado = use_case.execute(ResendVerificationInput(email="yaverificado@upao.edu"))

    assert resultado is None
    assert tokens.calls == 0
    assert len(repo.replaced_tokens) == 0
    assert len(emails.sent_verifications) == 0


def test_reenviar_verificacion_con_usuario_pendiente_emite_token_y_envia_correo():
    user_id = uuid4()
    user = EmailVerificationUser(
        id=user_id, email="pendiente@upao.edu", full_name="Pendiente", email_verified=False
    )
    repo = DummyEmailVerificationRepository(user=user)
    tokens = DummyTokenGenerator(token="tok-nuevo-reenvio")
    emails = DummyEmailSender()
    use_case = ResendVerification(repo=repo, tokens=tokens, emails=emails)

    antes = datetime.now(UTC)
    resultado = use_case.execute(
        ResendVerificationInput(email="  Pendiente.Upao+promo@GMAIL.com  ")
    )
    despues = datetime.now(UTC)

    assert resultado is None
    assert repo.searched_emails == ["pendienteupao@gmail.com"]
    assert tokens.calls == 1
    assert len(repo.replaced_tokens) == 1

    uid, tok, expires_at = repo.replaced_tokens[0]
    assert uid == user_id
    assert tok == "tok-nuevo-reenvio"
    assert antes + timedelta(hours=23, minutes=59) <= expires_at <= despues + timedelta(hours=24, minutes=1)

    assert len(emails.sent_verifications) == 1
    destinatario, tok_enviado = emails.sent_verifications[0]
    assert destinatario.id == user_id
    assert tok_enviado == "tok-nuevo-reenvio"
