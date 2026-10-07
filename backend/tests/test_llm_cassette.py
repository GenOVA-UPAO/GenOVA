"""Capa de record/replay (llm.cassette) e inyección de fallos — sin red ni claves.

Los cassettes se construyen a mano en tmp_path: cada entrada puede ser una
respuesta o un error (401/429/5xx/timeout/vacío) o una salida truncada
(`finish_reason="length"`), así la cadena de respaldos y la continuación del
router se ejercitan offline con el código real de `generar_texto`/`_chat`.
"""

from __future__ import annotations

import json

import openai
import pytest

import llm.router as router

generar_texto = router.generar_texto
from llm import cassette as cs
from llm.cassette import RECORD, Cassette, CassetteMissError, use_cassette
from llm.utils import llm_config_store

CHAIN = [("opencode", "oc-1"), ("openrouter", "or-1"), ("groq", "gq-1")]


def _msgs(prompt: str) -> list[dict]:
    return [{"role": "user", "content": prompt}]


@pytest.fixture(autouse=True)
def sin_proveedor(monkeypatch):
    """Ni proveedor real, ni claves, ni esperas: todo sale del cassette."""

    def prohibido(*_a, **_k):
        raise AssertionError("se intentó llamar al proveedor real")

    monkeypatch.setattr(router, "_provider_chat_once", prohibido)
    monkeypatch.setattr(router, "_get_provider_key", prohibido)
    monkeypatch.setattr(router.time, "sleep", prohibido)
    monkeypatch.setattr(
        llm_config_store,
        "stored_cached",
        lambda: {
            "defaults": {"texto": {"provider": CHAIN[0][0], "model_id": CHAIN[0][1], "extra": {}}},
            "fallbacks": {
                "texto": [{"provider": p, "model_id": m, "extra": {}} for p, m in CHAIN[1:]]
            },
        },
    )


def _cassette(tmp_path, *entries) -> str:
    c = Cassette(tmp_path / "c.json", RECORD)
    for provider, model_id, prompt, kw in entries:
        c.add(provider, model_id, prompt if isinstance(prompt, list) else _msgs(prompt), 8192, **kw)
    c.save()
    return str(c.path)


def test_replay_devuelve_lo_grabado_sin_claves(tmp_path):
    path = _cassette(tmp_path, ("opencode", "oc-1", "hola", {"content": "respuesta"}))
    with use_cassette(path):
        assert generar_texto("hola", "texto") == "respuesta"


def test_401_429_y_luego_respaldo(tmp_path):
    """El bug de la cadena de código, offline: 401 → 429 → Groq responde."""
    path = _cassette(
        tmp_path,
        (
            "opencode",
            "oc-1",
            "p",
            {"error": {"kind": "status", "status": 401, "message": "Invalid API Key"}},
        ),
        (
            "openrouter",
            "or-1",
            "p",
            {"error": {"kind": "status", "status": 429, "message": "rate"}},
        ),
        ("groq", "gq-1", "p", {"content": "de groq"}),
    )
    with use_cassette(path) as c:
        assert generar_texto("p", "texto") == "de groq"
    assert len(c._used) == 3


@pytest.mark.parametrize(
    ("error", "tipo"),
    [
        ({"kind": "timeout"}, openai.APITimeoutError),
        ({"kind": "connection"}, openai.APIConnectionError),
        ({"kind": "status", "status": 503}, openai.InternalServerError),
        ({"kind": "status", "status": 402}, openai.APIStatusError),
        ({"kind": "empty"}, cs.EmptyContentError),
    ],
)
def test_cada_error_recuperable_avanza_la_cadena(tmp_path, error, tipo):
    assert isinstance(cs.build_error(error, "x", "y"), tipo)
    path = _cassette(
        tmp_path,
        ("opencode", "oc-1", "p", {"error": error}),
        ("openrouter", "or-1", "p", {"content": "ok"}),
    )
    with use_cassette(path):
        assert generar_texto("p", "texto") == "ok"


def test_cadena_agotada_propaga_el_ultimo_error(tmp_path):
    rate = {"error": {"kind": "status", "status": 429}}
    path = _cassette(tmp_path, *[(p, m, "p", rate) for p, m in CHAIN])
    with use_cassette(path), pytest.raises(openai.RateLimitError):
        generar_texto("p", "texto")


def test_salida_truncada_se_continua(tmp_path):
    """finish_reason=length → _chat pide continuación; se concatena."""
    cont = [
        *_msgs("p"),
        {"role": "assistant", "content": "<html><body>mitad"},
        {"role": "user", "content": router._CONTINUE_PROMPT},
    ]
    path = _cassette(
        tmp_path,
        ("opencode", "oc-1", "p", {"content": "<html><body>mitad", "finish_reason": "length"}),
        ("opencode", "oc-1", cont, {"content": " y final</body></html>", "finish_reason": "stop"}),
    )
    with use_cassette(path):
        assert generar_texto("p", "texto") == "<html><body>mitad y final</body></html>"


def test_continuacion_que_reinicia_el_documento_lo_sustituye(tmp_path):
    """deepseek-v4-flash a veces reinicia en <!DOCTYPE html> en vez de continuar:
    pegarlo a mitad del <script> rompía el JS (grabado en explore_01)."""
    cortado = "<html><body><script>Math.round"
    cont = [
        *_msgs("p"),
        {"role": "assistant", "content": cortado},
        {"role": "user", "content": router._CONTINUE_PROMPT},
    ]
    completo = "```html\n<!DOCTYPE html><html><body>ok</body></html>"
    path = _cassette(
        tmp_path,
        ("opencode", "oc-1", "p", {"content": cortado, "finish_reason": "length"}),
        ("opencode", "oc-1", cont, {"content": completo, "finish_reason": "stop"}),
    )
    with use_cassette(path):
        assert generar_texto("p", "texto") == completo


def test_falta_de_entrada_es_error_claro_con_la_clave(tmp_path):
    path = _cassette(tmp_path, ("opencode", "oc-1", "otro prompt", {"content": "x"}))
    key, _ = cs.call_keys("opencode", "oc-1", _msgs("p"))
    with use_cassette(path, strict=True), pytest.raises(CassetteMissError, match=key):
        router._chat_once("opencode", "oc-1", _msgs("p"), 100, {})


def test_sin_estricto_casa_por_forma_de_llamada(tmp_path):
    """Un prompt retocado (misma forma: max_tokens y nº de mensajes) reutiliza la grabada."""
    path = _cassette(tmp_path, ("opencode", "oc-1", "prompt viejo", {"content": "grabada"}))
    with use_cassette(path, strict=False):
        assert (
            router._chat_once("opencode", "oc-1", _msgs("prompt nuevo"), 8192, {})[0] == "grabada"
        )


def test_normaliza_uuids_fechas_y_data_uris():
    a = _msgs(
        "job 3f2a8c1e-1b2c-4d5e-8f90-123456789abc a las 2026-09-28T10:11:12Z data:image/png;base64,AAAA"
    )
    b = _msgs(
        "job 00000000-1111-2222-3333-444444444444 a las 2025-01-01 08:00:00 data:image/png;base64,BBBB"
    )
    assert cs.call_keys("p", "m", a) == cs.call_keys("p", "m", b)
    assert cs.call_keys("p", "m", a) != cs.call_keys("p", "m", _msgs("otra cosa"))


def test_otro_proveedor_mismo_prompt_usa_la_grabada(tmp_path):
    path = _cassette(tmp_path, ("openrouter", "or-1", "p", {"content": "grabada"}))
    with use_cassette(path, strict=True):
        assert router._chat_once("opencode", "oc-1", _msgs("p"), 8192, {})[0] == "grabada"


def test_record_guarda_respuestas_y_errores_sin_claves(tmp_path, monkeypatch):
    from llm.auth_errors import ProviderAuthError
    monkeypatch.delenv("OPENCODE_API_KEY", raising=False)
    respuestas = iter(
        [
            openai.AuthenticationError(
                "Invalid key sk-or-v1-abcdef1234567890abcdef",
                response=cs.httpx.Response(401, request=cs.httpx.Request("POST", "https://x")),
                body=None,
            ),
            ("contenido real", "stop"),
        ]
    )

    def proveedor(*_a, **_k):
        r = next(respuestas)
        if isinstance(r, Exception):
            raise r
        return r

    monkeypatch.setattr(router, "_provider_chat_once", proveedor)
    monkeypatch.setattr(router, "_get_provider_key", lambda _p: "k")
    monkeypatch.setattr(router.time, "sleep", lambda *_a: None)  # backoff real en record
    path = tmp_path / "rec.json"
    with use_cassette(path, RECORD):
        with pytest.raises(ProviderAuthError):
            generar_texto("p", "texto")
        assert generar_texto("p", "texto") == "contenido real"
    raw = path.read_text(encoding="utf-8")
    assert "abcdef1234567890" not in raw
    entries = json.loads(raw)["entries"]
    assert entries[0]["error"]["kind"] == "provider_auth"
    assert entries[1]["response"] == {"content": "contenido real", "finish_reason": "stop"}
    # Y lo grabado se reproduce igual, sin proveedor.
    monkeypatch.setattr(router, "_provider_chat_once", lambda *a, **k: pytest.fail("red"))
    with use_cassette(path):
        with pytest.raises(ProviderAuthError):
            generar_texto("p", "texto")
        assert generar_texto("p", "texto") == "contenido real"


def test_record_reutiliza_base_sin_pagar(tmp_path, monkeypatch):
    base = _cassette(tmp_path, ("opencode", "oc-1", "p", {"content": "ya grabada"}))
    monkeypatch.setattr(router, "_get_provider_key", lambda _p: "k")
    with use_cassette(tmp_path / "nuevo.json", RECORD, base=[base]) as c:
        assert generar_texto("p", "texto") == "ya grabada"
    assert c.entries == []


def test_modo_por_entorno(tmp_path, monkeypatch):
    from core.config import settings

    (tmp_path / "session.json").write_text(
        json.dumps({"version": 1, "entries": []}),
        encoding="utf-8",
    )
    monkeypatch.setattr(settings, "llm_cassette_mode", "replay")
    monkeypatch.setattr(settings, "llm_cassette_dir", str(tmp_path))
    monkeypatch.setattr(cs, "_env_cassette", None)
    assert cs.replaying()
    with pytest.raises(CassetteMissError):
        router._chat_once("opencode", "oc-1", _msgs("p"), 100, {})
    monkeypatch.setattr(settings, "llm_cassette_mode", "off")
    assert cs.active() is None


def test_vision_tambien_se_reproduce(tmp_path, monkeypatch):
    msgs = [
        {
            "role": "user",
            "content": [{"type": "image_url", "image_url": {"url": "data:image/png;base64,QUJD"}}],
        }
    ]
    c = Cassette(tmp_path / "v.json", RECORD)
    c.add("groq", "vis-1", msgs, 1024, content="Un diagrama del ciclo de Calvin.")
    c.save()
    monkeypatch.setattr(router, "vision_chain", lambda: [("groq", "vis-1")])
    monkeypatch.setattr(router, "_provider_vision_once", lambda *a, **k: pytest.fail("red"))
    with use_cassette(c.path):
        assert router.generar_vision(msgs) == "Un diagrama del ciclo de Calvin."
