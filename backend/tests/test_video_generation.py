"""Generación de video de los recursos 5E: cadena, claves, límites y caída al guion.

Sin red: la llamada a OpenRouter (`generate_openrouter_video`) se sustituye por
un doble; lo que hay debajo se prueba en test_video_openrouter.py.
"""

from __future__ import annotations

import base64
import uuid
from concurrent.futures import Future
from io import BytesIO
from zipfile import ZIP_STORED, ZipFile

import pytest

from core.config import settings
from llm.images import video_generation as vg
from llm.images.video_embed import inject_video, video_prompt
from llm.images.video_generation import VideoOptions, VideoResult, build_job, generate_video
from llm.images.video_openrouter import VideoFile, VideoGenerationError
from prometheus.engine.fake_media import with_fake_media
from prometheus.plans import video_step
from scorm import build_scorm_zip_bytes

# Datos reales del listado /api/v1/videos/models (septiembre de 2026).
CATALOG = {
    "google/veo-3.1-lite": {
        "kind": "video",
        "durations": [4, 6, 8],
        "resolutions": ["720p", "1080p"],
        "aspect_ratios": ["16:9", "9:16"],
        "audio": True,
        "pricing_skus": {
            "duration_seconds_with_audio": "0.08",
            "duration_seconds_without_audio": "0.05",
            "duration_seconds_with_audio_720p": "0.05",
            "duration_seconds_without_audio_720p": "0.03",
        },
    },
    "minimax/hailuo-3-max": {
        "kind": "video",
        "durations": [5, 6, 7, 8, 9, 10],
        "resolutions": ["768p", "480p"],
        "aspect_ratios": ["21:9", "16:9", "4:3", "1:1"],
        "audio": False,
        "pricing_skus": {
            "duration_seconds": "0.08",
            "duration_seconds_480p": "0.05",
            "duration_seconds_768p": "0.08",
        },
    },
    "x-ai/grok-imagine-video": {
        "kind": "video",
        "durations": list(range(1, 16)),
        "resolutions": ["480p", "720p"],
        "aspect_ratios": ["16:9", "9:16", "1:1"],
        "audio": False,
        "pricing_skus": {
            "cents_per_image_input": "0.2",
            "cents_per_video_output_second_480p": "5",
            "cents_per_video_output_second_720p": "7",
        },
    },
    "openai/sora-2-pro": {
        "kind": "video",
        "durations": [4, 8, 12],
        "resolutions": ["720p", "1080p"],
        "aspect_ratios": ["9:16"],
        "audio": True,
        "pricing_skus": {"duration_seconds_720p": "0.30", "duration_seconds_1080p": "0.50"},
    },
}

OPTIONS = VideoOptions(
    duration_s=4, resolution="480p", aspect_ratio="16:9", timeout_s=240.0, poll_s=10.0, max_bytes=8 * 1024 * 1024
)
DATA_URI = "data:video/mp4;base64," + base64.b64encode(b"mp4-bytes").decode()


@pytest.fixture(autouse=True)
def _aislado(monkeypatch):
    monkeypatch.setattr(settings, "llm_fake", False)
    monkeypatch.delenv("LLM_FAKE_MEDIA_FAIL_MODELS", raising=False)
    monkeypatch.setattr(vg, "media_params", lambda provider, model: CATALOG.get(model, {}))
    vg.clear_video_cache()
    yield
    vg.clear_video_cache()


class _Clock:
    def __init__(self):
        self.now = 500.0

    def monotonic(self):
        return self.now


class _Provider:
    """Doble de `generate_openrouter_video`: resultado por modelo y registro de llamadas."""

    def __init__(self, outcomes: dict, clock: _Clock | None = None, spend_s: float = 0.0):
        self.outcomes, self.clock, self.spend_s = outcomes, clock, spend_s
        self.calls: list[tuple[str, str, float]] = []

    def __call__(self, job, api_key, *, deadline, poll_s, max_bytes, heartbeat=None):
        self.calls.append((job.model, api_key, deadline))
        if self.clock is not None:
            self.clock.now += self.spend_s
        outcome = self.outcomes[job.model]
        if isinstance(outcome, Exception):
            raise outcome
        return VideoFile(outcome, len(outcome), 0.12, f"job-{job.model}")


def _entry(model, provider="openrouter", key="sk-or-plataforma"):
    return {"provider": provider, "model_id": model, "api_key": key}


# ── Parámetros por modelo ──────────────────────────────────────────────────────


def test_veo_lite_pide_su_resolucion_mas_barata_sin_audio():
    job, estimate = build_job("google/veo-3.1-lite", "p", OPTIONS)
    assert (job.duration, job.resolution, job.aspect_ratio, job.audio_param) == (4, "720p", "16:9", True)
    # 4 s × 0,03 $/s (720p sin audio).
    assert estimate == pytest.approx(0.12)


def test_duracion_minima_admitida_y_resolucion_pedida_si_existe():
    job, estimate = build_job("minimax/hailuo-3-max", "p", OPTIONS)
    assert (job.duration, job.resolution, job.audio_param) == (5, "480p", False)
    assert estimate == pytest.approx(0.25)


def test_precio_en_centimos_por_segundo():
    job, estimate = build_job("x-ai/grok-imagine-video", "p", OPTIONS)
    assert (job.duration, job.resolution) == (4, "480p")
    assert estimate == pytest.approx(0.20)


def test_relacion_de_aspecto_no_admitida_usa_la_primera():
    job, _ = build_job("openai/sora-2-pro", "p", OPTIONS)
    assert job.aspect_ratio == "9:16"
    assert job.resolution == "720p"


def test_modelo_sin_catalogo_pide_los_valores_baratos_sin_estimacion():
    job, estimate = build_job("vendor/nuevo-video", "p", OPTIONS)
    assert (job.duration, job.resolution, job.aspect_ratio, job.audio_param) == (4, "480p", "16:9", False)
    assert estimate is None


def test_opciones_por_defecto_baratas_y_acotadas(monkeypatch):
    monkeypatch.setattr(settings, "ova_video_timeout_s", 5.0)
    monkeypatch.setattr(settings, "ova_video_max_mb", 8.0)
    options = vg.default_options()
    assert (options.duration_s, options.resolution, options.aspect_ratio) == (4, "480p", "16:9")
    assert options.timeout_s == 30.0  # nunca menos de 30 s
    assert options.max_bytes == 8 * 1024 * 1024


# ── Cadena principal + respaldos ───────────────────────────────────────────────


def test_recorre_la_cadena_hasta_el_primer_video_con_la_clave_de_cada_entrada(monkeypatch):
    provider = _Provider(
        {
            "google/veo-3.1-lite": VideoGenerationError("job x: failed"),
            "x-ai/grok-imagine-video": DATA_URI,
        }
    )
    monkeypatch.setattr(vg, "generate_openrouter_video", provider)
    chain = [
        _entry("google/veo-3.1-lite", key="sk-or-docente"),
        _entry("veo", provider="google", key="g-key"),  # sin Video API: se salta
        _entry("x-ai/grok-imagine-video", key="sk-or-plataforma"),
    ]

    result = generate_video("Ciclo   del\nagua", chain, options=OPTIONS)

    assert isinstance(result, VideoResult)
    assert (result.provider, result.model_id, result.data_uri) == ("openrouter", "x-ai/grok-imagine-video", DATA_URI)
    assert result.estimated_usd == pytest.approx(0.20)
    assert [(m, k) for m, k, _ in provider.calls] == [
        ("google/veo-3.1-lite", "sk-or-docente"),
        ("x-ai/grok-imagine-video", "sk-or-plataforma"),
    ]


def test_un_fallo_inesperado_nunca_lanza(monkeypatch):
    provider = _Provider({"google/veo-3.1-lite": RuntimeError("json roto")})
    monkeypatch.setattr(vg, "generate_openrouter_video", provider)
    assert generate_video("tema", [_entry("google/veo-3.1-lite")], options=OPTIONS) is None


def test_sin_clave_no_se_llama_al_proveedor(monkeypatch):
    provider = _Provider({"google/veo-3.1-lite": DATA_URI})
    monkeypatch.setattr(vg, "generate_openrouter_video", provider)
    assert generate_video("tema", [_entry("google/veo-3.1-lite", key=None)], options=OPTIONS) is None
    assert provider.calls == []


def test_un_solo_tope_de_espera_para_toda_la_cadena(monkeypatch):
    clock = _Clock()
    monkeypatch.setattr(vg, "time", clock)
    provider = _Provider(
        {"google/veo-3.1-lite": VideoGenerationError("tiempo"), "x-ai/grok-imagine-video": DATA_URI},
        clock=clock,
        spend_s=210.0,  # el principal agota casi todo el tope
    )
    monkeypatch.setattr(vg, "generate_openrouter_video", provider)
    chain = [_entry("google/veo-3.1-lite"), _entry("x-ai/grok-imagine-video")]

    assert generate_video("tema", chain, options=OPTIONS) is None
    # Quedaban 30 s (< 45 s): el respaldo no se empieza.
    assert [m for m, _, _ in provider.calls] == ["google/veo-3.1-lite"]
    assert provider.calls[0][2] == pytest.approx(500.0 + OPTIONS.timeout_s)


def test_sin_prompt_o_sin_cadena_no_hay_video(monkeypatch):
    provider = _Provider({"google/veo-3.1-lite": DATA_URI})
    monkeypatch.setattr(vg, "generate_openrouter_video", provider)
    assert generate_video("   ", [_entry("google/veo-3.1-lite")], options=OPTIONS) is None
    assert generate_video("tema", [], options=OPTIONS) is None
    assert provider.calls == []


def test_un_recurso_reparado_reutiliza_el_video_pagado(monkeypatch):
    provider = _Provider({"google/veo-3.1-lite": DATA_URI})
    monkeypatch.setattr(vg, "generate_openrouter_video", provider)
    chain = [_entry("google/veo-3.1-lite")]
    key = vg.cache_key("owner", "agua", "engage", 2, "openrouter/google/veo-3.1-lite")

    first = generate_video("tema", chain, options=OPTIONS, reuse_key=key)
    again = generate_video("tema", chain, options=OPTIONS, reuse_key=key)

    assert first is again
    assert len(provider.calls) == 1


# ── Solo con la tarea Video activa y con modelo; claves como el texto ─────────


def _stored(monkeypatch, stored):
    from llm.utils import llm_config_store

    monkeypatch.setattr(llm_config_store, "stored_cached", lambda: stored)


class _Session:
    closed = False

    def close(self):
        self.closed = True


def _keys(monkeypatch, *, own=None):
    seen = []
    session = _Session()

    def resolve_key(provider, user_keys, db, user_id=None):
        seen.append((provider, dict(user_keys or {}), db, user_id))
        return (user_keys or {}).get(provider) or f"plataforma-{provider}"

    monkeypatch.setattr("core.database.SessionLocal", lambda: session)
    monkeypatch.setattr("llm.clients.key_resolver.resolve_key", resolve_key)
    monkeypatch.setattr("llm.utils.llm_helpers.own_keys", lambda cfg: dict(own or {}))
    return seen, session


VIDEO_ON = {
    "generation_enabled": {"video": True},
    "defaults": {"video": {"provider": "openrouter", "model_id": "google/veo-3.1-lite"}},
    "fallbacks": {"video": [{"provider": "openrouter", "model_id": "x-ai/grok-imagine-video"}]},
}


@pytest.mark.parametrize(
    "stored",
    [
        {},  # por defecto el video está apagado
        {**VIDEO_ON, "generation_enabled": {"video": False}},
        {"generation_enabled": {"video": True}},  # activo pero sin modelo
    ],
)
def test_sin_tarea_video_activa_con_modelo_no_hay_cadena(monkeypatch, stored):
    _stored(monkeypatch, stored)
    seen, _ = _keys(monkeypatch)
    assert vg.video_chain_for({}) == []
    assert seen == []


def test_la_cadena_lleva_la_clave_propia_del_autor(monkeypatch):
    _stored(monkeypatch, VIDEO_ON)
    owner = uuid.uuid4()
    seen, session = _keys(monkeypatch, own={"openrouter": "sk-or-docente"})

    chain = vg.video_chain_for({"_owner_id": str(owner)})

    assert [(e["model_id"], e["api_key"]) for e in chain] == [
        ("google/veo-3.1-lite", "sk-or-docente"),
        ("x-ai/grok-imagine-video", "sk-or-docente"),
    ]
    assert {s[3] for s in seen} == {owner}
    assert session.closed


def test_sin_autor_usa_la_clave_de_plataforma(monkeypatch):
    _stored(monkeypatch, VIDEO_ON)
    seen, _ = _keys(monkeypatch)
    chain = vg.video_chain_for({"_owner_id": "no-es-un-uuid"})
    assert [e["api_key"] for e in chain] == ["plataforma-openrouter"] * 2
    assert {s[3] for s in seen} == {None}


# ── Paso de video del recurso ──────────────────────────────────────────────────


def _result(uri=DATA_URI):
    return VideoResult(uri, "openrouter", "google/veo-3.1-lite", 4, "720p", 9, 0.12, 0.12)


@pytest.mark.parametrize(("phase", "rt"), [("engage", 1), ("explore", 5), ("evaluate", 1), ("engage", "Cómic Interactivo")])
def test_solo_los_recursos_de_video_encargan_video(monkeypatch, phase, rt):
    monkeypatch.setattr(vg, "video_chain_for", lambda cfg: pytest.fail("no debía pedir la cadena"))
    assert video_step.start_video(phase, rt, "agua", {}, {}) is None


def test_recurso_de_video_con_tarea_apagada_no_encarga(monkeypatch):
    monkeypatch.setattr(vg, "video_chain_for", lambda cfg: [])
    assert video_step.start_video("engage", 2, "agua", {}, {}) is None


def test_recurso_de_video_con_tarea_activa_encarga_el_video(monkeypatch):
    chain = [_entry("google/veo-3.1-lite")]
    monkeypatch.setattr(vg, "video_chain_for", lambda cfg: chain)
    pedido = {}

    def fake_generate(prompt, got_chain, *, reuse_key=None):
        pedido.update(prompt=prompt, chain=got_chain, reuse_key=reuse_key)
        return _result()

    monkeypatch.setattr(vg, "generate_video", fake_generate)
    pending = video_step.start_video("explore", 4, "agua", {"prompt_video": "Rain over a lake"}, {})

    html = video_step.attach_video("<body><h1>Agua</h1></body>", pending)

    assert pedido["prompt"] == "Rain over a lake" and pedido["chain"] == chain and pedido["reuse_key"]
    assert '<video controls playsinline preload="metadata" src="data:video/mp4;base64,' in html
    assert 'data-genova-video-model="openrouter/google/veo-3.1-lite"' in html


def test_sin_video_o_con_fallo_se_queda_el_guion():
    html = "<body><p>Guion</p></body>"
    assert video_step.attach_video(html, None) == html
    vacio: Future = Future()
    vacio.set_result(None)
    assert video_step.attach_video(html, vacio) == html
    roto: Future = Future()
    roto.set_exception(RuntimeError("boom"))
    assert video_step.attach_video(html, roto) == html


def test_el_video_va_tras_la_cabecera_o_al_abrir_el_body():
    con_cabecera = "<body><upao-header>T</upao-header><p>guion</p></body>"
    out = inject_video(con_cabecera, DATA_URI, provider="openrouter", model_id="m")
    assert out.index("</upao-header>") < out.index("<figure") < out.index("<p>guion")
    out = inject_video('<body class="x"><p>guion</p></body>', DATA_URI, provider="openrouter", model_id="m")
    assert out.startswith('<body class="x"><figure')
    assert inject_video("<p>solo</p>", DATA_URI, provider="p", model_id='m"><script>').startswith("<figure")
    assert '"><script>' not in inject_video("", DATA_URI, provider="p", model_id='m"><script>')


def test_prompt_del_video():
    assert video_prompt({"prompt_video": " Rain \n over a lake "}, "agua") == "Rain over a lake"
    derivado = video_prompt({"guion": "Escena 1: nubes"}, "el agua")
    assert "el agua" in derivado and "Escena 1: nubes" in derivado
    assert "fotosíntesis" in video_prompt(["no es un dict"], "fotosíntesis")


# ── SCORM ──────────────────────────────────────────────────────────────────────


def test_el_scorm_saca_el_video_a_un_archivo_aparte():
    video = b"\x00\x00\x00\x18ftypmp42" + bytes(range(256)) * 400
    uri = "data:video/mp4;base64," + base64.b64encode(video).decode()
    content = inject_video(
        "<!doctype html><html><body><upao-header>T</upao-header><p>guion</p></body></html>",
        uri,
        provider="openrouter",
        model_id="google/veo-3.1-lite",
    )
    phases = [{"type": "engage", "order": 1, "content": content, "title": "Video"}]

    z = ZipFile(BytesIO(build_scorm_zip_bytes(phases=phases)))

    info = z.getinfo("resources/media/recurso_1_video_1.mp4")
    assert z.read(info.filename) == video
    assert info.compress_type == ZIP_STORED
    page = z.read("resources/recurso_1.html").decode()
    assert 'src="media/recurso_1_video_1.mp4"' in page
    assert "base64" not in page and len(page) < 2000
    assert 'href="resources/media/recurso_1_video_1.mp4"' in z.read("imsmanifest.xml").decode()


# ── Camino fake (LLM_FAKE=1) ───────────────────────────────────────────────────


def test_fake_recorre_la_cadena_sin_red(monkeypatch):
    monkeypatch.setattr(settings, "llm_fake", True)
    monkeypatch.setattr(vg, "generate_openrouter_video", lambda *a, **k: pytest.fail("LLM_FAKE no sale a la red"))
    monkeypatch.setenv("LLM_FAKE_MEDIA_FAIL_MODELS", "x-ai/grok-imagine-video")
    chain = [
        _entry("google/veo-3.1-lite", key="fake-down-1"),  # proveedor caído
        _entry("x-ai/grok-imagine-video"),  # modelo que falla
        _entry("minimax/hailuo-3-max"),
    ]

    result = generate_video("tema", chain, options=OPTIONS)

    assert result.model_id == "minimax/hailuo-3-max"
    assert result.data_uri.startswith("data:video/webm;base64,")
    assert result.cost_usd == 0.0
    assert generate_video("tema", [_entry("google/veo-3.1-lite", key=None)], options=OPTIONS) is None


def test_fake_mete_el_video_en_los_recursos_de_video(monkeypatch):
    monkeypatch.setattr(settings, "llm_fake", True)
    monkeypatch.setattr(vg, "video_chain_for", lambda cfg: [_entry("google/veo-3.1-lite")])
    stub = "<html><body><h1>Agua</h1></body></html>"

    con_video = with_fake_media(stub, "explain", 1, "agua", None, {})
    sin_video = with_fake_media(stub, "explain", 3, "agua", None, {})

    assert "<video" in con_video and "data:video/webm;base64," in con_video
    assert sin_video == stub
    assert with_fake_media(stub, "engage", "Cómic Interactivo", "agua", None, {}) == stub
