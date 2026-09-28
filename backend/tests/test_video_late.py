"""Video tardío: aviso «en preparación», espera en segundo plano y entrega.

Sin red ni base de datos: el sondeo de OpenRouter es un doble (httpx simulado o
`resume_openrouter_video` sustituido) y el sumidero que escribe en la BD es una
función de prueba. Lo que hace el sumidero real se prueba en
test_late_video_store.py.
"""

from __future__ import annotations

import base64
import time
from concurrent.futures import Future

import httpx
import pytest

from core.config import settings
from llm.images import video_generation as vg
from llm.images import video_late, video_openrouter
from llm.images.video_generation import VideoOptions, VideoPending, generate_video
from llm.images.video_late import ApplyReport
from llm.images.video_openrouter import VideoFile, VideoStillPending, resume_openrouter_video
from llm.images.video_placeholder import (
    MARK_ATTR,
    pending_markers,
    pending_placeholder,
    replace_pending,
    unavailable_placeholder,
)
from prometheus.plans import video_step

KEY = "sk-or-secreta-no-debe-salir"
MP4 = b"\x00\x00\x00\x18ftypmp42" + b"v" * 64
URI = "data:video/mp4;base64," + base64.b64encode(MP4).decode()
OPTIONS = VideoOptions(4, "480p", "16:9", 240.0, 10.0, 8 * 1024 * 1024)


@pytest.fixture(autouse=True)
def _aislado(monkeypatch):
    monkeypatch.setattr(settings, "llm_fake", False)
    monkeypatch.setattr(settings, "ova_video_timeout_s", 240.0)
    monkeypatch.setattr(settings, "ova_video_late_max_s", 900.0)
    monkeypatch.delenv("LLM_FAKE_VIDEO_LATE_S", raising=False)
    monkeypatch.setattr(vg, "media_params", lambda provider, model: {})
    monkeypatch.setattr(video_late, "_sleep", lambda s: None)
    monkeypatch.setattr(video_late, "SETTLE_POLL_S", 0.0)
    vg.clear_video_cache()
    video_late.install_sink(None)
    yield
    video_late.install_sink(None)
    vg.clear_video_cache()


def _pending(job_id="job-7", *, started=None, key=KEY, fake=False, reuse=None):
    started = time.time() if started is None else started
    return VideoPending(job_id, "openrouter", "google/veo-3.1-lite", started, key, None, reuse, fake)


class _Sink:
    """Sumidero de prueba: registra entregas y responde según un guion."""

    def __init__(self, reports=None):
        self.reports = list(reports or [])
        self.calls: list[tuple[str, float, str]] = []

    def __call__(self, job_id, started_at, fragment):
        self.calls.append((job_id, started_at, fragment))
        return self.reports.pop(0) if self.reports else ApplyReport(0)


# ── Aviso en el HTML ───────────────────────────────────────────────────────────


def test_el_aviso_pendiente_lleva_marcador_texto_y_variables_del_runtime():
    block = pending_placeholder("job-7", 1_790_000_000.9, "openrouter", "google/veo-3.1-lite")
    assert f'{MARK_ATTR}="job-7"' in block
    assert 'data-ova-video-started="1790000000"' in block
    assert 'data-ova-video-model="openrouter/google/veo-3.1-lite"' in block
    assert "se está generando y aparecerá aquí en unos minutos" in block
    assert "var(--primary" in block and "<figcaption" in block and 'aria-hidden="true"' in block
    assert KEY not in block and "sk-or" not in block


def test_el_aviso_definitivo_no_lleva_marcador():
    block = unavailable_placeholder()
    assert MARK_ATTR not in block
    assert "no está disponible" in block and "guion" in block


def test_se_leen_los_marcadores_pendientes():
    html = "<body>" + pending_placeholder("job-7", 100, "openrouter", "vendor/m") + "<p>guion</p></body>"
    (marker,) = pending_markers(html)
    assert (marker.job_id, marker.started_at, marker.provider, marker.model_id) == (
        "job-7",
        100.0,
        "openrouter",
        "vendor/m",
    )
    assert pending_markers("<p>sin aviso</p>") == []


def test_se_sustituye_solo_el_aviso_de_ese_trabajo():
    otro = pending_placeholder("job-otro", 100, "openrouter", "m")
    html = f"<body>{pending_placeholder('job-7', 100, 'openrouter', 'm')}<p>guion</p>{otro}</body>"
    # Un reemplazo con barras invertidas (base64, rutas) no se interpreta.
    out, n = replace_pending(html, "job-7", '<figure class="genova-video">\\1 video</figure>')
    assert n == 1
    assert '<figure class="genova-video">\\1 video</figure><p>guion</p>' in out
    assert 'data-ova-video-pending="job-otro"' in out
    assert 'data-ova-video-pending="job-7"' not in out


def test_si_el_aviso_ya_no_esta_no_se_toca_nada():
    html = "<body><p>El docente lo quitó</p></body>"
    assert replace_pending(html, "job-7", "<video>") == (html, 0)


# ── OpenRouter: tope agotado con el trabajo en marcha y reanudación ────────────


class _Clock:
    def __init__(self):
        self.now = 1000.0

    def monotonic(self):
        return self.now

    def sleep(self, seconds):
        self.now += seconds


def _install_api(monkeypatch, polls):
    calls = []
    clock = _Clock()

    def get(url, headers, timeout):
        calls.append(("GET", url, headers))
        return httpx.Response(200, json=polls.pop(0))

    def post(url, headers, json, timeout):
        calls.append(("POST", url, headers))
        return httpx.Response(202, json={"id": "job-1", "polling_url": "/api/v1/videos/job-1", "status": "pending"})

    from contextlib import contextmanager

    @contextmanager
    def stream(method, url, headers=None, timeout=None, follow_redirects=False):
        calls.append(("STREAM", url, headers))
        yield httpx.Response(200, content=MP4, headers={"content-type": "video/mp4"})

    monkeypatch.setattr(video_openrouter, "time", clock)
    monkeypatch.setattr(video_openrouter.httpx, "get", get)
    monkeypatch.setattr(video_openrouter.httpx, "post", post)
    monkeypatch.setattr(video_openrouter.httpx, "stream", stream)
    return clock, calls


def test_tope_agotado_en_marcha_lanza_pendiente_con_el_id(monkeypatch):
    clock, _ = _install_api(monkeypatch, [{"status": "in_progress"}] * 10)
    job = video_openrouter.VideoJob("m", "p", 4, "480p", "16:9", False)
    with pytest.raises(VideoStillPending) as info:
        video_openrouter.generate_openrouter_video(job, KEY, deadline=clock.now + 30, poll_s=10.0, max_bytes=10**6)
    assert info.value.job_id == "job-1"
    assert KEY not in str(info.value)


def test_la_reanudacion_sondea_una_vez_aunque_el_tope_haya_pasado(monkeypatch):
    clock, calls = _install_api(monkeypatch, [{"status": "completed", "usage": {"cost": 0.2}}])
    file = resume_openrouter_video("job-1", KEY, deadline=clock.now - 5, poll_s=10.0, max_bytes=10**6)
    assert file.data_uri == URI and file.cost_usd == 0.2
    assert calls[0][:2] == ("GET", "https://openrouter.ai/api/v1/videos/job-1")
    assert calls[-1][:2] == ("STREAM", "https://openrouter.ai/api/v1/videos/job-1/content?index=0")


def test_la_reanudacion_sin_terminar_al_tope_sigue_pendiente(monkeypatch):
    clock, _ = _install_api(monkeypatch, [{"status": "in_progress"}] * 5)
    with pytest.raises(VideoStillPending):
        resume_openrouter_video("job-1", KEY, deadline=clock.now + 20, poll_s=10.0, max_bytes=10**6)


# ── Generación: el trabajo pendiente no se tira ────────────────────────────────


def _raise_pending(job, api_key, **kw):
    raise VideoStillPending("job-9", "in_progress", "/api/v1/videos/job-9")


def test_un_trabajo_en_marcha_al_tope_da_un_pendiente_y_cierra_la_cadena(monkeypatch):
    llamadas = []

    def provider(job, api_key, **kw):
        llamadas.append(job.model)
        return _raise_pending(job, api_key)

    monkeypatch.setattr(vg, "generate_openrouter_video", provider)
    chain = [
        {"provider": "openrouter", "model_id": "a/uno", "api_key": KEY},
        {"provider": "openrouter", "model_id": "b/dos", "api_key": KEY},
    ]
    result = generate_video("tema", chain, options=OPTIONS, reuse_key="k1")

    assert isinstance(result, VideoPending)
    assert (result.job_id, result.model_id, result.reuse_key) == ("job-9", "a/uno", "k1")
    assert llamadas == ["a/uno"]  # el respaldo no se encarga: este ya está pagado
    assert KEY not in repr(result)
    # La reparación del recurso reutiliza el mismo trabajo (no paga otro video).
    assert generate_video("tema", chain, options=OPTIONS, reuse_key="k1") is result
    assert llamadas == ["a/uno"]


def test_cuando_llega_la_cache_da_el_video(monkeypatch):
    monkeypatch.setattr(vg, "generate_openrouter_video", _raise_pending)
    chain = [{"provider": "openrouter", "model_id": "a/uno", "api_key": KEY}]
    generate_video("tema", chain, options=OPTIONS, reuse_key="k2")
    video = vg.VideoResult(URI, "openrouter", "a/uno", None, None, len(MP4), None, 0.1)
    vg.settle_cached_video("k2", video)
    assert generate_video("tema", chain, options=OPTIONS, reuse_key="k2") is video


# ── Paso de video del recurso ──────────────────────────────────────────────────


def _done(value) -> Future:
    fut: Future = Future()
    fut.set_result(value)
    return fut


def test_el_recurso_sale_con_el_aviso_y_se_sigue_esperando(monkeypatch):
    vistos = []
    monkeypatch.setattr(video_late, "watch", lambda pending, **kw: vistos.append(pending) or True)
    html = video_step.attach_video("<body><upao-header>T</upao-header><p>guion</p></body>", _done(_pending()))

    assert vistos and vistos[0].job_id == "job-7"
    assert html.index("</upao-header>") < html.index(MARK_ATTR) < html.index("<p>guion")
    assert KEY not in html


def test_sin_sumidero_el_recurso_sale_con_el_aviso_definitivo():
    html = video_step.attach_video("<body><p>guion</p></body>", _done(_pending()))
    assert MARK_ATTR not in html
    assert "no está disponible" in html and "<p>guion</p>" in html


# ── Espera en segundo plano y entrega ──────────────────────────────────────────


def _resume_ok(job_id, api_key, **kw):
    assert api_key == KEY
    return VideoFile(URI, len(MP4), 0.2, job_id)


def test_el_video_tardio_se_entrega_y_actualiza_la_cache(monkeypatch):
    monkeypatch.setattr(video_openrouter, "resume_openrouter_video", _resume_ok)
    sink = _Sink([ApplyReport(2), ApplyReport(0), ApplyReport(0)])
    video_late.install_sink(sink)
    pending = _pending(reuse="k3")
    vg._cache_put("k3", pending)

    video_late._run(pending, grace_s=0.0)

    assert len(sink.calls) == 3  # sustituido y dos pasadas tranquilas
    fragment = sink.calls[0][2]
    assert f'src="{URI}"' in fragment and 'data-genova-video-model="openrouter/google/veo-3.1-lite"' in fragment
    assert isinstance(vg._cache_get("k3"), vg.VideoResult)
    assert video_late.watching() == set()


def test_si_no_llega_queda_el_aviso_definitivo(monkeypatch):
    def resume_falla(job_id, api_key, **kw):
        raise VideoStillPending(job_id, "in_progress")

    monkeypatch.setattr(video_openrouter, "resume_openrouter_video", resume_falla)
    sink = _Sink([ApplyReport(1)])
    video_late.install_sink(sink)
    pending = _pending(reuse="k4")
    vg._cache_put("k4", pending)

    video_late._run(pending, grace_s=0.0)

    assert "no está disponible" in sink.calls[0][2]
    assert vg._cache_get("k4") is None  # una reparación ya no pone el aviso


def test_mientras_alguien_escribe_se_sigue_entregando(monkeypatch):
    monkeypatch.setattr(video_openrouter, "resume_openrouter_video", _resume_ok)
    # Sustituido; un job en marcha lo vuelve a escribir; se sustituye otra vez.
    sink = _Sink([ApplyReport(1, busy=True), ApplyReport(0, busy=True), ApplyReport(1), ApplyReport(0)])
    video_late.install_sink(sink)
    video_late._run(_pending(), grace_s=0.0)
    assert len(sink.calls) == 5


def test_si_el_docente_quito_el_aviso_el_video_se_descarta(monkeypatch):
    monkeypatch.setattr(video_openrouter, "resume_openrouter_video", _resume_ok)
    sink = _Sink()
    video_late.install_sink(sink)
    video_late._run(_pending(), grace_s=0.0)
    assert len(sink.calls) == 1


def test_un_fallo_de_la_bd_se_reintenta(monkeypatch):
    monkeypatch.setattr(video_openrouter, "resume_openrouter_video", _resume_ok)
    respuestas = [RuntimeError("bd caída"), ApplyReport(1), ApplyReport(0), ApplyReport(0)]

    def sink(job_id, started_at, fragment):
        item = respuestas.pop(0)
        if isinstance(item, Exception):
            raise item
        return item

    video_late.install_sink(sink)
    video_late._run(_pending(), grace_s=0.0)
    assert respuestas == []


def test_un_trabajo_demasiado_viejo_no_se_sondea(monkeypatch):
    monkeypatch.setattr(
        video_openrouter, "resume_openrouter_video", lambda *a, **k: pytest.fail("no debía sondear")
    )
    sink = _Sink([ApplyReport(1)])
    video_late.install_sink(sink)
    video_late._run(_pending(started=time.time() - 2 * 24 * 3600), grace_s=0.0)
    assert "no está disponible" in sink.calls[0][2]


def test_el_sondeo_tardio_usa_el_tope_adicional(monkeypatch):
    visto = {}

    def resume(job_id, api_key, *, deadline, poll_s, max_bytes, polling_url=None):
        visto.update(remaining=deadline - time.monotonic(), max_bytes=max_bytes)
        return VideoFile(URI, len(MP4), None, job_id)

    monkeypatch.setattr(video_openrouter, "resume_openrouter_video", resume)
    monkeypatch.setattr(settings, "ova_video_late_max_s", 600.0)
    started = time.time() - 250  # el tope en línea (240 s) ya pasó
    assert video_late._await_video(_pending(started=started)) is not None
    assert visto["remaining"] == pytest.approx(240 + 600 - 250, abs=2)
    assert visto["max_bytes"] == 8 * 1024 * 1024


def test_watch_no_duplica_hilos_y_exige_sumidero(monkeypatch):
    assert video_late.watch(_pending()) is False  # sin sumidero
    arrancados = []
    monkeypatch.setattr(video_late.threading, "Thread", lambda **kw: arrancados.append(kw) or _NoThread())
    video_late.install_sink(_Sink())
    assert video_late.watch(_pending("job-a")) is True
    assert video_late.watch(_pending("job-a")) is True
    assert video_late.watch(_pending("id con espacios")) is False
    assert len(arrancados) == 1
    video_late._watching.clear()


class _NoThread:
    def start(self):
        pass


class _Claims:
    """Reclamo entre procesos de prueba: `libre` decide si este proceso lo gana."""

    def __init__(self, libre=True, boom=False):
        self.libre, self.boom = libre, boom
        self.acquired: list[str] = []
        self.released: list[str] = []

    def acquire(self, job_id):
        if self.boom:
            raise RuntimeError("bd caída")
        if self.libre:
            self.acquired.append(job_id)
        return self.libre

    def release(self, job_id):
        self.released.append(job_id)


def test_si_otro_proceso_lo_espera_no_se_lanza_otro_hilo(monkeypatch):
    arrancados = []
    monkeypatch.setattr(video_late.threading, "Thread", lambda **kw: arrancados.append(kw) or _NoThread())
    video_late.install_sink(_Sink(), claims=_Claims(libre=False))
    # True: el aviso sigue siendo válido porque otro proceso lo entregará.
    assert video_late.watch(_pending("job-b")) is True
    assert arrancados == [] and video_late.watching() == set()


def test_el_reclamo_se_suelta_al_terminar_la_espera(monkeypatch):
    monkeypatch.setattr(video_openrouter, "resume_openrouter_video", _resume_ok)
    claims = _Claims()
    arrancados = []
    monkeypatch.setattr(video_late.threading, "Thread", lambda **kw: arrancados.append(kw) or _NoThread())
    video_late.install_sink(_Sink([ApplyReport(1), ApplyReport(0), ApplyReport(0)]), claims=claims)
    pending = _pending("job-c")
    assert video_late.watch(pending) is True
    assert claims.acquired == ["job-c"] and len(arrancados) == 1
    video_late._run(pending, grace_s=0.0)
    assert claims.released == ["job-c"] and video_late.watching() == set()


def test_si_el_reclamo_falla_se_espera_igual(monkeypatch):
    arrancados = []
    monkeypatch.setattr(video_late.threading, "Thread", lambda **kw: arrancados.append(kw) or _NoThread())
    video_late.install_sink(_Sink(), claims=_Claims(boom=True))
    assert video_late.watch(_pending("job-d")) is True  # mejor duplicar que perder el video
    assert len(arrancados) == 1
    video_late._watching.clear()


# ── Camino fake (LLM_FAKE=1) ───────────────────────────────────────────────────


def test_fake_simula_un_video_tardio_que_llega(monkeypatch):
    monkeypatch.setattr(settings, "llm_fake", True)
    monkeypatch.setenv("LLM_FAKE_VIDEO_LATE_S", "300")
    monkeypatch.setattr(vg, "generate_openrouter_video", lambda *a, **k: pytest.fail("LLM_FAKE no sale a la red"))
    chain = [{"provider": "openrouter", "model_id": "a/uno", "api_key": "sk-fake"}]

    pending = generate_video("tema", chain, options=OPTIONS)

    assert isinstance(pending, VideoPending) and pending.fake and pending.job_id.startswith("fake-")
    result = video_late._await_video(pending)
    assert result is not None and result.data_uri.startswith("data:video/webm;base64,")


def test_fake_simula_un_video_que_nunca_llega(monkeypatch):
    monkeypatch.setattr(settings, "llm_fake", True)
    monkeypatch.setenv("LLM_FAKE_VIDEO_LATE_S", "5000")  # pasa del tope tardío
    assert video_late._await_video(_pending("fake-1", fake=True)) is None
