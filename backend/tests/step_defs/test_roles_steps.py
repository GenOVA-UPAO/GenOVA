import os

import requests
from pytest_bdd import given, parsers, scenario, then, when

_FEATURES = os.path.join(os.path.dirname(__file__), "..", "..", "..", "tests", "features")
FEATURE_CREAR = os.path.join(_FEATURES, "roles", "HU-018_crear-rol.feature")
FEATURE_EDITAR = os.path.join(_FEATURES, "roles", "HU-019_editar-rol.feature")
FEATURE_ELIMINAR = os.path.join(_FEATURES, "roles", "HU-020_eliminar-rol.feature")


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


@given(parsers.parse('que estoy autenticado como usuario con rol "{role}"'))
def autenticado_como(role):
    pass  # token fixture handles this


@given('que estoy en "/admin/roles"')
def en_admin_roles():
    pass


@when("se consulta la lista de roles", target_fixture="response")
def listar_roles(base_url, admin_token):
    return requests.get(
        f"{base_url}/api/roles",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )


@then("debo ver la lista de roles registrados")
def ver_lista_roles(response):
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@then('debo ver al menos los roles "administrador" y "usuario"')
def ver_roles_sistema(response):
    names = [r["name"] for r in response.json()]
    assert "administrador" in names
    assert "usuario" in names


@when(
    parsers.parse('creo un rol con nombre "{name}" y permisos {perms}'),
    target_fixture="response",
)
def crear_rol(base_url, admin_token, name, perms):
    import json
    permissions = json.loads(perms) if perms.startswith("[") else [perms]
    return requests.post(
        f"{base_url}/api/roles",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": name, "permissions": permissions},
        timeout=10,
    )


@then("el sistema debe crear el rol y retornar 201")
def rol_creado(response):
    assert response.status_code == 201


@when(
    parsers.parse('intento crear otro rol con el mismo nombre "{name}"'),
    target_fixture="response",
)
def crear_rol_duplicado(base_url, admin_token, name):
    return requests.post(
        f"{base_url}/api/roles",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": name, "permissions": []},
        timeout=10,
    )


@then("el sistema retorna 409")
def sistema_retorna_409(response):
    assert response.status_code == 409


# ── HU-019: Editar Rol ────────────────────────────────────────────────────────

@scenario(FEATURE_EDITAR, "Modificación exitosa del rol")
def test_editar_rol():
    pass


@scenario(FEATURE_EDITAR, "Nombre duplicado al intentar editar")
def test_editar_rol_duplicado():
    pass


@given(parsers.parse('que existe un rol personalizado con ID "{role_id}" y nombre "{name}"'))
def rol_existe(role_id, name):
    pass  # assumes seeded / prior-created data


@when(
    parsers.parse('actualizo el rol "{role_id}" con nombre "{new_name}"'),
    target_fixture="response",
)
def actualizar_rol(base_url, admin_token, role_id, new_name):
    return requests.patch(
        f"{base_url}/api/roles/{role_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": new_name},
        timeout=10,
    )


@then("el sistema debe actualizar el rol en la base de datos y retornar 200")
def rol_actualizado(response):
    assert response.status_code == 200


# ── HU-020: Eliminar Rol ──────────────────────────────────────────────────────

@scenario(FEATURE_ELIMINAR, "Eliminar un rol sin usuarios asignados")
def test_eliminar_rol_sin_usuarios():
    pass


@scenario(FEATURE_ELIMINAR, "Intentar eliminar un rol con usuarios sin especificar reasignación")
def test_eliminar_rol_sin_reasignar():
    pass


@when(
    parsers.parse('envío DELETE a "/api/roles/{role_id}" sin query parameters'),
    target_fixture="response",
)
def delete_rol(base_url, admin_token, role_id):
    return requests.delete(
        f"{base_url}/api/roles/{role_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        timeout=10,
    )


@then("el sistema debe eliminar el rol retornando 204")
def rol_eliminado(response):
    assert response.status_code == 204


@then("el sistema retorna un código 409")
def sistema_409(response):
    assert response.status_code == 409
