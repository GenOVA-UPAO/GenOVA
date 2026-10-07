"""LTI 1.3: login OIDC, launch (y sus rechazos), Deep Linking, reproductor y AGS.

La plataforma es falsa: firma los id_token con su propia clave RSA y sirve su JWKS,
su endpoint de token y el de notas por `httpx.MockTransport`. La base es SQLite en
memoria con las tablas reales.
"""

import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")

import json  # noqa: E402
import re  # noqa: E402
import time  # noqa: E402
import uuid  # noqa: E402
from html import unescape  # noqa: E402
from urllib.parse import parse_qs, urlsplit  # noqa: E402

import httpx  # noqa: E402
import jwt  # noqa: E402
import pytest  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import rsa  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from auth.dependencies import require_admin  # noqa: E402
from core.config import settings  # noqa: E402
from core.database import get_db  # noqa: E402
from core.http_middleware import SecurityHeadersMiddleware  # noqa: E402
from core.rate_limit import limiter  # noqa: E402
from lti.domain.claims import AGS_CLAIM_ENDPOINT, AGS_SCOPE_SCORE, CLAIM, DL_CLAIM  # noqa: E402
from lti.infrastructure import keys as tool_keys  # noqa: E402
from lti.infrastructure import ova_content  # noqa: E402
from lti.infrastructure.orm import (  # noqa: E402
    LtiLaunch,
    LtiOidcState,
    LtiPlatform,
    LtiToolKey,
)
from lti.infrastructure.platform_http import AgsClient, PlatformJwks  # noqa: E402
from lti.interface.http.admin_router import router as admin_router  # noqa: E402
from lti.interface.http.router import get_lti_service  # noqa: E402
from lti.interface.http.router import router as lti_router  # noqa: E402
from lti.service import LtiService  # noqa: E402
from models import Ova, OvaPhase, OvaVersion, User  # noqa: E402
from tests._sqlite_db import make_session  # noqa: E402

ISSUER = "https://moodle.upao.test"
CLIENT_ID = "genova-client"
DEPLOYMENT = "1"
JWKS_URL = f"{ISSUER}/mod/lti/certs.php"
TOKEN_URL = f"{ISSUER}/mod/lti/token.php"
AUTH_URL = f"{ISSUER}/mod/lti/auth.php"
LINEITEM = f"{ISSUER}/mod/lti/services.php/2/lineitems/7/lineitem?type_id=1"
TEACHER_EMAIL = "docente@upao.edu.pe"
INSTRUCTOR = "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"
LEARNER = "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"

PLATFORM_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
PLATFORM_KID = "plat-1"


def _platform_jwks() -> dict:
    jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(PLATFORM_KEY.public_key()))
    return {"keys": [{**jwk, "kid": PLATFORM_KID, "alg": "RS256", "use": "sig"}]}


class FakePlatform:
    """JWKS, token OAuth2 y servicio de notas del LMS, con registro de llamadas."""

    def __init__(self):
        self.requests: list[httpx.Request] = []

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        url = str(request.url)
        if url == JWKS_URL:
            return httpx.Response(200, json=_platform_jwks())
        if url == TOKEN_URL:
            return httpx.Response(200, json={"access_token": "lms-token", "expires_in": 3600})
        if "/scores" in url:
            return httpx.Response(200, json={})
        return httpx.Response(404)


@pytest.fixture
def env(monkeypatch):
    monkeypatch.setattr(limiter, "enabled", False)
    monkeypatch.setattr(settings, "lti_tool_url", "")
    monkeypatch.setattr(settings, "lti_private_key", "")
    monkeypatch.setattr(settings, "lti_state_cookie_required", True)
    tool_keys.reset_cache()
    ova_content.clear_cache()

    db = make_session(
        User.__table__,
        Ova.__table__,
        OvaVersion.__table__,
        OvaPhase.__table__,
        LtiPlatform.__table__,
        LtiToolKey.__table__,
        LtiOidcState.__table__,
        LtiLaunch.__table__,
    )
    platform = LtiPlatform(
        id=uuid.uuid4(),
        name="Moodle UPAO",
        issuer=ISSUER,
        client_id=CLIENT_ID,
        deployment_ids=[DEPLOYMENT],
        auth_login_url=AUTH_URL,
        auth_token_url=TOKEN_URL,
        jwks_url=JWKS_URL,
        is_active=True,
    )
    teacher = User(id=uuid.uuid4(), email=TEACHER_EMAIL, password_hash="x", is_active=True)
    other = User(id=uuid.uuid4(), email="otro@upao.edu.pe", password_hash="x", is_active=True)
    db.add_all([platform, teacher, other])
    db.flush()
    graded = _make_ova(db, teacher, "Fotosíntesis", ["engage", "evaluate"])
    plain = _make_ova(db, teacher, "Lectura libre", ["engage"])
    foreign = _make_ova(db, other, "OVA ajena", ["engage", "evaluate"])
    db.commit()

    fake = FakePlatform()
    transport = httpx.MockTransport(fake.handler)
    jwks = PlatformJwks(httpx.Client(transport=transport))
    ags = AgsClient(httpx.Client(transport=transport))

    app = FastAPI()
    app.add_middleware(SecurityHeadersMiddleware)
    app.include_router(lti_router)
    app.include_router(admin_router, prefix="/api/admin")
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_lti_service] = lambda: LtiService(db, jwks, ags)
    app.dependency_overrides[require_admin] = lambda: None
    client = TestClient(app, base_url="https://testserver")

    yield {
        "client": client,
        "db": db,
        "fake": fake,
        "graded": graded,
        "plain": plain,
        "foreign": foreign,
    }
    tool_keys.reset_cache()
    ova_content.clear_cache()
    db.close()


def _make_ova(db, owner, title, phase_types) -> str:
    ova = Ova(id=uuid.uuid4(), user_id=owner.id, title=title, status="listo")
    db.add(ova)
    db.flush()
    version = OvaVersion(
        id=uuid.uuid4(), ova_id=ova.id, version_number=1, prompt="p", is_active=True
    )
    db.add(version)
    db.flush()
    for order, phase_type in enumerate(phase_types, start=1):
        db.add(
            OvaPhase(
                id=uuid.uuid4(),
                version_id=version.id,
                phase_type=phase_type,
                phase_order=order,
                content=f"<!doctype html><html><body><p>{phase_type} de {title}</p></body></html>",
                title=phase_type.title(),
            )
        )
    return str(ova.id)


# --- helpers del flujo -----------------------------------------------------------


def _login(client) -> tuple[str, str]:
    response = client.get(
        "/lti/login",
        params={
            "iss": ISSUER,
            "login_hint": "user-42",
            "target_link_uri": "https://testserver/lti/launch",
            "client_id": CLIENT_ID,
            "lti_message_hint": "hint-1",
        },
        follow_redirects=False,
    )
    assert response.status_code == 302, response.text
    query = parse_qs(urlsplit(response.headers["location"]).query)
    return query["state"][0], query["nonce"][0]


def _id_token(nonce: str, *, key=PLATFORM_KEY, kid=PLATFORM_KID, **overrides) -> str:
    now = int(time.time())
    claims = {
        "iss": ISSUER,
        "aud": CLIENT_ID,
        "sub": "user-42",
        "iat": now,
        "exp": now + 300,
        "nonce": nonce,
        "email": TEACHER_EMAIL,
        "name": "Ana Docente",
        CLAIM + "version": "1.3.0",
        CLAIM + "deployment_id": DEPLOYMENT,
        CLAIM + "message_type": "LtiResourceLinkRequest",
        CLAIM + "roles": [LEARNER],
        CLAIM + "resource_link": {"id": "rl-1"},
    }
    claims.update(overrides)
    claims = {k: v for k, v in claims.items() if v is not None}
    return jwt.encode(claims, key, algorithm="RS256", headers={"kid": kid})


def _resource_claims(ova_id: str, with_ags: bool = True) -> dict:
    claims = {CLAIM + "custom": {"ova_id": ova_id}}
    if with_ags:
        claims[AGS_CLAIM_ENDPOINT] = {"scope": [AGS_SCOPE_SCORE], "lineitem": LINEITEM}
    return claims


def _dl_claims() -> dict:
    return {
        CLAIM + "message_type": "LtiDeepLinkingRequest",
        CLAIM + "roles": [INSTRUCTOR],
        CLAIM + "resource_link": None,
        DL_CLAIM + "deep_linking_settings": {
            "deep_link_return_url": f"{ISSUER}/mod/lti/contentitem_return.php",
            "accept_types": ["ltiResourceLink"],
            "data": "opaque-moodle-data",
        },
    }


def _launch(client, state: str, token: str):
    return client.post(
        "/lti/launch", data={"id_token": token, "state": state}, follow_redirects=False
    )


def _player_path(response) -> str:
    assert response.status_code == 303, response.text
    return urlsplit(response.headers["location"]).path


# --- login OIDC --------------------------------------------------------------------


def test_login_redirects_to_platform_with_state_nonce_and_secure_cookie(env):
    response = env["client"].get(
        "/lti/login",
        params={
            "iss": ISSUER,
            "login_hint": "user-42",
            "target_link_uri": "https://testserver/lti/launch",
            "lti_message_hint": "hint-1",
        },
        follow_redirects=False,
    )
    assert response.status_code == 302
    location = response.headers["location"]
    assert location.startswith(AUTH_URL + "?")
    query = parse_qs(urlsplit(location).query)
    assert query["client_id"] == [CLIENT_ID]
    assert query["redirect_uri"] == ["https://testserver/lti/launch"]
    assert query["response_mode"] == ["form_post"]
    assert query["lti_message_hint"] == ["hint-1"]
    state = query["state"][0]
    cookie = response.headers["set-cookie"]
    assert cookie.startswith(f"lti_state_{state}={state}")
    for flag in ("HttpOnly", "Secure", "SameSite=none", "Path=/lti", "Partitioned"):
        assert flag.lower() in cookie.lower()


def test_login_rejects_unknown_platform(env):
    response = env["client"].get(
        "/lti/login",
        params={"iss": "https://otro-lms.test", "login_hint": "x", "target_link_uri": "y"},
        follow_redirects=False,
    )
    assert response.status_code == 404
    assert "no está registrada" in response.text


# --- launch válido y reproductor ----------------------------------------------------


def test_valid_resource_link_launch_opens_player_without_editor(env):
    client = env["client"]
    state, nonce = _login(client)
    response = _launch(client, state, _id_token(nonce, **_resource_claims(env["graded"])))
    path = _player_path(response)
    assert path.startswith("/lti/play/") and path.endswith("/")

    player = client.get(path)
    assert player.status_code == 200
    assert "window.API" in player.text
    assert 'src="content/index.html"' in player.text
    assert "Fotosíntesis" in player.text
    csp = player.headers["content-security-policy"]
    assert csp == f"frame-ancestors 'self' {ISSUER}"
    assert "x-frame-options" not in player.headers  # el LMS debe poder enmarcarla

    index = client.get(path + "content/index.html")
    assert index.status_code == 200
    assert "resources/scorm.js" in index.text
    # frame-ancestors mira todos los ancestros (reproductor y LMS): sin el LMS, el contenido no carga.
    assert index.headers["content-security-policy"] == f"frame-ancestors 'self' {ISSUER}"
    assert client.get(path + "content/resources/scorm.js").status_code == 200
    assert "evaluate de Fotosíntesis" in client.get(path + "content/resources/recurso_2.html").text
    assert client.get(path + "content/../../etc/passwd").status_code == 404

    launch = env["db"].query(LtiLaunch).one()
    assert (launch.subject, launch.has_evaluation, launch.can_post_score) == ("user-42", True, True)


def test_launch_rejects_invalid_signature(env):
    client = env["client"]
    state, nonce = _login(client)
    forged_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    token = _id_token(nonce, key=forged_key, **_resource_claims(env["graded"]))
    response = _launch(client, state, token)
    assert response.status_code == 401
    assert "firma" in response.text
    assert env["db"].query(LtiLaunch).count() == 0


def test_launch_rejects_repeated_nonce(env):
    client = env["client"]
    state, nonce = _login(client)
    token = _id_token(nonce, **_resource_claims(env["graded"]))
    assert _launch(client, state, token).status_code == 303

    # Reenviar el mismo id_token (replay) con el mismo state.
    client.cookies.set(f"lti_state_{state}", state)
    replay = _launch(client, state, token)
    assert replay.status_code == 401
    assert "ya se usó" in unescape(replay.text)

    # Y con un state nuevo: el nonce del token ya no es el emitido para ese state.
    state2, _nonce2 = _login(client)
    again = _launch(client, state2, token)
    assert again.status_code == 401
    assert "nonce" in again.text
    assert env["db"].query(LtiLaunch).count() == 1


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"aud": "otro-cliente"}, "aud"),
        ({"iss": "https://lms-falso.test"}, "iss"),
        ({CLAIM + "deployment_id": "99"}, "deployment_id"),
        ({CLAIM + "version": "1.1"}, "1.3.0"),
        ({CLAIM + "message_type": "LtiSubmissionReviewRequest"}, "no soportado"),
        ({"aud": [CLIENT_ID, "otro"]}, "azp"),
        ({"exp": int(time.time()) - 3600}, "caducó"),
    ],
)
def test_launch_rejects_bad_claims(env, overrides, message):
    client = env["client"]
    state, nonce = _login(client)
    token = _id_token(nonce, **{**_resource_claims(env["graded"]), **overrides})
    response = _launch(client, state, token)
    assert response.status_code == 401, response.text
    assert message in unescape(response.text)
    assert env["db"].query(LtiLaunch).count() == 0


def test_launch_requires_state_cookie(env):
    client = env["client"]
    state, nonce = _login(client)
    client.cookies.clear()
    response = _launch(client, state, _id_token(nonce, **_resource_claims(env["graded"])))
    assert response.status_code == 400
    assert "cookie" in response.text


def test_launch_rejects_unknown_state(env):
    client = env["client"]
    _state, nonce = _login(client)
    fake_state = "no-existe"
    client.cookies.set(f"lti_state_{fake_state}", fake_state)
    response = _launch(client, fake_state, _id_token(nonce))
    assert response.status_code == 401


def test_launch_of_deleted_or_missing_ova_is_rejected(env):
    client = env["client"]
    state, nonce = _login(client)
    response = _launch(client, state, _id_token(nonce, **_resource_claims(str(uuid.uuid4()))))
    assert response.status_code == 404
    assert "ya no está disponible" in response.text


def test_session_token_is_scoped(env):
    client = env["client"]
    state, nonce = _login(client)
    path = _player_path(_launch(client, state, _id_token(nonce, **_resource_claims(env["graded"]))))
    token = path.split("/")[3]
    # El token del reproductor no abre el selector de Deep Linking…
    assert client.get(f"/lti/deep-link/{token}").status_code == 401
    # …ni vale como sesión de GenOVA (otra audiencia).
    with pytest.raises(jwt.InvalidAudienceError):
        jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], audience="genova")
    assert client.get("/lti/play/token-invalido/").status_code == 401


# --- Deep Linking ---------------------------------------------------------------------


def _tool_public_key(client):
    jwks = client.get("/lti/jwks").json()
    assert len(jwks["keys"]) == 1
    return jwt.PyJWK(jwks["keys"][0]).key, jwks["keys"][0]["kid"]


def test_deep_linking_returns_signed_response(env):
    client = env["client"]
    state, nonce = _login(client)
    response = _launch(client, state, _id_token(nonce, **_dl_claims()))
    path = _player_path(response)
    assert path.startswith("/lti/deep-link/")

    selector = client.get(path)
    assert selector.status_code == 200
    assert "Fotosíntesis" in selector.text and "Lectura libre" in selector.text
    assert "OVA ajena" not in selector.text

    submit = client.post(path, data={"ova_id": env["graded"]})
    assert submit.status_code == 200
    assert f'action="{ISSUER}/mod/lti/contentitem_return.php"' in submit.text
    token = unescape(re.search(r'name="JWT" value="([^"]+)"', submit.text).group(1))

    public_key, kid = _tool_public_key(client)
    assert jwt.get_unverified_header(token)["kid"] == kid
    claims = jwt.decode(token, public_key, algorithms=["RS256"], audience=ISSUER, issuer=CLIENT_ID)
    assert claims[CLAIM + "message_type"] == "LtiDeepLinkingResponse"
    assert claims[CLAIM + "version"] == "1.3.0"
    assert claims[CLAIM + "deployment_id"] == DEPLOYMENT
    assert claims[DL_CLAIM + "data"] == "opaque-moodle-data"
    [item] = claims[DL_CLAIM + "content_items"]
    assert item["type"] == "ltiResourceLink"
    assert item["url"] == "https://testserver/lti/launch"
    assert item["custom"] == {"ova_id": env["graded"]}
    assert item["lineItem"]["scoreMaximum"] == 100

    # La selección es de un solo uso.
    assert client.post(path, data={"ova_id": env["graded"]}).status_code == 401


def test_deep_linking_without_evaluation_has_no_line_item(env):
    client = env["client"]
    state, nonce = _login(client)
    path = _player_path(_launch(client, state, _id_token(nonce, **_dl_claims())))
    submit = client.post(path, data={"ova_id": env["plain"]})
    token = unescape(re.search(r'name="JWT" value="([^"]+)"', submit.text).group(1))
    claims = jwt.decode(token, options={"verify_signature": False})
    assert "lineItem" not in claims[DL_CLAIM + "content_items"][0]


def test_deep_linking_rejects_foreign_ova_and_learners(env):
    client = env["client"]
    state, nonce = _login(client)
    path = _player_path(_launch(client, state, _id_token(nonce, **_dl_claims())))
    assert client.post(path, data={"ova_id": env["foreign"]}).status_code == 403

    state2, nonce2 = _login(client)
    learner = _id_token(nonce2, **{**_dl_claims(), CLAIM + "roles": [LEARNER]})
    response = _launch(client, state2, learner)
    assert response.status_code == 403
    assert "docente" in response.text


def test_deep_linking_without_matching_account(env):
    client = env["client"]
    state, nonce = _login(client)
    token = _id_token(nonce, **{**_dl_claims(), "email": "nadie@upao.edu.pe"})
    page = client.get(_player_path(_launch(client, state, token)))
    assert page.status_code == 200
    assert "no coincide con ninguna cuenta" in page.text


# --- AGS ----------------------------------------------------------------------------


def test_ags_posts_the_score(env):
    client = env["client"]
    state, nonce = _login(client)
    path = _player_path(_launch(client, state, _id_token(nonce, **_resource_claims(env["graded"]))))

    result = client.post(path + "score", json={"score": 85})
    assert result.status_code == 200, result.text
    assert result.json() == {"sent": True, "score": 85.0}

    token_req, score_req = [r for r in env["fake"].requests if str(r.url) != JWKS_URL]
    assert str(token_req.url) == TOKEN_URL
    form = parse_qs(token_req.content.decode())
    assert form["grant_type"] == ["client_credentials"]
    assert form["scope"] == [AGS_SCOPE_SCORE]
    public_key, _kid = _tool_public_key(client)
    assertion = jwt.decode(
        form["client_assertion"][0], public_key, algorithms=["RS256"], audience=TOKEN_URL
    )
    assert assertion["iss"] == assertion["sub"] == CLIENT_ID

    assert (
        str(score_req.url)
        == f"{ISSUER}/mod/lti/services.php/2/lineitems/7/lineitem/scores?type_id=1"
    )
    assert score_req.headers["authorization"] == "Bearer lms-token"
    assert score_req.headers["content-type"] == "application/vnd.ims.lis.v1.score+json"
    body = json.loads(score_req.content)
    assert body["userId"] == "user-42"
    assert (body["scoreGiven"], body["scoreMaximum"]) == (85.0, 100.0)
    assert (body["activityProgress"], body["gradingProgress"]) == ("Completed", "FullyGraded")
    assert env["db"].query(LtiLaunch).one().last_score == "85"


def test_ags_is_skipped_without_evaluation_or_endpoint(env):
    client = env["client"]
    state, nonce = _login(client)
    plain = _player_path(_launch(client, state, _id_token(nonce, **_resource_claims(env["plain"]))))
    assert client.post(plain + "score", json={"score": 90}).json() == {
        "sent": False,
        "reason": "sin_evaluacion",
    }
    state2, nonce2 = _login(client)
    no_ags = _player_path(
        _launch(
            client, state2, _id_token(nonce2, **_resource_claims(env["graded"], with_ags=False))
        )
    )
    assert client.post(no_ags + "score", json={"score": 90}).json() == {
        "sent": False,
        "reason": "sin_ags",
    }
    assert client.post(no_ags + "score", json={"score": 150}).status_code == 422
    assert not [r for r in env["fake"].requests if "/scores" in str(r.url)]


# --- admin ------------------------------------------------------------------------------


def test_admin_platform_crud_and_tool_config(env):
    client = env["client"]
    tool = client.get("/api/admin/lti/tool").json()
    assert tool["login_url"] == "https://testserver/lti/login"
    assert tool["launch_url"] == "https://testserver/lti/launch"
    assert tool["jwks_url"] == "https://testserver/lti/jwks"
    assert tool["public_jwk"]["kid"] == tool["kid"]
    assert "d" not in tool["public_jwk"]  # nunca la parte privada

    payload = {
        "name": "Canvas",
        "issuer": "https://canvas.instructure.com",
        "client_id": "1000",
        "deployment_ids": [" dep-1 ", "dep-1", "dep-2"],
        "auth_login_url": "https://sso.canvaslms.com/api/lti/authorize_redirect",
        "auth_token_url": "https://sso.canvaslms.com/login/oauth2/token",
        "jwks_url": "https://sso.canvaslms.com/api/lti/security/jwks",
    }
    created = client.post("/api/admin/lti/platforms", json=payload)
    assert created.status_code == 201, created.text
    assert created.json()["deployment_ids"] == ["dep-1", "dep-2"]
    platform_id = created.json()["id"]

    assert client.post("/api/admin/lti/platforms", json=payload).status_code == 409
    assert (
        client.post("/api/admin/lti/platforms", json={**payload, "deployment_ids": []}).status_code
        == 422
    )
    assert (
        client.post("/api/admin/lti/platforms", json={**payload, "jwks_url": "ftp://x"}).status_code
        == 422
    )

    updated = client.put(
        f"/api/admin/lti/platforms/{platform_id}", json={**payload, "is_active": False}
    )
    assert updated.json()["is_active"] is False
    assert len(client.get("/api/admin/lti/platforms").json()) == 2
    deleted = client.delete(f"/api/admin/lti/platforms/{platform_id}")
    assert deleted.status_code == 204
    deleted_again = client.delete(f"/api/admin/lti/platforms/{platform_id}")
    assert deleted_again.status_code == 404


def test_tool_key_is_stored_encrypted_and_stable(env):
    db = env["db"]
    first = tool_keys.get_tool_key(db)
    row = db.query(LtiToolKey).one()
    assert "PRIVATE KEY" not in row.private_key_encrypted
    tool_keys.reset_cache()
    assert tool_keys.get_tool_key(db).kid == first.kid


def test_tool_key_from_environment(env, monkeypatch):
    from cryptography.hazmat.primitives import serialization

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    pem = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()
    monkeypatch.setattr(settings, "lti_private_key", pem.replace("\n", "\\n"))
    monkeypatch.setattr(settings, "lti_key_id", "genova-2026")
    tool_keys.reset_cache()
    jwks = env["client"].get("/lti/jwks").json()
    assert [k["kid"] for k in jwks["keys"]] == ["genova-2026"]
    assert env["db"].query(LtiToolKey).count() == 0
