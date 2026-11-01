"""La jerarquía de administración reconoce a un admin con varios roles (BU-002).

Regresión: `is_admin` tomaba el primer rol que devolvía la consulta, sin orden ni
filtro por nombre. Un admin con {usuario, administrador} podía contar como no
admin y un gestor con `manage_users` podía editarlo, desactivarlo o resetearlo.
"""

import os
import sys
import uuid
from datetime import UTC, datetime

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.dialects.postgresql import JSONB  # noqa: E402
from sqlalchemy.ext.compiler import compiles  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from models import Role, User, UserRole  # noqa: E402
from users.application.dto import AdminUpdateRoleInput  # noqa: E402
from users.application.use_cases.admin_update_role import AdminUpdateRole  # noqa: E402
from users.domain.errors import AdminTargetProtected  # noqa: E402
from users.infrastructure.sqlalchemy_admin_repository import (  # noqa: E402
    SqlAlchemyAdminUserRepository,
)


@compiles(JSONB, "sqlite")
def _jsonb_en_sqlite(_type, _compiler, **_kw):
    return "JSON"


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    tables = (User.__table__, Role.__table__, UserRole.__table__)
    # Los server_default con cast de Postgres («'[]'::jsonb») no existen en SQLite:
    # se quitan solo durante el CREATE y se restauran.
    saved = {
        c: c.server_default
        for t in tables
        for c in t.columns
        if c.server_default is not None and "::" in str(getattr(c.server_default, "arg", ""))
    }
    for column in saved:
        column.server_default = None
    try:
        for table in tables:
            table.create(engine)
    finally:
        for column, default in saved.items():
            column.server_default = default
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


def _user(db, email: str) -> User:
    user = User(
        id=uuid.uuid4(),
        email=email,
        email_normalized=email,
        password_hash="x",
        full_name=email,
        llm_settings={},
        enabled_models=[],
        ova_settings={},
        theme_settings={},
        resource_configs={},
        user_api_keys={},
        totp_backup_codes=[],
        created_at=datetime.now(UTC),
    )
    db.add(user)
    return user


def _role(db, name: str, permissions: list[str], role_id: uuid.UUID | None = None) -> Role:
    role = Role(id=role_id or uuid.uuid4(), name=name, permissions=permissions, created_at=datetime.now(UTC))
    db.add(role)
    return role


def _grant(db, user: User, role: Role) -> None:
    db.add(UserRole(user_id=user.id, role_id=role.id, is_primary=False,
                    created_at=datetime.now(UTC)))
    db.flush()


@pytest.fixture
def escenario(db):
    # Ids fijos: «usuario» ordena antes que «administrador» en el índice de
    # user_roles, así la consulta sin filtro devuelve primero el rol no admin.
    usuario = _role(db, "usuario", [], uuid.UUID(int=1))
    admin_role = _role(db, "administrador", ["manage_users"], uuid.UUID(int=2**128 - 1))
    gestor = _role(db, "gestor", ["manage_users"])
    admin = _user(db, "admin@genova.pe")
    manager = _user(db, "gestor@genova.pe")
    tercero = _user(db, "tercero@genova.pe")
    db.flush()
    # Primero «usuario», luego «administrador»: el rol «primero» no es el de admin.
    _grant(db, admin, usuario)
    _grant(db, admin, admin_role)
    _grant(db, manager, gestor)
    _grant(db, tercero, usuario)
    db.commit()
    return {"admin": admin, "manager": manager, "tercero": tercero, "admin_role": admin_role}


def test_admin_multirol_es_admin(db, escenario):
    repo = SqlAlchemyAdminUserRepository(db)
    assert repo.is_admin(escenario["admin"].id) is True
    assert repo.is_admin(escenario["manager"].id) is False


def test_gestor_no_puede_tocar_a_admin_multirol(db, escenario):
    repo = SqlAlchemyAdminUserRepository(db)
    with pytest.raises(AdminTargetProtected):
        repo.assert_can_touch_target(
            caller_id=escenario["manager"].id, target_id=escenario["admin"].id
        )


def test_admin_multirol_puede_asignar_administrador(db, escenario):
    repo = SqlAlchemyAdminUserRepository(db)
    result = AdminUpdateRole(repo=repo).execute(
        AdminUpdateRoleInput(
            caller_id=escenario["admin"].id,
            user_id=str(escenario["tercero"].id),
            role_id=str(escenario["admin_role"].id),
        )
    )
    assert result.role.name == "administrador"
