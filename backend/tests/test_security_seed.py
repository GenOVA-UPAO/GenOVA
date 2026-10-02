"""Seed seguro: sin credenciales públicas en producción, sin elevar cuentas existentes."""

import os
import sys

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from sqlalchemy import select  # noqa: E402

from tests._sqlite_db import make_session  # noqa: E402

import seed  # noqa: E402
from core.security import verify_password  # noqa: E402
from models import Role, User, UserRole  # noqa: E402


@pytest.fixture
def db():
    s = make_session(User.__table__, Role.__table__, UserRole.__table__)
    yield s
    s.close()


def _emails(db):
    return {u.email for u in db.execute(select(User)).scalars()}


def test_produccion_no_crea_usuarios_con_clave_publica(db):
    seed.seed_db(db, env="production")
    assert _emails(db) == set()
    # Los roles sí se siembran.
    assert db.execute(select(Role).where(Role.name == "administrador")).scalar_one()


def test_produccion_bootstrap_admin_con_secreto_externo(db):
    seed.seed_db(
        db,
        env="production",
        bootstrap_email="root@example.com",
        bootstrap_password="una-clave-larga-y-unica-9",
    )
    assert _emails(db) == {"root@example.com"}
    u = db.execute(select(User)).scalar_one()
    assert verify_password("una-clave-larga-y-unica-9", u.password_hash)
    rol = db.execute(
        select(Role.name).join(UserRole, UserRole.role_id == Role.id).where(UserRole.user_id == u.id)
    ).scalar_one()
    assert rol == "administrador"


def test_bootstrap_rechaza_clave_corta(db):
    seed.seed_db(db, env="production", bootstrap_email="root@example.com", bootstrap_password="corta")
    assert _emails(db) == set()


def test_dev_crea_usuarios_demo(db):
    seed.seed_db(db, env="dev")
    assert "admin@genova.ai" in _emails(db)


def test_seed_no_eleva_ni_reasigna_roles_de_usuarios_existentes(db):
    seed.seed_db(db, env="dev")
    est = db.execute(select(User).where(User.email == "estudiante@genova.ai")).scalar_one()
    admin_role = db.execute(select(Role).where(Role.name == "administrador")).scalar_one()
    db.execute(select(UserRole))  # no-op
    for ur in db.execute(select(UserRole).where(UserRole.user_id == est.id)).scalars():
        db.delete(ur)
    db.add(UserRole(user_id=est.id, role_id=admin_role.id))
    db.commit()
    old_hash = est.password_hash

    seed.seed_db(db, env="dev")

    roles = db.execute(
        select(Role.name).join(UserRole, UserRole.role_id == Role.id).where(UserRole.user_id == est.id)
    ).scalars().all()
    assert roles == ["administrador"]  # el seed no pisa la decisión del admin
    db.refresh(est)
    assert est.password_hash == old_hash
