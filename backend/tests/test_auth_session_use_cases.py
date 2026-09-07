"""Pruebas unitarias de los casos de uso de sesión (LogoutSession y GetSessionProfile)."""

from datetime import UTC, datetime
from uuid import uuid4

from auth.application.use_cases.get_session_profile import GetSessionProfile
from auth.application.use_cases.logout_session import LogoutSession
from auth.domain.user import AuthenticatedUser, TokenRevocation, UserAccess


class DummySessionTokenDecoder:
    def __init__(self, revocation: TokenRevocation | None = None) -> None:
        self.revocation = revocation
        self.decoded_tokens: list[str] = []

    def decode_for_revocation(self, token: str) -> TokenRevocation | None:
        self.decoded_tokens.append(token)
        return self.revocation


class DummyRevokedTokenRepository:
    def __init__(self, existing_jtis: set[str] | None = None) -> None:
        self.existing_jtis = existing_jtis or set()
        self.added_revocations: list[TokenRevocation] = []

    def exists(self, jti: str) -> bool:
        return jti in self.existing_jtis

    def add(self, revocation: TokenRevocation) -> None:
        self.added_revocations.append(revocation)
        self.existing_jtis.add(revocation.jti)


class DummySessionUserRepository:
    def __init__(self, access: UserAccess | None = None) -> None:
        self.access = access or UserAccess(role="student", permissions=("read:courses",))

    def access_for(self, user_id: object) -> UserAccess:
        return self.access


# --- LogoutSession ---


def test_logout_con_token_nulo_retorna_sin_efectos():
    decoder = DummySessionTokenDecoder()
    repo = DummyRevokedTokenRepository()
    use_case = LogoutSession(tokens=decoder, revoked_tokens=repo)

    use_case.execute(None)

    assert len(decoder.decoded_tokens) == 0
    assert len(repo.added_revocations) == 0


def test_logout_con_token_indecodificable_o_invalido_retorna_sin_efectos():
    decoder = DummySessionTokenDecoder(revocation=None)
    repo = DummyRevokedTokenRepository()
    use_case = LogoutSession(tokens=decoder, revoked_tokens=repo)

    use_case.execute("jwt-corrupto")

    assert decoder.decoded_tokens == ["jwt-corrupto"]
    assert len(repo.added_revocations) == 0


def test_logout_con_token_ya_revocado_previamente_no_lo_duplica():
    revocation = TokenRevocation(jti="jti-123", user_id="user-1", expires_at=datetime.now(UTC))
    decoder = DummySessionTokenDecoder(revocation=revocation)
    repo = DummyRevokedTokenRepository(existing_jtis={"jti-123"})
    use_case = LogoutSession(tokens=decoder, revoked_tokens=repo)

    use_case.execute("jwt-valido-pero-ya-revocado")

    assert len(repo.added_revocations) == 0


def test_logout_exitoso_agrega_token_al_repositorio_de_revocados():
    revocation = TokenRevocation(jti="jti-nuevo", user_id="user-1", expires_at=datetime.now(UTC))
    decoder = DummySessionTokenDecoder(revocation=revocation)
    repo = DummyRevokedTokenRepository()
    use_case = LogoutSession(tokens=decoder, revoked_tokens=repo)

    use_case.execute("jwt-nuevo-a-revocar")

    assert repo.added_revocations == [revocation]
    assert repo.exists("jti-nuevo") is True


# --- GetSessionProfile ---


def test_get_session_profile_retorna_perfil_completo_con_permisos_y_roles():
    uid = uuid4()
    creado_en = datetime(2026, 9, 7, 10, 30, 0, tzinfo=UTC)
    user = AuthenticatedUser(
        id=uid,
        email="profesor@upao.edu",
        full_name="Profesor GenOVA",
        university_id=202,
        gender="M",
        phone_number="999888777",
        theme_settings={"theme": "dark"},
        created_at=creado_en,
        totp_enabled=True,
        totp_secret="SECRET",
        totp_backup_codes=[],
    )
    users_repo = DummySessionUserRepository(
        access=UserAccess(role="teacher", permissions=("manage:courses", "read:ovas"))
    )
    use_case = GetSessionProfile(users=users_repo)

    perfil = use_case.execute(user)

    assert perfil.id == str(uid)
    assert perfil.email == "profesor@upao.edu"
    assert perfil.full_name == "Profesor GenOVA"
    assert perfil.university_id == 202
    assert perfil.gender == "M"
    assert perfil.phone_number == "999888777"
    assert perfil.theme_settings == {"theme": "dark"}
    assert perfil.role == "teacher"
    assert perfil.permissions == ("manage:courses", "read:ovas")
    assert perfil.created_at == creado_en.isoformat()
    assert perfil.totp_enabled is True


def test_get_session_profile_maneja_campos_opcionales_nulos():
    uid = uuid4()
    user = AuthenticatedUser(
        id=uid,
        email="anon@upao.edu",
        full_name=None,
        university_id=None,
        gender=None,
        phone_number=None,
        theme_settings={},
        created_at=None,
        totp_enabled=False,
        totp_secret=None,
        totp_backup_codes=[],
    )
    users_repo = DummySessionUserRepository(access=UserAccess(role=None, permissions=()))
    use_case = GetSessionProfile(users=users_repo)

    perfil = use_case.execute(user)

    assert perfil.gender == ""
    assert perfil.phone_number == ""
    assert perfil.created_at is None
    assert perfil.role is None
    assert perfil.permissions == ()
