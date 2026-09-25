"""OpenRouter Video API: enviar, sondear y descargar (sin red: httpx simulado).

Contrato según la documentación de OpenRouter (septiembre de 2026):
`POST /api/v1/videos` → 202 {id, polling_url, status: pending}; `GET polling_url`
hasta `completed` (o `failed`/`cancelled`/`expired`); descarga de
`unsigned_urls[0]` o de `/api/v1/videos/{id}/content?index=0`.
"""

from __future__ import annotations

import base64
from contextlib import contextmanager

import httpx
import pytest

from llm.images import video_openrouter
from llm.images.video_openrouter import (
    VideoGenerationError,
    VideoJob,
    generate_openrouter_video,
    is_openrouter_url,
    job_payload,
)

MP4 = b"\x00\x00\x00\x18ftypmp42" + b"x" * 200
KEY = "sk-or-test"


class _Clock:
    """Reloj falso: `sleep` avanza el tiempo sin esperar."""

    def __init__(self):
        self.now = 1000.0
        self.sleeps = 0

    def monotonic(self):
        return self.now

    def sleep(self, seconds):
        self.sleeps += 1
        self.now += seconds


class _Api:
    """OpenRouter simulado: registra cada petición y responde según el guion."""

    def __init__(self, polls, *, submit=None, download=None, content_type="video/mp4"):
        self.polls = list(polls)
        self.submit = submit or httpx.Response(
            202, json={"id": "job-1", "polling_url": "/api/v1/videos/job-1", "status": "pending"}
        )
        self.download = MP4 if download is None else download
        self.content_type = content_type
        self.calls: list[tuple[str, str, dict | None]] = []

    def post(self, url, headers, json, timeout):
        self.calls.append(("POST", url, headers))
        self.body = json
        return self.submit

    def get(self, url, headers, timeout):
        self.calls.append(("GET", url, headers))
        item = self.polls.pop(0)
        if isinstance(item, Exception):
            raise item
        return item if isinstance(item, httpx.Response) else httpx.Response(200, json=item)

    @contextmanager
    def stream(self, method, url, headers=None, timeout=None, follow_redirects=False):
        self.calls.append(("STREAM", url, headers))
        yield httpx.Response(200, content=self.download, headers={"content-type": self.content_type})


def _install(monkeypatch, api: _Api) -> _Clock:
    clock = _Clock()
    monkeypatch.setattr(video_openrouter, "time", clock)
    monkeypatch.setattr(video_openrouter.httpx, "post", api.post)
    monkeypatch.setattr(video_openrouter.httpx, "get", api.get)
    monkeypatch.setattr(video_openrouter.httpx, "stream", api.stream)
    return clock


def _job(**kw):
    base = {
        "model": "google/veo-3.1-lite",
        "prompt": "Ciclo del agua",
        "duration": 4,
        "resolution": "720p",
        "aspect_ratio": "16:9",
        "audio_param": True,
    }
    return VideoJob(**{**base, **kw})


def _run(clock: _Clock, *, timeout=240.0, max_bytes=8 * 1024 * 1024, heartbeat=None):
    return generate_openrouter_video(
        _job(), KEY, deadline=clock.now + timeout, poll_s=10.0, max_bytes=max_bytes, heartbeat=heartbeat
    )


def _completed(**extra):
    return {"id": "job-1", "status": "completed", "usage": {"cost": 0.12}, **extra}


def test_el_cuerpo_sigue_la_api_y_pide_el_video_sin_audio():
    assert job_payload(_job()) == {
        "model": "google/veo-3.1-lite",
        "prompt": "Ciclo del agua",
        "duration": 4,
        "resolution": "720p",
        "aspect_ratio": "16:9",
        "generate_audio": False,
    }
    # Un modelo que no admite `generate_audio` (o sin datos de catálogo) no lo recibe.
    minimo = job_payload(_job(duration=None, resolution=None, aspect_ratio=None, audio_param=False))
    assert minimo == {"model": "google/veo-3.1-lite", "prompt": "Ciclo del agua"}


def test_envia_sondea_hasta_completar_y_devuelve_un_data_uri(monkeypatch):
    api = _Api([{"status": "in_progress"}, {"status": "pending"}, _completed()])
    clock = _install(monkeypatch, api)
    latidos = []

    file = _run(clock, heartbeat=lambda: latidos.append(1))

    assert file.job_id == "job-1"
    assert file.size_bytes == len(MP4)
    assert file.cost_usd == 0.12
    assert file.data_uri == "data:video/mp4;base64," + base64.b64encode(MP4).decode()
    metodo, url, headers = api.calls[0]
    assert (metodo, url) == ("POST", "https://openrouter.ai/api/v1/videos")
    assert headers["Authorization"] == f"Bearer {KEY}"
    # El `polling_url` relativo se resuelve contra openrouter.ai.
    assert [c[1] for c in api.calls if c[0] == "GET"] == ["https://openrouter.ai/api/v1/videos/job-1"] * 3
    # Sin `unsigned_urls`: descarga del endpoint de contenido, con la clave.
    assert api.calls[-1][:2] == ("STREAM", "https://openrouter.ai/api/v1/videos/job-1/content?index=0")
    assert api.calls[-1][2] == {"Authorization": f"Bearer {KEY}"}
    assert len(latidos) == 3 and clock.sleeps == 3


def test_descarga_de_unsigned_urls_sin_mandar_la_clave_a_otro_dominio(monkeypatch):
    firmada = "https://storage.example.com/video.mp4?sig=abc"
    api = _Api([_completed(unsigned_urls=[firmada])])

    _run(_install(monkeypatch, api))

    assert api.calls[-1] == ("STREAM", firmada, None)


def test_un_dominio_parecido_no_recibe_la_clave(monkeypatch):
    trampa = "https://openrouter.ai.evil.example/api/v1/videos/job-1"
    assert not is_openrouter_url(trampa)
    assert not is_openrouter_url("http://openrouter.ai/api/v1/videos/job-1")
    assert is_openrouter_url("https://openrouter.ai/api/v1/videos/job-1/content?index=0")

    api = _Api(
        [{"status": "in_progress", "polling_url": trampa}, _completed(unsigned_urls=[trampa + "/content"])],
        submit=httpx.Response(202, json={"id": "job-1", "polling_url": trampa, "status": "pending"}),
    )
    _run(_install(monkeypatch, api))

    # El sondeo va a la URL propia de OpenRouter, nunca al dominio parecido.
    assert {c[1] for c in api.calls if c[0] == "GET"} == {"https://openrouter.ai/api/v1/videos/job-1"}
    assert api.calls[-1] == ("STREAM", trampa + "/content", None)


@pytest.mark.parametrize("estado", ["failed", "cancelled", "expired"])
def test_un_trabajo_que_falla_lanza_error(monkeypatch, estado):
    api = _Api([{"status": "in_progress"}, {"status": estado, "error": "content policy"}])
    with pytest.raises(VideoGenerationError, match=estado):
        _run(_install(monkeypatch, api))
    assert not [c for c in api.calls if c[0] == "STREAM"]


def test_se_agota_el_tiempo_sin_esperar_de_mas(monkeypatch):
    api = _Api([{"status": "in_progress"}] * 100)
    clock = _install(monkeypatch, api)
    inicio = clock.now

    with pytest.raises(VideoGenerationError, match="agotar el tiempo"):
        _run(clock, timeout=60.0)

    # Nunca duerme pasado el tope: 6 sondeos de 10 s llegan justo a 60 s, un séptimo no.
    assert clock.now - inicio <= 60.0
    assert clock.sleeps == 6


def test_un_error_pasajero_al_sondear_no_pierde_el_video(monkeypatch):
    api = _Api(
        [
            httpx.ConnectError("reset"),
            httpx.Response(503, text="upstream"),
            httpx.Response(429, text="slow down"),
            _completed(),
        ]
    )
    file = _run(_install(monkeypatch, api))
    assert file.size_bytes == len(MP4)


def test_un_error_definitivo_al_sondear_lanza(monkeypatch):
    api = _Api([httpx.Response(401, text="bad key")])
    with pytest.raises(VideoGenerationError, match="poll: HTTP 401"):
        _run(_install(monkeypatch, api))


@pytest.mark.parametrize(
    "respuesta",
    [
        httpx.Response(402, json={"error": {"code": 402, "message": "Insufficient credits"}}),
        httpx.Response(400, json={"error": {"code": 400, "message": "resolution not supported"}}),
        httpx.Response(202, json={"status": "pending"}),  # sin id de trabajo
    ],
)
def test_si_el_envio_falla_no_se_sondea(monkeypatch, respuesta):
    api = _Api([], submit=respuesta)
    with pytest.raises(VideoGenerationError, match="submit"):
        _run(_install(monkeypatch, api))
    assert [c[0] for c in api.calls] == ["POST"]


def test_completado_sin_video_lanza(monkeypatch):
    api = _Api([_completed()], download=b"")
    with pytest.raises(VideoGenerationError, match="vacío"):
        _run(_install(monkeypatch, api))


def test_un_video_demasiado_grande_se_descarta(monkeypatch):
    api = _Api([_completed()], download=b"x" * 5000)
    with pytest.raises(VideoGenerationError, match="pasa de"):
        _run(_install(monkeypatch, api), max_bytes=4096)


@pytest.mark.parametrize(
    ("cabecera", "tipo"),
    [("video/webm", "video/webm"), ("application/octet-stream", "video/mp4"), ("video/quicktime", "video/mp4")],
)
def test_el_tipo_del_data_uri_es_mp4_o_webm(monkeypatch, cabecera, tipo):
    api = _Api([_completed()], content_type=cabecera)
    assert _run(_install(monkeypatch, api)).data_uri.startswith(f"data:{tipo};base64,")
