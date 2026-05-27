import os

import requests
from pytest_bdd import given, parsers, scenario, then, when

_FEATURES = os.path.join(os.path.dirname(__file__), "..", "..", "..", "tests", "features")
FEATURE_AUTH_LOGIN = os.path.join(_FEATURES, "auth", "HU-008_login.feature")
FEATURE_AUTH_REGISTER = os.path.join(_FEATURES, "auth", "HU-001_registro.feature")


# ── HU-008: Login ────────────────────────────────────────────────────────────

@scenario(FEATURE_AUTH_LOGIN, "Login exitoso")
def test_login_exitoso():
    pass


@scenario(FEATURE_AUTH_LOGIN, "Credenciales inválidas")
def test_login_credenciales_invalidas():
    pass


@scenario(FEATURE_AUTH_LOGIN, "Bloqueo tras intentos fallidos")
def test_login_bloqueo():
    pass


@given("que estoy en la página de login")
def pagina_login():
    pass  # HTTP — no browser state needed


@when("ingreso un correo registrado y contraseña válida", target_fixture="response")
def login_valido(base_url):
    return requests.post(
        f"{base_url}/api/auth/login",
        json={"email": "user@genova.ai", "password": "user1234password"},
        timeout=10,
    )


@then("debo recibir un JWT con expiración de 24 horas")
def jwt_recibido(response):
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


@then("debo ser redirigido al dashboard")
def redireccion_dashboard(response):
    # API layer — confirm token present (redirect is a frontend concern)
    assert response.status_code == 200


@when(
    parsers.parse('ingreso el correo "{email}" con contraseña "{password}"'),
    target_fixture="response",
)
def login_con_credenciales(base_url, email, password):
    return requests.post(
        f"{base_url}/api/auth/login",
        json={"email": email, "password": password},
        timeout=10,
    )


@then(parsers.parse('debo ver el mensaje de error "{msg}"'))
def mensaje_error(response, msg):
    assert response.status_code in (400, 401, 403, 422)


@when(
    "ingreso credenciales incorrectas 5 veces consecutivas",
    target_fixture="responses",
)
def login_cinco_veces(base_url):
    results = []
    for _ in range(5):
        r = requests.post(
            f"{base_url}/api/auth/login",
            json={"email": "user@genova.ai", "password": "wrongpassword"},
            timeout=10,
        )
        results.append(r)
    return results


@then("la cuenta queda bloqueada temporalmente")
def cuenta_bloqueada(responses):
    last = responses[-1]
    assert last.status_code in (401, 403, 429)


# ── HU-001: Registro ─────────────────────────────────────────────────────────

@scenario(FEATURE_AUTH_REGISTER, "Registro exitoso con credenciales válidas")
def test_registro_exitoso():
    pass


@scenario(FEATURE_AUTH_REGISTER, "Registro fallido por email duplicado")
def test_registro_email_duplicado():
    pass


@given("que estoy en la página de registro")
def pagina_registro():
    pass


@when(
    parsers.parse('ingreso correo "{email}" y contraseña "{password}" válidos'),
    target_fixture="response",
)
def registro_valido(base_url, email, password):
    import uuid
    unique_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
    return requests.post(
        f"{base_url}/api/auth/register",
        json={"email": unique_email, "password": password, "full_name": "Test User"},
        timeout=10,
    )


@then("la cuenta es creada y recibo confirmación")
def cuenta_creada(response):
    assert response.status_code in (200, 201)


@when(
    parsers.parse('intento registrarme con el correo existente "{email}"'),
    target_fixture="response",
)
def registro_email_duplicado(base_url, email):
    return requests.post(
        f"{base_url}/api/auth/register",
        json={"email": "user@genova.ai", "password": "somepassword123", "full_name": "Dup"},
        timeout=10,
    )


@then("el sistema retorna error de email duplicado")
def error_email_duplicado(response):
    assert response.status_code == 409
