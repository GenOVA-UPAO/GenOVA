"""BDD de auth (HU-001 registro / HU-008 login) determinista: SQLite in-memory +
app FastAPI mínima (auth_router) + overrides. Sin backend vivo ni red — register,
login y lockout corren in-process contra una BD sembrada por escenario.

El rate-limiter de SlowAPI se desactiva (su estado es global y filtraría entre
tests); el throttle por-email (`_email_attempts`) se resetea por escenario y es el
que produce el 429 del bloqueo de forma determinista.
"""

import os
import sys
import uuid

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import pytest  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from pytest_bdd import given, parsers, scenario, then, when  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import models  # noqa: E402, F401
from auth.router import router as auth_router  # noqa: E402
from auth.throttle import _email_attempts  # noqa: E402
from core.database import get_db  # noqa: E402
from core.rate_limit import limiter  # noqa: E402
from core.security import hash_password  # noqa: E402

_FEATURES = os.path.join(os.path.dirname(__file__), "..", "..", "..", "tests", "features")
FEATURE_LOGIN = os.path.join(_FEATURES, "auth", "HU-008_login.feature")
FEATURE_REGISTER = os.path.join(_FEATURES, "auth", "HU-001_registro.feature")

_SEED_EMAIL = "user@genova.ai"
_SEED_PASS = "user1234password"

# Solo las columnas que mapea el modelo User (TEXT en vez de UUID/JSONB de PG).
_DDL = """
CREATE TABLE users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  email_normalized TEXT UNIQUE,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0, locked_until TIMESTAMP,
  full_name TEXT, is_active BOOLEAN NOT NULL DEFAULT 1,
  email_verified BOOLEAN NOT NULL DEFAULT 0,
  university_id INTEGER, gender TEXT, phone_number TEXT,
  llm_settings TEXT NOT NULL DEFAULT '{}', enabled_models TEXT NOT NULL DEFAULT '[]',
  ova_settings TEXT NOT NULL DEFAULT '{}',
  theme_settings TEXT NOT NULL DEFAULT '{}',
  resource_configs TEXT NOT NULL DEFAULT '{}',
  user_api_keys TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP
);
CREATE TABLE email_verification_tokens (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at TIMESTAMP NOT NULL
);
CREATE TABLE platform_config (
  key TEXT PRIMARY KEY, value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE roles (
  id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  permissions TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE user_roles (
  user_id TEXT NOT NULL, role_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);
"""


@pytest.fixture
def client():
    eng = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with eng.begin() as conn:
        for stmt in _DDL.strip().split(";"):
            if stmt.strip():
                conn.execute(text(stmt))
        conn.execute(
            text(
                "INSERT INTO users (id, email, email_normalized, password_hash, full_name, "
                "email_verified) VALUES (:i, :e, :n, :p, 'Seed User', 1)"
            ),
            {
                "i": uuid.uuid4().hex,
                "e": _SEED_EMAIL,
                "n": _SEED_EMAIL,
                "p": hash_password(_SEED_PASS),
            },
        )

    Session = sessionmaker(bind=eng, autoflush=False, autocommit=False, future=True)

    def _get_db_override():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    # SlowAPI tiene estado global → desactivarlo evita fugas entre tests; el
    # throttle por-email se resetea aquí y es el que produce el 429 del bloqueo.
    limiter.enabled = False
    _email_attempts.clear()

    app = FastAPI()
    app.state.limiter = limiter
    app.include_router(auth_router, prefix="/api/auth")
    app.dependency_overrides[get_db] = _get_db_override
    return TestClient(app)


# ── HU-008: Login ────────────────────────────────────────────────────────────


@scenario(FEATURE_LOGIN, "Login exitoso")
def test_login_exitoso():
    pass


@scenario(FEATURE_LOGIN, "Credenciales inválidas")
def test_login_credenciales_invalidas():
    pass


@scenario(FEATURE_LOGIN, "Bloqueo tras intentos fallidos")
def test_login_bloqueo():
    pass


@given("que estoy en la página de login")
def pagina_login():
    pass


@when("ingreso un correo registrado y contraseña válida", target_fixture="response")
def login_valido(client):
    return client.post("/api/auth/login", json={"email": _SEED_EMAIL, "password": _SEED_PASS})


@then("debo recibir un JWT con expiración de 24 horas")
def jwt_recibido(response):
    assert response.status_code == 200
    body = response.json()
    assert body.get("access_token")
    assert body.get("token_type") == "bearer"


@then("debo ser redirigido al dashboard")
def redireccion_dashboard():
    pass


@when("ingreso un correo o contraseña inválidos", target_fixture="response")
def login_invalido(client):
    return client.post(
        "/api/auth/login", json={"email": "noexiste@test.com", "password": "wrongpass"}
    )


@then("debo recibir un error descriptivo")
def error_descriptivo(response):
    assert response.status_code == 401
    assert response.json().get("message")


@then("no debo acceder al dashboard")
def no_acceder_dashboard():
    pass


@given("que realizo 5 intentos fallidos consecutivos", target_fixture="lockout_email")
def cinco_intentos_fallidos(client):
    email = f"lockout_{uuid.uuid4().hex[:8]}@test.com"
    client.post(
        "/api/auth/register",
        json={"email": email, "password": "validpass123", "full_name": "LT"},
    )
    for _ in range(5):
        client.post("/api/auth/login", json={"email": email, "password": "wrongpassword"})
    return email


@when("intento iniciar sesión nuevamente", target_fixture="response")
def intento_adicional(client, lockout_email):
    return client.post(
        "/api/auth/login", json={"email": lockout_email, "password": "wrongpassword"}
    )


@then("la cuenta debe quedar bloqueada por 15 minutos")
def cuenta_bloqueada(response):
    # 5 intentos llenan la ventana → el 6º queda throttled (429) de forma determinista.
    assert response.status_code == 429


@then("debo recibir un mensaje indicando el bloqueo")
def mensaje_bloqueo(response):
    assert response.json().get("message") or response.json().get("error")


# ── HU-001: Registro ─────────────────────────────────────────────────────────


@scenario(FEATURE_REGISTER, "Registro exitoso con credenciales válidas")
def test_registro_exitoso():
    pass


@scenario(FEATURE_REGISTER, "Registro fallido por email duplicado")
def test_registro_email_duplicado():
    pass


@given("que estoy en la página de registro")
def pagina_registro():
    pass


@when(
    "ingreso un correo válido y una contraseña alfanumérica de mínimo 8 caracteres",
    target_fixture="response",
)
def registro_valido(client):
    email = f"test_{uuid.uuid4().hex[:8]}@test.com"
    return client.post(
        "/api/auth/register",
        json={"email": email, "password": "newpass99", "full_name": "Test User"},
    )


@then("el sistema debe crear la cuenta sin verificar")
def cuenta_creada_sin_verificar(response):
    assert response.status_code == 201
    assert response.json().get("email_verification_required") is True


@then("los campos university_id, gender y phone_number deben crearse como NULL")
def campos_null():
    pass


@then("debo ver un aviso para verificar mi correo")
def aviso_verificar(response):
    assert response.json().get("message")


@then("no debo iniciar sesión hasta verificar el correo")
def sin_sesion_hasta_verificar(response):
    # El registro no emite JWT ni cookie de sesión.
    assert response.json().get("access_token") is None
    assert "genova_token" not in response.cookies


@given(parsers.parse('que el correo "{email}" ya está registrado'))
def correo_ya_registrado(email):
    pass  # user@genova.ai se siembra en el fixture client


@when("intento registrarme con ese correo", target_fixture="response")
def registro_email_duplicado_request(client):
    return client.post(
        "/api/auth/register",
        json={"email": _SEED_EMAIL, "password": "somepassword123", "full_name": "Dup"},
    )


@then("debo ver un mensaje indicando que el correo ya existe")
def mensaje_correo_duplicado(response):
    assert response.status_code == 400
    assert response.json().get("error") == "email_exists"


@then("no debo ser redirigido al dashboard")
def no_redirigido():
    pass
