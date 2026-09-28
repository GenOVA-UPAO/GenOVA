"""Flujo REAL de generación reproducido desde cassettes (sin red, sin claves, sin coste).

Cada cassette de tests/fixtures/llm_cassettes/<fase>_<NN>.json se grabó con
`scripts/record_llm_cassettes.py` contra deepseek-v4-flash: prompts reales →
salida real del modelo. Aquí se reproduce y corre de verdad todo lo demás:
parseo JSON (con reintento), validate_and_repair, refinado, runtime UPAO,
chequeo de JS, crítico y, para el OVA completo, el grafo work-pool entero
(critic → repair → editor → assemble) y el empaquetado SCORM.
"""

from __future__ import annotations

import json
import socket
from io import BytesIO
from zipfile import ZipFile

import pytest

from llm.cassette import REPLAY, use_cassette
from llm.utils.html_validator import validate_html
from prometheus.engine.js_check import script_syntax_errors
from prometheus.engine.validate import resource_defects
from prometheus.plans.plan_map import PODCAST, TWO_STEP, plan_for
from scripts import llm_replay as rp

# Un caso por tipo de recurso del catálogo 5E; sin cassette grabado → skip.
ALL = rp.all_resources()

# Recursos cuya salida real grabada conserva defectos: son hallazgos del
# pipeline (ver el informe de la grabación), no fallos del replay.
KNOWN_DEFECTS: dict[tuple[str, int], str] = {
    ("explore", 1): (
        "Continuación rota: al cortarse por longitud, el modelo reinicia el documento "
        "(<!DOCTYPE html>) en vez de continuar y llm.router._chat lo concatena a mitad "
        "del <script>; el JS queda con SyntaxError y las 2 rondas de refinado no lo arreglan"
    ),
}


@pytest.fixture(autouse=True)
def sin_red(monkeypatch):
    """Cualquier intento de conexión es un fallo: el replay no toca la red."""

    def bloqueado(*_a, **_k):
        raise AssertionError("el replay intentó abrir una conexión de red")

    monkeypatch.setattr(socket.socket, "connect", bloqueado)
    monkeypatch.setattr(socket, "create_connection", bloqueado)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.setattr("llm.router.time.sleep", lambda *_a, **_k: None)


def _replay_resource(phase: str, rt: int, path=None):
    with rp.offline_env(), use_cassette(path or rp.cassette_path(phase, rt), REPLAY) as c:
        run = rp.run_resource(phase, rt)
    return run, c


@pytest.mark.parametrize(("phase", "rt"), ALL, ids=[f"{p}:{n}" for p, n in ALL])
def test_recurso_reproducido_es_valido(phase, rt, request):
    if not rp.cassette_path(phase, rt).exists():
        pytest.skip(f"sin cassette: python -m scripts.record_llm_cassettes --only {phase}:{rt}")
    if (phase, rt) in KNOWN_DEFECTS:
        # strict: si se arregla y se regraba, el xfail pasa a fallar y obliga a quitarlo.
        request.applymarker(pytest.mark.xfail(reason=KNOWN_DEFECTS[(phase, rt)], strict=True))
    run, cassette = _replay_resource(phase, rt)
    html = run.html

    assert html.strip(), "HTML vacío"
    assert validate_html(html, phase, rt) == []
    assert script_syntax_errors(html) == []
    assert resource_defects(html, rp.CONCEPT) == []
    assert run.defects == []
    assert "fotos" in html.lower(), "el recurso no trata el concepto pedido"

    plan = plan_for(phase, rt)
    if plan == PODCAST:
        assert run.raw_json["monologue"].strip()
        assert "<audio" not in html.lower()  # el TTS no se graba: solo texto
    else:
        assert "<h1" in html.lower()
        assert "UPAO Components v" in html  # runtime inyectado (tema upao)
    if plan == TWO_STEP:
        # El paso texto→JSON se parseó (no quedó el texto crudo de respaldo).
        assert isinstance(run.raw_json, (dict, list))
        assert not (isinstance(run.raw_json, dict) and set(run.raw_json) == {"contenido"})

    assert 0 <= run.critic["puntaje"] <= 100
    assert run.critic["veredicto"] in ("aceptar", "revisar")
    # Todas las respuestas grabadas se consumieron (no sobra ni falta ninguna llamada).
    assert len(cassette._used) == len(cassette.entries)


_OVA_READY = (
    all(rp.cassette_path(p, n).exists() for p, n in rp.OVA_RESOURCES)
    and (rp.CASSETTE_DIR / rp.OVA_CASSETTE).exists()
)


@pytest.mark.skipif(not _OVA_READY, reason="sin cassettes del OVA completo")
def test_ova_completo_grafo_y_scorm():
    from scorm import build_scorm_zip_bytes

    base = [rp.cassette_path(p, n) for p, n in rp.OVA_RESOURCES]
    with rp.offline_env(), use_cassette(rp.CASSETTE_DIR / rp.OVA_CASSETTE, REPLAY, base=base):
        out = rp.run_ova()

    results = out["results"]
    assert out["ova_status"] == "listo"
    assert sorted((r["phase"], r["resource_type"]) for r in results) == sorted(rp.OVA_RESOURCES)
    assert not out.get("errors")
    assert all(r["html"].strip() and r.get("score", 0) > 0 for r in results)
    assert "hallazgos" in out.get("coherence_report", {})  # el editor respondió y se parseó

    phases = [
        {"type": r["phase"], "order": i, "content": r["html"], "title": r["title"]}
        for i, r in enumerate(results, start=1)
    ]
    z = ZipFile(
        BytesIO(
            build_scorm_zip_bytes(course_title="Fotosíntesis", module_title="OVA", phases=phases)
        )
    )
    names = set(z.namelist())
    assert {"imsmanifest.xml", "index.html"} <= names
    for i in range(1, len(results) + 1):
        assert f"resources/recurso_{i}.html" in names
        assert z.read(f"resources/recurso_{i}.html").decode("utf-8").strip()


def _con_fallo_en_codigo(src, dst, errores: list[dict]):
    """Copia un cassette real metiendo errores ANTES de la primera llamada de
    código (misma clave): la cadena de respaldos debe superarlos."""
    data = json.loads(src.read_text(encoding="utf-8"))
    entries = data["entries"]
    idx = next(i for i, e in enumerate(entries) if e["max_tokens"] == 24000)
    fallos = [{**entries[idx], "error": e} for e in errores]
    for f in fallos:
        f.pop("response", None)
    data["entries"] = entries[:idx] + fallos + entries[idx:]
    dst.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return dst


_FAULT_RT = ("evaluate", 1)


@pytest.mark.skipif(not rp.cassette_path(*_FAULT_RT).exists(), reason="sin cassette evaluate:1")
@pytest.mark.parametrize(
    "error",
    [
        {"kind": "status", "status": 429, "message": "rate limited"},
        {"kind": "status", "status": 502, "message": "bad gateway"},
        {"kind": "timeout"},
        {"kind": "empty"},
    ],
    ids=["429", "502", "timeout", "vacio"],
)
def test_fallo_real_del_proveedor_pasa_al_respaldo(tmp_path, error):
    """Con el cassette real + un fallo inyectado el recurso sale igual (vía respaldo)."""
    limpio, _ = _replay_resource(*_FAULT_RT)
    path = _con_fallo_en_codigo(rp.cassette_path(*_FAULT_RT), tmp_path / "f.json", [error])
    run, _ = _replay_resource(*_FAULT_RT, path=path)
    assert run.html == limpio.html


@pytest.mark.skipif(not rp.cassette_path(*_FAULT_RT).exists(), reason="sin cassette evaluate:1")
def test_cadena_agotada_el_recurso_falla(tmp_path):
    """Primario y respaldo caen (401 y 429): generate_resource propaga el error."""
    import openai

    errores = [{"kind": "status", "status": 401, "message": "Invalid API Key"}]
    errores.append({"kind": "status", "status": 429, "message": "rate limited"})
    path = _con_fallo_en_codigo(rp.cassette_path(*_FAULT_RT), tmp_path / "f.json", errores)
    with pytest.raises(openai.RateLimitError):
        _replay_resource(*_FAULT_RT, path=path)
