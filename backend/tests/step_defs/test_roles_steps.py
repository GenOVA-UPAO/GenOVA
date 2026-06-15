"""BDD de roles (HU-018/019/020) al estilo determinista: SQLite in-memory +
app FastAPI mínima (solo roles_router) + overrides de dependencias. Sin backend
vivo, sin red, sin JWT — cada escenario arranca con su propia BD sembrada, así que
es reproducible y asserta el body real de cada endpoint.

`DATABASE_URL`/`JWT_SECRET` se fijan a valores de test ANTES de importar la app.
`get_current_user` se reemplaza por un principal cuyo id se alterna (admin/usuario)
según el step Given; `require_admin` corre de verdad contra la BD (prueba el 403).
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

import models  # noqa: E402, F401 — registra los modelos ORM
from auth.dependencies import get_current_user  # noqa: E402
from database import get_db  # noqa: E402
from roles.router import router as roles_router  # noqa: E402

_FEATURES = os.path.join(os.path.dirname(__file__), "..", "..", "..", "tests", "features")
FEATURE_CREAR = os.path.join(_FEATURES, "roles", "HU-018_crear-rol.feature")
FEATURE_EDITAR = os.path.join(_FEATURES, "roles", "HU-019_editar-rol.feature")
FEATURE_ELIMINAR = os.path.join(_FEATURES, "roles", "HU-020_eliminar-rol.feature")

# Solo las tablas que tocan los endpoints de roles (TEXT en vez de UUID/JSONB de PG).
_DDL = """
CREATE TABLE roles (
  id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, description TEXT,
  permissions TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE user_roles (
  user_id TEXT NOT NULL, role_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);
"""


class _Principal:
    """Sustituto liviano de User: require_admin solo usa `.id`."""

    def __init__(self, uid):
        self.id = uid


@pytest.fixture
def app_ctx(monkeypatch):
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

    Session = sessionmaker(bind=eng, autoflush=False, autocommit=False, future=True)

    # SQLAlchemy UUID(as_uuid=True) en sqlite almacena el .hex (32 sin guiones);
    # sembramos con .hex y pasamos objetos uuid al principal para que los binds
    # de las queries (==) coincidan con lo guardado.
    admin_uid, user_uid = uuid.uuid4(), uuid.uuid4()
    admin_role_id, user_role_id = uuid.uuid4(), uuid.uuid4()
    with eng.begin() as conn:
        conn.execute(
            text("INSERT INTO roles (id, name, permissions) VALUES (:i, 'administrador', '[]')"),
            {"i": admin_role_id.hex},
        )
        conn.execute(
            text("INSERT INTO roles (id, name, permissions) VALUES (:i, 'usuario', '[]')"),
            {"i": user_role_id.hex},
        )
        conn.execute(
            text("INSERT INTO user_roles (user_id, role_id) VALUES (:u, :r)"),
            {"u": admin_uid.hex, "r": admin_role_id.hex},
        )
        conn.execute(
            text("INSERT INTO user_roles (user_id, role_id) VALUES (:u, :r)"),
            {"u": user_uid.hex, "r": user_role_id.hex},
        )

    active = {"id": admin_uid}

    def _get_db_override():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app = FastAPI()
    app.include_router(roles_router, prefix="/api/roles")
    app.dependency_overrides[get_db] = _get_db_override
    app.dependency_overrides[get_current_user] = lambda: _Principal(active["id"])

    return {
        "client": TestClient(app),
        "engine": eng,
        "Session": Session,
        "active": active,
        "admin_uid": admin_uid,
        "user_uid": user_uid,
    }


@pytest.fixture
def state():
    return {}


def _seed_role(ctx, name, *, users=0):
    rid = uuid.uuid4()
    with ctx["engine"].begin() as conn:
        conn.execute(
            text("INSERT INTO roles (id, name, permissions) VALUES (:i, :n, '[]')"),
            {"i": rid.hex, "n": name.lower()},
        )
        for _ in range(users):
            conn.execute(
                text("INSERT INTO user_roles (user_id, role_id) VALUES (:u, :r)"),
                {"u": uuid.uuid4().hex, "r": rid.hex},
            )
    return str(rid)


# ── Given comunes ─────────────────────────────────────────────────────────────

@given(parsers.parse('que estoy autenticado como usuario con rol "{role}"'))
def autenticado_como(app_ctx, role):
    app_ctx["active"]["id"] = app_ctx["admin_uid"] if role == "administrador" else app_ctx["user_uid"]


@given('que los roles del sistema "administrador" y "usuario" ya existen en la base de datos')
def roles_sistema_existen():
    pass  # sembrados en app_ctx


# ── HU-018: Crear Rol ─────────────────────────────────────────────────────────

@scenario(FEATURE_CREAR, "Ver lista de roles existentes")
def test_listar_roles():
    pass


@scenario(FEATURE_CREAR, "Crear un nuevo rol exitosamente")
def test_crear_rol():
    pass


@scenario(FEATURE_CREAR, "Intentar crear un rol con nombre duplicado")
def test_crear_rol_duplicado():
    pass


@given('que estoy en "/admin/roles"', target_fixture="roles_list")
def en_admin_roles(app_ctx):
    return app_ctx["client"].get("/api/roles")


@then("debo ver la lista de roles registrados")
def ver_lista_roles(roles_list):
    assert roles_list.status_code == 200
    assert isinstance(roles_list.json(), list)


@then('debo ver al menos los roles "administrador" y "usuario"')
def ver_roles_sistema(roles_list):
    names = [r["name"] for r in roles_list.json()]
    assert "administrador" in names
    assert "usuario" in names


@when('hago click en "Nuevo rol"')
def click_nuevo_rol():
    pass


@when(parsers.parse('ingreso el nombre "{nombre}"'), target_fixture="response")
def ingreso_nombre_crear_rol(app_ctx, state, nombre):
    unique = f"{nombre}_{uuid.uuid4().hex[:6]}"
    state["created_name"] = unique.lower()
    return app_ctx["client"].post(
        "/api/roles", json={"name": unique, "permissions": ["create_ova", "view_ova"]}
    )


@when(parsers.parse('selecciono los permisos "{p1}" y "{p2}"'))
def selecciono_permisos(p1, p2):
    pass


@then("el sistema debe crear el rol y retornar 201")
def rol_creado(response):
    assert response.status_code == 201
    body = response.json()
    assert body.get("id")
    assert body.get("name")
    assert "create_ova" in body.get("permissions", [])


@then(parsers.parse('el nuevo rol "{nombre}" debe aparecer inmediatamente en la lista'))
def nuevo_rol_en_lista(app_ctx, state, nombre):
    names = [r["name"] for r in app_ctx["client"].get("/api/roles").json()]
    assert state["created_name"] in names


@given(parsers.parse('que existe un rol con nombre "{nombre}"'))
def rol_con_nombre_existe(app_ctx, nombre):
    _seed_role(app_ctx, nombre)


@when(
    parsers.parse('intento crear otro rol con el mismo nombre "{name}"'),
    target_fixture="response",
)
def crear_rol_duplicado(app_ctx, name):
    return app_ctx["client"].post("/api/roles", json={"name": name, "permissions": []})


@then("el sistema retorna 409")
def sistema_retorna_409(response):
    assert response.status_code == 409


@then(parsers.parse('debo ver el mensaje "{msg}"'))
def ver_mensaje(response):
    assert response.json().get("detail")


@then("el rol no debe duplicarse en la lista")
def no_duplicado(app_ctx):
    names = [r["name"] for r in app_ctx["client"].get("/api/roles").json()]
    assert len(names) == len(set(names))


# ── HU-019: Editar Rol ────────────────────────────────────────────────────────

@scenario(FEATURE_EDITAR, "Modificación exitosa del rol")
def test_editar_rol():
    pass


@scenario(FEATURE_EDITAR, "Nombre duplicado al intentar editar")
def test_editar_rol_duplicado():
    pass


@given(
    parsers.parse('que existe un rol personalizado con ID "{role_id}" y nombre "{name}"'),
    target_fixture="test_role_id",
)
def rol_personalizado(app_ctx, role_id, name):
    return _seed_role(app_ctx, f"{name}_{uuid.uuid4().hex[:6]}")


@given(parsers.parse('que tengo el modal de edición del rol "{nombre}" abierto'))
def modal_edicion(nombre):
    pass


@when(parsers.parse('cambio el nombre a "{nuevo}"'), target_fixture="nuevo_nombre")
def cambio_nombre(nuevo):
    return f"{nuevo}_{uuid.uuid4().hex[:6]}"


@when(parsers.parse('selecciono el permiso "{permiso}"'))
def selecciono_permiso(permiso):
    pass


@when('hago click en "Guardar cambios"', target_fixture="response")
def guardar_cambios(app_ctx, test_role_id, nuevo_nombre):
    return app_ctx["client"].patch(f"/api/roles/{test_role_id}", json={"name": nuevo_nombre})


@then("el sistema debe actualizar el rol en la base de datos y retornar 200")
def rol_actualizado(response, nuevo_nombre):
    assert response.status_code == 200
    assert response.json().get("name") == nuevo_nombre.lower()


@then("el modal debe cerrarse automáticamente")
def modal_cerrado():
    pass


@then(parsers.parse('el rol "{nombre}" con sus nuevos permisos debe listarse inmediatamente en la tabla'))
def rol_listado(nombre):
    pass


@given(parsers.parse('que existe otro rol con nombre "{nombre}"'))
def otro_rol_existe(app_ctx, state, nombre):
    state["dup_name"] = nombre.lower()
    _seed_role(app_ctx, nombre)


@given(parsers.parse('que tengo abierto el modal de edición del rol "{nombre}"'))
def modal_edicion_abierto(nombre):
    pass


@when(parsers.parse('cambio el nombre del rol a "{nuevo}"'), target_fixture="nuevo_nombre")
def cambio_nombre_rol(state, nuevo):
    # Apunta al nombre del otro rol existente → debe chocar (409).
    return state.get("dup_name", nuevo)


@then("el sistema debe retornar un código 409")
def sistema_retorna_409_editar(response):
    assert response.status_code == 409


@then(parsers.parse('debo ver el mensaje de error "{msg}"'))
def ver_mensaje_error(response):
    assert response.json().get("detail")


@then("el modal debe permanecer abierto")
def modal_abierto():
    pass


# ── HU-020: Eliminar Rol ──────────────────────────────────────────────────────

@scenario(FEATURE_ELIMINAR, "Eliminar un rol sin usuarios asignados")
def test_eliminar_rol_sin_usuarios():
    pass


@scenario(FEATURE_ELIMINAR, "Intentar eliminar un rol con usuarios sin especificar reasignación")
def test_eliminar_rol_sin_reasignar():
    pass


@given(
    parsers.parse('que el rol "{nombre}" tiene {n:d} usuarios vinculados'),
    target_fixture="test_role_id",
)
def rol_con_usuarios_vinculados(app_ctx, nombre, n):
    return _seed_role(app_ctx, nombre, users=n)


@given('que estoy en la pantalla "/admin/roles"')
def en_pantalla_admin_roles():
    pass


@when(parsers.parse('hago click en el botón "Eliminar" de "{nombre}"'))
def click_eliminar(nombre):
    pass


@then("debo ver un modal de confirmación simple")
def ver_modal_confirmacion():
    pass


@then("debo ver la advertencia de que la acción es irreversible")
def advertencia_irreversible():
    pass


@when('hago click en "Confirmar eliminación"', target_fixture="response")
def confirmar_eliminacion(app_ctx, test_role_id):
    return app_ctx["client"].delete(f"/api/roles/{test_role_id}")


@then("el sistema debe eliminar el rol retornando 204")
def rol_eliminado(response):
    assert response.status_code == 204


@then(parsers.parse('el rol "{nombre}" debe desaparecer de la tabla local de inmediato'))
def rol_desaparece(app_ctx, test_role_id):
    ids = [r["id"] for r in app_ctx["client"].get("/api/roles").json()]
    assert test_role_id not in ids


@given(
    parsers.parse('que el rol "{nombre}" tiene {n:d} usuarios asignados'),
    target_fixture="test_role_id",
)
def rol_con_usuarios_asignados(app_ctx, nombre, n):
    return _seed_role(app_ctx, nombre, users=n)


@when(
    parsers.parse('envío un request directo DELETE a "/api/roles/{role_id}" sin query parameters'),
    target_fixture="response",
)
def delete_rol_directo(app_ctx, test_role_id, role_id):
    return app_ctx["client"].delete(f"/api/roles/{test_role_id}")


@then("el sistema retorna un código 409")
def sistema_409(response):
    # Determinista: el rol fue sembrado CON usuarios → 409 sin reasignación.
    assert response.status_code == 409


@then(parsers.parse('responde con el mensaje "{msg}"'))
def mensaje_respuesta(response):
    assert response.json().get("detail")
