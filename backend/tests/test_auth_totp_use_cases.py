"""Pruebas unitarias de los casos de uso de segundo factor TOTP."""

from uuid import UUID, uuid4

import pytest

from auth.application.dto import (
    AdminDisableTotpInput,
    ConfirmTotpInput,
    DisableTotpInput,
    SetupTotpInput,
    VerifyTotpLoginInput,
)
from auth.application.use_cases.admin_disable_totp import AdminDisableTotp
from auth.application.use_cases.confirm_totp import ConfirmTotp
from auth.application.use_cases.disable_totp import DisableTotp
from auth.application.use_cases.setup_totp import SetupTotp
from auth.application.use_cases.verify_totp_login import VerifyTotpLogin
from auth.domain.errors import (
    InvalidTotpCode,
    InvalidTotpTicket,
    TotpAdminUserNotFound,
    TotpAlreadyEnabled,
    TotpNotEnabled,
    TotpNotSetup,
)
from auth.domain.user import (
    AuthenticatedUser,
    TotpEnrollment,
    TotpLoginTicket,
    TotpLoginUser,
)


class DummyTotpAuthenticator:
    def __init__(
        self,
        valid_totp_codes: set[str] | None = None,
        valid_backup_codes: set[str] | None = None,
    ) -> None:
        self.valid_totp_codes = valid_totp_codes or set()
        self.valid_backup_codes = valid_backup_codes or set()
        self.verified_calls: list[tuple[str, str]] = []
        self.verified_backup_calls: list[tuple[str, str]] = []

    def create_enrollment(self, email: str) -> TotpEnrollment:
        return TotpEnrollment(
            provisioning_uri=f"otpauth://totp/GenOVA:{email}?secret=SECRET123",
            secret="SECRET123",
            backup_codes=("backup-1", "backup-2"),
            hashed_backup_codes=[
                {"hash": "hash-backup-1", "used": False},
                {"hash": "hash-backup-2", "used": False},
            ],
        )

    def verify(self, secret: str, code: str) -> bool:
        self.verified_calls.append((secret, code))
        return code in self.valid_totp_codes

    def verify_backup(self, code: str, hashed: str) -> bool:
        self.verified_backup_calls.append((code, hashed))
        return code in self.valid_backup_codes and hashed == f"hash-{code}"


class DummyTotpUserRepository:
    def __init__(self) -> None:
        self.saved_setups: list[tuple[UUID, str, list[dict[str, object]]]] = []
        self.enabled_users: list[UUID] = []
        self.disabled_users: list[UUID] = []

    def save_setup(
        self,
        user_id: UUID,
        secret: str,
        hashed_backup_codes: list[dict[str, object]],
    ) -> None:
        self.saved_setups.append((user_id, secret, hashed_backup_codes))

    def enable(self, user_id: UUID) -> None:
        self.enabled_users.append(user_id)

    def disable(self, user_id: UUID) -> None:
        self.disabled_users.append(user_id)


class DummyTotpTicketConsumer:
    def __init__(self, tickets: dict[str, TotpLoginTicket] | None = None) -> None:
        self.tickets = dict(tickets or {})
        self.consumed_tickets: list[str] = []

    def consume(self, ticket: str) -> TotpLoginTicket | None:
        self.consumed_tickets.append(ticket)
        # Consumo de un solo uso: pop
        return self.tickets.pop(ticket, None)


class DummyTotpLoginUserRepository:
    def __init__(self, users: dict[str, TotpLoginUser] | None = None) -> None:
        self.users = dict(users or {})
        self.saved_backups: list[tuple[UUID, list[dict[str, object]]]] = []

    def find_by_id(self, user_id: str) -> TotpLoginUser | None:
        return self.users.get(user_id)

    def save_backup_codes(
        self, user_id: UUID, backup_codes: list[dict[str, object]]
    ) -> None:
        self.saved_backups.append((user_id, backup_codes))


class DummyTotpAdminRepository:
    def __init__(self, existing_users: set[str] | None = None) -> None:
        self.existing_users = existing_users or set()
        self.disabled_calls: list[str] = []

    def disable_by_id(self, user_id: str) -> bool:
        self.disabled_calls.append(user_id)
        return user_id in self.existing_users


def build_authenticated_user(
    user_id: UUID | None = None,
    email: str = "usuario@upao.edu",
    totp_enabled: bool = False,
    totp_secret: str | None = None,
    backup_codes: list[dict[str, object]] | None = None,
) -> AuthenticatedUser:
    return AuthenticatedUser(
        id=user_id or uuid4(),
        email=email,
        full_name="Usuario GenOVA",
        university_id=101,
        gender="M",
        phone_number="987654321",
        theme_settings={},
        created_at=None,
        totp_enabled=totp_enabled,
        totp_secret=totp_secret,
        totp_backup_codes=backup_codes or [],
    )


# --- SetupTotp ---


def test_setup_totp_falla_si_usuario_ya_tiene_totp_habilitado():
    user = build_authenticated_user(totp_enabled=True)
    auth = DummyTotpAuthenticator()
    repo = DummyTotpUserRepository()
    use_case = SetupTotp(authenticator=auth, users=repo)

    with pytest.raises(TotpAlreadyEnabled):
        use_case.execute(SetupTotpInput(user=user))

    assert len(repo.saved_setups) == 0


def test_setup_totp_exitoso_genera_enrolamiento_y_persiste():
    user = build_authenticated_user(totp_enabled=False)
    auth = DummyTotpAuthenticator()
    repo = DummyTotpUserRepository()
    use_case = SetupTotp(authenticator=auth, users=repo)

    result = use_case.execute(SetupTotpInput(user=user))

    assert result.secret == "SECRET123"
    assert result.backup_codes == ("backup-1", "backup-2")
    assert "otpauth://totp/GenOVA" in result.provisioning_uri

    assert len(repo.saved_setups) == 1
    uid, secret, hashed = repo.saved_setups[0]
    assert uid == user.id
    assert secret == "SECRET123"
    assert len(hashed) == 2


# --- ConfirmTotp ---


def test_confirmar_totp_falla_si_no_se_ha_iniciado_setup():
    user = build_authenticated_user(totp_secret=None, totp_enabled=False)
    auth = DummyTotpAuthenticator()
    repo = DummyTotpUserRepository()
    use_case = ConfirmTotp(authenticator=auth, users=repo)

    with pytest.raises(TotpNotSetup):
        use_case.execute(ConfirmTotpInput(user=user, code="123456"))

    assert len(repo.enabled_users) == 0


def test_confirmar_totp_falla_si_ya_estaba_habilitado():
    user = build_authenticated_user(totp_secret="SECRET123", totp_enabled=True)
    auth = DummyTotpAuthenticator()
    repo = DummyTotpUserRepository()
    use_case = ConfirmTotp(authenticator=auth, users=repo)

    with pytest.raises(TotpAlreadyEnabled):
        use_case.execute(ConfirmTotpInput(user=user, code="123456"))

    assert len(repo.enabled_users) == 0


def test_confirmar_totp_falla_si_codigo_es_invalido():
    user = build_authenticated_user(totp_secret="SECRET123", totp_enabled=False)
    auth = DummyTotpAuthenticator(valid_totp_codes={"654321"})
    repo = DummyTotpUserRepository()
    use_case = ConfirmTotp(authenticator=auth, users=repo)

    with pytest.raises(InvalidTotpCode):
        use_case.execute(ConfirmTotpInput(user=user, code="000000"))

    assert len(repo.enabled_users) == 0


def test_confirmar_totp_exitoso_habilita_usuario():
    user = build_authenticated_user(totp_secret="SECRET123", totp_enabled=False)
    auth = DummyTotpAuthenticator(valid_totp_codes={"123456"})
    repo = DummyTotpUserRepository()
    use_case = ConfirmTotp(authenticator=auth, users=repo)

    resultado = use_case.execute(ConfirmTotpInput(user=user, code="  123456  "))

    assert resultado is None
    assert repo.enabled_users == [user.id]


# --- DisableTotp ---


@pytest.mark.parametrize(
    ("totp_enabled", "totp_secret"),
    [
        (False, "SECRET123"),
        (True, None),
        (False, None),
    ],
)
def test_desactivar_totp_falla_si_no_esta_activo(totp_enabled: bool, totp_secret: str | None):
    user = build_authenticated_user(totp_enabled=totp_enabled, totp_secret=totp_secret)
    auth = DummyTotpAuthenticator()
    repo = DummyTotpUserRepository()
    use_case = DisableTotp(authenticator=auth, users=repo)

    with pytest.raises(TotpNotEnabled):
        use_case.execute(DisableTotpInput(user=user, code="123456"))

    assert len(repo.disabled_users) == 0


def test_desactivar_totp_falla_si_codigo_es_invalido():
    user = build_authenticated_user(totp_enabled=True, totp_secret="SECRET123")
    auth = DummyTotpAuthenticator(valid_totp_codes={"999999"})
    repo = DummyTotpUserRepository()
    use_case = DisableTotp(authenticator=auth, users=repo)

    with pytest.raises(InvalidTotpCode):
        use_case.execute(DisableTotpInput(user=user, code="111111"))

    assert len(repo.disabled_users) == 0


def test_desactivar_totp_exitoso_deshabilita_usuario():
    user = build_authenticated_user(totp_enabled=True, totp_secret="SECRET123")
    auth = DummyTotpAuthenticator(valid_totp_codes={"999999"})
    repo = DummyTotpUserRepository()
    use_case = DisableTotp(authenticator=auth, users=repo)

    resultado = use_case.execute(DisableTotpInput(user=user, code=" 999999 "))

    assert resultado is None
    assert repo.disabled_users == [user.id]


# --- VerifyTotpLogin ---


def test_verificar_login_totp_falla_si_ticket_no_existe_o_expirado():
    tickets = DummyTotpTicketConsumer()
    users = DummyTotpLoginUserRepository()
    auth = DummyTotpAuthenticator()
    use_case = VerifyTotpLogin(tickets=tickets, users=users, authenticator=auth)

    with pytest.raises(InvalidTotpTicket):
        use_case.execute(VerifyTotpLoginInput(ticket="ticket-invalido", code="123456"))


@pytest.mark.parametrize(
    ("usuario_existe", "totp_enabled", "totp_secret"),
    [
        (False, True, "SECRET123"),
        (True, False, "SECRET123"),
        (True, True, None),
    ],
)
def test_verificar_login_totp_falla_si_usuario_no_valido_para_totp(
    usuario_existe: bool, totp_enabled: bool, totp_secret: str | None
):
    uid = uuid4()
    ticket = TotpLoginTicket(user_id=str(uid), remember_me=True)
    tickets = DummyTotpTicketConsumer({"ticket-valido": ticket})

    user_map = {}
    if usuario_existe:
        user_map[str(uid)] = TotpLoginUser(
            id=uid,
            email="test@upao.edu",
            totp_enabled=totp_enabled,
            totp_secret=totp_secret,
            backup_codes=[],
        )
    users = DummyTotpLoginUserRepository(user_map)
    auth = DummyTotpAuthenticator()
    use_case = VerifyTotpLogin(tickets=tickets, users=users, authenticator=auth)

    with pytest.raises(InvalidTotpTicket):
        use_case.execute(VerifyTotpLoginInput(ticket="ticket-valido", code="123456"))


def test_verificar_login_totp_exitoso_con_codigo_totp_estandar():
    uid = uuid4()
    ticket = TotpLoginTicket(user_id=str(uid), remember_me=True)
    tickets = DummyTotpTicketConsumer({"ticket-123": ticket})
    user = TotpLoginUser(
        id=uid,
        email="alumno@upao.edu",
        totp_enabled=True,
        totp_secret="SECRET123",
        backup_codes=[],
    )
    users = DummyTotpLoginUserRepository({str(uid): user})
    auth = DummyTotpAuthenticator(valid_totp_codes={"123456"})
    use_case = VerifyTotpLogin(tickets=tickets, users=users, authenticator=auth)

    # Con espacios intercalados que deben limpiarse
    result = use_case.execute(VerifyTotpLoginInput(ticket="ticket-123", code=" 123 456 "))

    assert result.user_id == str(uid)
    assert result.email == "alumno@upao.edu"
    assert result.remember_me is True
    assert result.backup_code_used is False
    assert len(users.saved_backups) == 0


def test_verificar_login_totp_exitoso_con_codigo_de_respaldo_y_lo_consume():
    uid = uuid4()
    ticket = TotpLoginTicket(user_id=str(uid), remember_me=False)
    tickets = DummyTotpTicketConsumer({"ticket-respaldo": ticket})
    backup_codes = [
        {"hash": "hash-backup-1", "used": False},
        {"hash": "hash-backup-2", "used": False},
    ]
    user = TotpLoginUser(
        id=uid,
        email="alumno@upao.edu",
        totp_enabled=True,
        totp_secret="SECRET123",
        backup_codes=backup_codes,
    )
    users = DummyTotpLoginUserRepository({str(uid): user})
    auth = DummyTotpAuthenticator(valid_backup_codes={"backup-1"})
    use_case = VerifyTotpLogin(tickets=tickets, users=users, authenticator=auth)

    result = use_case.execute(VerifyTotpLoginInput(ticket="ticket-respaldo", code="backup-1"))

    assert result.user_id == str(uid)
    assert result.remember_me is False
    assert result.backup_code_used is True
    assert backup_codes[0]["used"] is True
    assert len(users.saved_backups) == 1


def test_verificar_login_totp_falla_si_codigo_de_respaldo_ya_fue_usado():
    uid = uuid4()
    ticket = TotpLoginTicket(user_id=str(uid), remember_me=False)
    tickets = DummyTotpTicketConsumer({"ticket-usado": ticket})
    backup_codes = [{"hash": "hash-backup-1", "used": True}]
    user = TotpLoginUser(
        id=uid,
        email="alumno@upao.edu",
        totp_enabled=True,
        totp_secret="SECRET123",
        backup_codes=backup_codes,
    )
    users = DummyTotpLoginUserRepository({str(uid): user})
    auth = DummyTotpAuthenticator(valid_backup_codes={"backup-1"})
    use_case = VerifyTotpLogin(tickets=tickets, users=users, authenticator=auth)

    with pytest.raises(InvalidTotpCode):
        use_case.execute(VerifyTotpLoginInput(ticket="ticket-usado", code="backup-1"))


def test_verificar_login_totp_ticket_es_de_un_solo_uso():
    uid = uuid4()
    ticket = TotpLoginTicket(user_id=str(uid), remember_me=False)
    tickets = DummyTotpTicketConsumer({"ticket-unico": ticket})
    user = TotpLoginUser(
        id=uid,
        email="alumno@upao.edu",
        totp_enabled=True,
        totp_secret="SECRET123",
        backup_codes=[],
    )
    users = DummyTotpLoginUserRepository({str(uid): user})
    auth = DummyTotpAuthenticator(valid_totp_codes={"123456"})
    use_case = VerifyTotpLogin(tickets=tickets, users=users, authenticator=auth)

    # Primer uso exitoso
    res1 = use_case.execute(VerifyTotpLoginInput(ticket="ticket-unico", code="123456"))
    assert res1.user_id == str(uid)

    # Segundo uso con el mismo ticket debe fallar porque ya fue consumido
    with pytest.raises(InvalidTotpTicket):
        use_case.execute(VerifyTotpLoginInput(ticket="ticket-unico", code="123456"))


# --- AdminDisableTotp ---


def test_admin_desactivar_totp_falla_si_usuario_no_existe():
    repo = DummyTotpAdminRepository(existing_users={"admin-user"})
    use_case = AdminDisableTotp(users=repo)

    with pytest.raises(TotpAdminUserNotFound):
        use_case.execute(AdminDisableTotpInput(user_id="inexistente"))


def test_admin_desactivar_totp_exitoso_si_usuario_existe():
    repo = DummyTotpAdminRepository(existing_users={"usuario-con-totp"})
    use_case = AdminDisableTotp(users=repo)

    resultado = use_case.execute(AdminDisableTotpInput(user_id="usuario-con-totp"))

    assert resultado is None
    assert repo.disabled_calls == ["usuario-con-totp"]
