"""Generación de video para los recursos de video 5E (tarea «Video» de /models).

Solo corre cuando el administrador activó `generation_enabled.video` y la tarea
Video tiene modelo (`should_generate_video`). Recorre la cadena principal +
respaldos con un único tope de espera para toda la cadena; la clave de cada
entrada se resuelve como la del texto: la propia del autor del OVA
(`_owner_id` en `llm_config`), la heredada de su vínculo, la de plataforma o la
variable de entorno (`resolve_key`). Hoy solo OpenRouter tiene Video API; una
entrada de otro proveedor se salta.

Si nada sale (sin clave, error, tope de espera, archivo demasiado grande) el
resultado es None y el recurso se queda con su guion, como sin video. Nunca
lanza: un video no puede tumbar la generación del OVA.

Coste: se piden los valores baratos por defecto (4 s, 480p, sin audio). Con los
precios de septiembre de 2026 eso va de ~0,12 $ (Veo 3.1 Lite a 720p, su
mínima) a ~0,20 $ (Wan 3.0 o Grok Imagine a 480p) por video.
"""

from __future__ import annotations

import hashlib
import threading
import time
import uuid
from collections import OrderedDict
from collections.abc import Callable
from dataclasses import dataclass

import structlog

from llm.catalog.catalog_media_pricing import video_price_per_second
from llm.images.media_models import media_params
from llm.images.video_openrouter import (
    VideoGenerationError,
    VideoJob,
    generate_openrouter_video,
)

logger = structlog.get_logger(__name__)

SUPPORTED_PROVIDERS = frozenset({"openrouter"})
# No empezar otra entrada de la cadena si queda menos que esto.
_MIN_ATTEMPT_S = 45.0
# Un recurso reparado (repair) vuelve a pasar por aquí con el mismo tema: se
# reutiliza el video en vez de pagarlo dos veces.
_CACHE_TTL_S = 30 * 60.0
_CACHE_MAX = 6


@dataclass(frozen=True)
class VideoOptions:
    duration_s: int
    resolution: str
    aspect_ratio: str
    timeout_s: float
    poll_s: float
    max_bytes: int


@dataclass(frozen=True)
class VideoResult:
    data_uri: str
    provider: str
    model_id: str
    duration_s: int | None
    resolution: str | None
    size_bytes: int
    estimated_usd: float | None
    cost_usd: float | None


def default_options() -> VideoOptions:
    from core.config import settings

    return VideoOptions(
        duration_s=max(1, int(settings.ova_video_duration_s)),
        resolution=str(settings.ova_video_resolution or "480p").lower(),
        aspect_ratio=str(settings.ova_video_aspect_ratio or "16:9"),
        timeout_s=max(30.0, float(settings.ova_video_timeout_s)),
        poll_s=max(1.0, float(settings.ova_video_poll_s)),
        max_bytes=int(max(0.5, float(settings.ova_video_max_mb)) * 1024 * 1024),
    )


# ── Cadena y claves ────────────────────────────────────────────────────────────


def _owner_uuid(owner) -> uuid.UUID | None:
    try:
        return uuid.UUID(str(owner)) if owner else None
    except ValueError:
        return None


def video_chain_for(llm_config: dict | None) -> list[dict]:
    """Principal + respaldos con su clave, o [] si el video no está activo."""
    from llm.images.image_settings_resolve import should_generate_video, video_chain
    from llm.utils import llm_config_store

    stored = llm_config_store.stored_cached()
    if not should_generate_video(stored):
        return []
    chain = video_chain(stored)
    return _with_keys(chain, llm_config)


def _with_keys(chain: list[dict], llm_config: dict | None) -> list[dict]:
    from core.database import SessionLocal
    from llm.clients.key_resolver import resolve_key
    from llm.utils.llm_helpers import OWNER_FIELD, own_keys

    owner = _owner_uuid((llm_config or {}).get(OWNER_FIELD))
    keys = own_keys(llm_config)
    db = SessionLocal()
    try:
        return [
            {**entry, "api_key": resolve_key(entry["provider"], keys, db, owner)}
            for entry in chain
        ]
    finally:
        db.close()


# ── Parámetros por modelo ──────────────────────────────────────────────────────


def _res_value(resolution: str) -> int:
    text = str(resolution).lower()
    if text.endswith("k"):
        return int(text[:-1] or 0) * 1000 if text[:-1].isdigit() else 10_000
    return int(text[:-1]) if text.endswith("p") and text[:-1].isdigit() else 10_000


def _pick_duration(wanted: int, durations: list) -> int:
    options = sorted(int(d) for d in durations)
    return next((d for d in options if d >= wanted), options[-1])


def _pick_resolution(wanted: str, resolutions: list, skus: dict) -> str:
    if wanted in [str(r).lower() for r in resolutions]:
        return next(r for r in resolutions if str(r).lower() == wanted)

    def cost(res) -> tuple[float, int]:
        price = video_price_per_second(skus, str(res))
        return (price if price is not None else float("inf"), _res_value(res))

    return min(resolutions, key=cost)


def _pick_ratio(wanted: str, ratios: list) -> str:
    if wanted in ratios:
        return wanted
    return "16:9" if "16:9" in ratios else ratios[0]


def build_job(model: str, prompt: str, options: VideoOptions) -> tuple[VideoJob, float | None]:
    """Petición adaptada a lo que admite el modelo + coste estimado (USD)."""
    params = media_params("openrouter", model)
    durations = params.get("durations") or []
    resolutions = params.get("resolutions")
    ratios = params.get("aspect_ratios")
    skus = params.get("pricing_skus") or {}
    known = bool(params)
    duration = _pick_duration(options.duration_s, durations) if durations else options.duration_s
    if resolutions:
        resolution = _pick_resolution(options.resolution, resolutions, skus)
    else:
        # Modelo sin lista (no la necesita) o desconocido (se pide la barata).
        resolution = None if known else options.resolution
    if ratios:
        ratio = _pick_ratio(options.aspect_ratio, ratios)
    else:
        ratio = None if known else options.aspect_ratio
    job = VideoJob(
        model=model,
        prompt=prompt,
        duration=duration,
        resolution=resolution,
        aspect_ratio=ratio,
        audio_param=bool(params.get("audio")),
    )
    per_second = video_price_per_second(skus, resolution)
    estimate = round(per_second * duration, 4) if per_second is not None and duration else None
    return job, estimate


# ── Caché ──────────────────────────────────────────────────────────────────────

_cache: OrderedDict[str, tuple[float, VideoResult]] = OrderedDict()
_cache_lock = threading.Lock()


def _cache_get(key: str | None) -> VideoResult | None:
    if not key:
        return None
    with _cache_lock:
        hit = _cache.get(key)
        if hit is None or hit[0] < time.monotonic():
            _cache.pop(key, None)
            return None
        return hit[1]


def _cache_put(key: str | None, result: VideoResult) -> None:
    if not key:
        return
    with _cache_lock:
        _cache[key] = (time.monotonic() + _CACHE_TTL_S, result)
        _cache.move_to_end(key)
        while len(_cache) > _CACHE_MAX:
            _cache.popitem(last=False)


def clear_video_cache() -> None:
    """Solo para tests."""
    with _cache_lock:
        _cache.clear()


def cache_key(*parts) -> str:
    return hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest()[:32]


# ── Generación ─────────────────────────────────────────────────────────────────


def _one(
    entry: dict,
    prompt: str,
    options: VideoOptions,
    deadline: float,
    heartbeat: Callable[[], None] | None,
) -> VideoResult | None:
    from llm.images.media_fake import fake_failure, fake_media_enabled, fake_video_data_uri

    provider, model = entry.get("provider"), entry.get("model_id")
    api_key = entry.get("api_key")
    if provider not in SUPPORTED_PROVIDERS:
        logger.info("video provider not supported; skipping", provider=provider, model=model)
        return None
    job, estimate = build_job(model, prompt, options)
    if fake_media_enabled():
        if fake_failure(api_key, model):
            logger.info("fake video generation failed", provider=provider, model=model)
            return None
        uri = fake_video_data_uri()
        return VideoResult(uri, provider, model, job.duration, job.resolution, len(uri), estimate, 0.0)
    if not api_key:
        logger.warning("video generation skipped: no api_key", provider=provider, model=model)
        return None
    try:
        file = generate_openrouter_video(
            job,
            api_key,
            deadline=deadline,
            poll_s=options.poll_s,
            max_bytes=options.max_bytes,
            heartbeat=heartbeat,
        )
    except VideoGenerationError as exc:
        logger.warning("video generation failed", provider=provider, model=model, error=str(exc)[:240])
        return None
    except Exception as exc:  # noqa: BLE001 — red, JSON: nunca tumba el recurso
        logger.warning(
            "video generation crashed", provider=provider, model=model, error_type=type(exc).__name__
        )
        return None
    logger.info(
        "video generated",
        provider=provider,
        model=model,
        job_id=file.job_id,
        size_bytes=file.size_bytes,
        estimated_usd=estimate,
        cost_usd=file.cost_usd,
    )
    return VideoResult(
        file.data_uri, provider, model, job.duration, job.resolution, file.size_bytes, estimate, file.cost_usd
    )


def generate_video(
    prompt: str,
    chain: list[dict],
    *,
    options: VideoOptions | None = None,
    heartbeat: Callable[[], None] | None = None,
    reuse_key: str | None = None,
) -> VideoResult | None:
    """Primer video que salga de la cadena, dentro de un único tope de espera."""
    clean = " ".join((prompt or "").split())[:1500]
    if not clean or not chain:
        return None
    if (hit := _cache_get(reuse_key)) is not None:
        logger.info("video reused", provider=hit.provider, model=hit.model_id)
        return hit
    options = options or default_options()
    deadline = time.monotonic() + options.timeout_s
    for i, entry in enumerate(chain):
        if i > 0 and deadline - time.monotonic() < _MIN_ATTEMPT_S:
            logger.info("video chain stopped: not enough time left", tried=i)
            break
        result = _one(entry, clean, options, deadline, heartbeat)
        if result is not None:
            _cache_put(reuse_key, result)
            return result
    return None
