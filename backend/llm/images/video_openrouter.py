"""OpenRouter Video API: enviar, sondear y descargar un video.

La generación de video es asíncrona:

1. `POST /api/v1/videos` con {model, prompt, duration, resolution,
   aspect_ratio, generate_audio} → {id, polling_url, status}.
2. `GET polling_url` (= `/api/v1/videos/{id}`) hasta `completed`; `failed`,
   `cancelled` o `expired` terminan con error.
3. Descarga de `unsigned_urls[0]` (o `/api/v1/videos/{id}/content?index=0`).

La clave solo viaja en la cabecera `Authorization` hacia openrouter.ai (se
compara el host exacto, no el prefijo: «openrouter.ai.otro.com» no vale):
nunca se registra ni se manda a una URL de descarga de otro dominio.

El video ya está pagado cuando se sondea: un error pasajero de red o un 429/5xx
en un sondeo no lo tira, se vuelve a sondear hasta el tope de espera.
"""

from __future__ import annotations

import base64
import os
import time
from collections.abc import Callable
from dataclasses import dataclass

import httpx
import structlog

from core import openrouter

logger = structlog.get_logger(__name__)

_HTTP_TIMEOUT_S = 30.0
_FAILED = frozenset({"failed", "cancelled", "canceled", "expired", "error"})
# Respuestas de sondeo que no dicen nada del trabajo: se reintenta.
_TRANSIENT_STATUS = frozenset({408, 425, 429, 500, 502, 503, 504})
_VIDEO_TYPES = frozenset({"video/mp4", "video/webm"})


def is_openrouter_url(url: str) -> bool:
    """True si `url` va a openrouter.ai (o a la base configurada) por HTTPS."""
    return openrouter.is_api_url(url)


class VideoGenerationError(Exception):
    """El proveedor no generó el video (error, cancelación o tope de espera)."""


@dataclass(frozen=True)
class VideoJob:
    """Qué se pide: modelo, prompt y parámetros ya adaptados al modelo."""

    model: str
    prompt: str
    duration: int | None
    resolution: str | None
    aspect_ratio: str | None
    audio_param: bool  # el modelo acepta `generate_audio` (se manda en false)


@dataclass(frozen=True)
class VideoFile:
    data_uri: str
    size_bytes: int
    cost_usd: float | None
    job_id: str


def _headers(api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.getenv("APP_URL", "https://genova.app"),
        "X-Title": "GenOVA",
    }


def job_payload(job: VideoJob) -> dict:
    payload: dict = {"model": job.model, "prompt": job.prompt}
    if job.duration:
        payload["duration"] = job.duration
    if job.resolution:
        payload["resolution"] = job.resolution
    if job.aspect_ratio:
        payload["aspect_ratio"] = job.aspect_ratio
    if job.audio_param:
        payload["generate_audio"] = False
    return payload


def _check(resp: httpx.Response, step: str) -> dict:
    if resp.status_code >= 400:
        body = (resp.text or "")[:240].replace("\n", " ")
        raise VideoGenerationError(f"{step}: HTTP {resp.status_code} {body}")
    data = resp.json()
    if not isinstance(data, dict):
        raise VideoGenerationError(f"{step}: respuesta inesperada")
    return data


def _submit(job: VideoJob, api_key: str) -> dict:
    resp = httpx.post(
        openrouter.api_url("videos"), headers=_headers(api_key), json=job_payload(job), timeout=_HTTP_TIMEOUT_S
    )
    data = _check(resp, "submit")
    if not data.get("id"):
        raise VideoGenerationError("submit: sin id de trabajo")
    return data


def _poll_url(status: dict) -> str:
    url = str(status.get("polling_url") or "")
    if url.startswith("/"):
        url = f"{openrouter.origin()}{url}"
    # El sondeo lleva la clave: solo hacia openrouter.ai.
    return url if is_openrouter_url(url) else openrouter.api_url(f"videos/{status['id']}")


def _wait(
    status: dict,
    api_key: str,
    *,
    deadline: float,
    poll_s: float,
    heartbeat: Callable[[], None] | None,
) -> dict:
    """Sondea hasta `completed` o hasta el tope. Lanza si falla o se agota."""
    job_id = status["id"]
    while True:
        state = str(status.get("status") or "").lower()
        if state == "completed":
            return status
        if state in _FAILED:
            raise VideoGenerationError(f"job {job_id}: {state} {status.get('error') or ''}".strip())
        if time.monotonic() + poll_s > deadline:
            raise VideoGenerationError(f"job {job_id}: sin terminar al agotar el tiempo ({state})")
        time.sleep(poll_s)
        if heartbeat is not None:
            heartbeat()
        status = _poll_once(status, api_key)


def _poll_once(status: dict, api_key: str) -> dict:
    """Estado nuevo del trabajo; el mismo de antes si el sondeo falló de paso."""
    job_id = status["id"]
    try:
        resp = httpx.get(_poll_url(status), headers=_headers(api_key), timeout=_HTTP_TIMEOUT_S)
    except httpx.TransportError as exc:
        logger.info("video poll failed; retrying", job_id=job_id, error_type=type(exc).__name__)
        return status
    if resp.status_code in _TRANSIENT_STATUS:
        logger.info("video poll failed; retrying", job_id=job_id, status_code=resp.status_code)
        return status
    return {**status, **_check(resp, "poll"), "id": job_id}


def _download(status: dict, api_key: str, max_bytes: int) -> tuple[bytes, str]:
    urls = status.get("unsigned_urls") or []
    url = urls[0] if urls else openrouter.api_url(f"videos/{status['id']}/content?index=0")
    if url.startswith("/"):
        url = f"{openrouter.origin()}{url}"
    # La clave solo va a openrouter.ai; una URL firmada de otro dominio no la necesita.
    headers = {"Authorization": f"Bearer {api_key}"} if is_openrouter_url(url) else None
    chunks: list[bytes] = []
    total = 0
    with httpx.stream(
        "GET", url, headers=headers, timeout=_HTTP_TIMEOUT_S * 2, follow_redirects=True
    ) as resp:
        if resp.status_code >= 400:
            raise VideoGenerationError(f"download: HTTP {resp.status_code}")
        content_type = resp.headers.get("content-type", "video/mp4").split(";")[0].strip()
        for chunk in resp.iter_bytes():
            total += len(chunk)
            if total > max_bytes:
                raise VideoGenerationError(f"download: pasa de {max_bytes} bytes")
            chunks.append(chunk)
    # MP4 (lo normal) o WebM; otro tipo («application/octet-stream» de un bucket)
    # se trata como MP4, que es lo que devuelven los modelos de OpenRouter.
    if content_type not in _VIDEO_TYPES:
        content_type = "video/mp4"
    return b"".join(chunks), content_type


def generate_openrouter_video(
    job: VideoJob,
    api_key: str,
    *,
    deadline: float,
    poll_s: float,
    max_bytes: int,
    heartbeat: Callable[[], None] | None = None,
) -> VideoFile:
    """Genera el video y lo devuelve como data URI. Lanza VideoGenerationError."""
    status = _submit(job, api_key)
    logger.info("video job submitted", provider="openrouter", model=job.model, job_id=status["id"])
    status = _wait(status, api_key, deadline=deadline, poll_s=poll_s, heartbeat=heartbeat)
    content, content_type = _download(status, api_key, max_bytes)
    if not content:
        raise VideoGenerationError(f"job {status['id']}: video vacío")
    usage = status.get("usage") or {}
    cost = usage.get("cost") if isinstance(usage.get("cost"), (int, float)) else None
    b64 = base64.b64encode(content).decode("ascii")
    return VideoFile(f"data:{content_type};base64,{b64}", len(content), cost, str(status["id"]))
