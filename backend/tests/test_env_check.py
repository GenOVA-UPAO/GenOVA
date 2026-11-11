"""Aviso al arrancar por credenciales mal pegadas (core.env_check)."""

import httpx
import pytest
import structlog

from core.env_check import CREDENTIAL_VARS, check_env_credentials, credential_problems

# Con forma de JWT, pero inventado: no es ninguna clave real.
_CLEAN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.abc_DEF-123"


def test_clave_limpia_no_tiene_problemas():
    assert credential_problems(_CLEAN) == []
    assert credential_problems("sb_secret_AbC123-xyz_789") == []
    assert credential_problems("https://abcdefgh.supabase.co") == []


def test_detecta_la_clave_que_rompia_la_subida_a_supabase():
    # Pegada con comillas tipográficas y un espacio fino: httpx no puede ponerla en
    # una cabecera (el UnicodeEncodeError de producción), y el aviso lo detecta.
    broken = "“" + _CLEAN[:20] + " " + _CLEAN[20:] + "”"
    with pytest.raises(UnicodeEncodeError):
        httpx.Headers({"apiKey": broken})

    problems = credential_problems(broken)

    assert any("no ASCII" in p and "LEFT DOUBLE QUOTATION MARK" in p for p in problems)
    assert any("comillas" in p for p in problems)
    assert any("en medio" in p for p in problems)


@pytest.mark.parametrize(
    ("value", "fragment"),
    [
        (_CLEAN + "\n", "al principio o al final"),
        ("  " + _CLEAN, "al principio o al final"),
        ('"' + _CLEAN + '"', "comillas"),
        ("'" + _CLEAN + "'", "comillas"),
        (_CLEAN[:30] + "\n" + _CLEAN[30:], "en medio"),
        (_CLEAN[:10] + " " + _CLEAN[10:], "no ASCII"),
    ],
)
def test_detecta_cada_forma_de_pegarla_mal(value, fragment):
    assert any(fragment in p for p in credential_problems(value))


def test_los_problemas_nunca_incluyen_la_clave():
    secret = "SECRETO_que_no_debe_salir_en_logs_123"
    broken = "“" + secret + "é \n”"
    text = " ".join(credential_problems(broken))
    assert "SECRETO" not in text
    assert "salir_en_logs" not in text


def test_registra_un_error_por_variable_sin_el_valor():
    secret = "sk-or-v1-NO_DEBE_APARECER_EN_EL_LOG"
    env = {
        "SUPABASE_SERVICE_ROLE_KEY": "“" + _CLEAN + "”",
        "OPENROUTER_API_KEY": secret + " ",
        "GROQ_API_KEY": "gsk_limpia_123",
        "JWT_SECRET": "no es una credencial de cabecera: no se revisa ñ",
    }
    with structlog.testing.capture_logs() as logs:
        found = check_env_credentials(env)

    assert set(found) == {"SUPABASE_SERVICE_ROLE_KEY", "OPENROUTER_API_KEY"}
    errors = [e for e in logs if e["log_level"] == "error"]
    assert sorted(e["variable"] for e in errors) == [
        "OPENROUTER_API_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
    ]
    assert "NO_DEBE_APARECER" not in repr(logs)


def test_sin_credenciales_no_registra_nada():
    with structlog.testing.capture_logs() as logs:
        assert check_env_credentials({}) == {}
    assert logs == []


def test_cubre_las_credenciales_de_render_yaml():
    import pathlib

    import yaml

    root = pathlib.Path(__file__).resolve().parents[2]
    services = yaml.safe_load((root / "render.yaml").read_text(encoding="utf-8"))["services"]
    secrets = {
        var["key"]
        for service in services
        for var in service.get("envVars", [])
        if var.get("sync") is False
        and var["key"] not in {"DATABASE_URL", "SMTP_USER", "SMTP_PASSWORD"}
    }
    assert secrets <= set(CREDENTIAL_VARS), secrets - set(CREDENTIAL_VARS)
