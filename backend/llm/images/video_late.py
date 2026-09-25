"""Video tardío: seguir esperando en segundo plano un video que no llegó a tiempo.

Cuando el tope de espera de la generación (`OVA_VIDEO_TIMEOUT_S`) llega con el
trabajo de video aún en marcha, el proveedor ya lo cobró: tirarlo es pagar por
nada. El recurso sale con el aviso «video en preparación» (`video_placeholder`)
y aquí un hilo propio sigue sondeando el mismo trabajo, con el mismo código y
las mismas protecciones que el sondeo en línea (`resume_openrouter_video`: la
clave solo a la API, tope de bytes, tipo de contenido), hasta un tope adicional
(`OVA_VIDEO_LATE_MAX_S`, contado desde que acaba el tope en línea).

Al terminar se entrega el resultado a un «sumidero» que registra la capa de
generación (`install_sink`): sustituye el aviso por el video, o por el aviso
definitivo si no llegó, en todo lo que lo contenga (recurso del job, fases del
OVA y su SCORM). `llm` no puede importar `generation` (import-linter), por eso el
sumidero se inyecta al arrancar el proceso (main.py y worker.py).

La entrega se repite unos minutos: el aviso puede no estar aún en la base de
datos (la regeneración escribe la versión nueva al final) o volver a escribirse
desde una copia vieja (un job o una regeneración en curso). El sumidero dice
cuántos avisos sustituyó y si queda alguien que aún pueda escribir uno.

Los hilos viven en memoria: un reinicio los pierde. Al arrancar, la capa de
generación busca los avisos pendientes y los reanuda con `resume`.
"""

from __future__ import annotations

import threading
import time
from collections.abc import Callable
from dataclasses import dataclass

import structlog

from llm.images.video_generation import (
    SUPPORTED_PROVIDERS,
    VideoPending,
    VideoResult,
    default_options,
    settle_cached_video,
)
from llm.images.video_placeholder import PendingMarker, unavailable_placeholder, valid_job_id

logger = structlog.get_logger(__name__)

# Entre dos entregas del mismo resultado.
SETTLE_POLL_S = 20.0
# Sin encontrar el aviso en ningún sitio, cuánto se sigue buscando: una
# regeneración escribe sus fases al final, minutos después del aviso.
NOT_FOUND_GRACE_S = 600.0
# Tras un reinicio el aviso ya está en la base de datos: basta un margen corto.
RESUMED_GRACE_S = 60.0
# Tope absoluto de entregas (un job puede durar hasta 1 h: `job_timeout`).
SETTLE_MAX_S = 3600.0
# Entregas seguidas sin sustituir nada (y sin nadie escribiendo) para dar por
# cerrado un aviso ya sustituido.
_QUIET_PASSES = 2
# Un trabajo más viejo que esto no se sondea: el proveedor ya no lo guardará.
RESUME_MAX_AGE_S = 24 * 3600.0
# Hilos de espera a la vez (cada uno duerme casi todo el tiempo).
_MAX_WATCHERS = 32


@dataclass(frozen=True)
class ApplyReport:
    """Resultado de una entrega: avisos sustituidos y si alguien aún escribe."""

    replaced: int
    busy: bool = False


# sumidero(job_id, started_at, fragmento_html) → ApplyReport
Sink = Callable[[str, float, str], ApplyReport]

_sink: Sink | None = None
_watching: set[str] = set()
_lock = threading.Lock()


def install_sink(sink: Sink | None) -> None:
    """Registra quién mete el resultado en la base de datos (capa de generación)."""
    global _sink
    _sink = sink


def late_deadline(started_at: float) -> float:
    """Hora (epoch) hasta la que se espera un video encargado en `started_at`."""
    from core.config import settings

    return started_at + default_options().timeout_s + max(0.0, float(settings.ova_video_late_max_s))


def watching() -> set[str]:
    """Trabajos que este proceso está esperando (para tests y diagnóstico)."""
    with _lock:
        return set(_watching)


def watch(pending: VideoPending, *, grace_s: float = NOT_FOUND_GRACE_S) -> bool:
    """Sigue esperando el video en un hilo propio. False si no se puede.

    Sin sumidero (proceso que no lo registró) o con un id raro no se puede
    sustituir nada después: quien llama pone el aviso definitivo.
    """
    if _sink is None:
        logger.warning("late video not watched: no sink installed", job_id=pending.job_id)
        return False
    if not valid_job_id(pending.job_id):
        logger.warning("late video not watched: unexpected job id")
        return False
    with _lock:
        if pending.job_id in _watching:
            return True  # la reparación del recurso reutiliza el mismo trabajo
        if len(_watching) >= _MAX_WATCHERS:
            logger.warning("late video not watched: too many", job_id=pending.job_id)
            return False
        _watching.add(pending.job_id)
    threading.Thread(
        target=_run, args=(pending, grace_s), daemon=True, name="ova-video-late"
    ).start()
    logger.info("late video watch started", job_id=pending.job_id, model=pending.model_id)
    return True


def resume(marker: PendingMarker, api_key: str | None) -> bool:
    """Reanuda la espera de un aviso que dejó un proceso anterior (arranque)."""
    pending = VideoPending(
        marker.job_id,
        marker.provider,
        marker.model_id,
        marker.started_at,
        api_key,
        fake=marker.job_id.startswith("fake-"),
    )
    return watch(pending, grace_s=RESUMED_GRACE_S)


# ── Hilo de espera ─────────────────────────────────────────────────────────────


def _sleep(seconds: float) -> None:
    time.sleep(max(0.0, seconds))


def _run(pending: VideoPending, grace_s: float) -> None:
    from llm.images.video_embed import video_figure

    try:
        result = _await_video(pending)
        settle_cached_video(pending.reuse_key, result)
        if result is not None:
            fragment = video_figure(result.data_uri, provider=result.provider, model_id=result.model_id)
        else:
            fragment = unavailable_placeholder()
        _deliver(pending, fragment, grace_s)
    except Exception:  # noqa: BLE001 — el hilo nunca muere con el aviso pendiente
        logger.exception("late video watcher crashed", job_id=pending.job_id)
        try:
            _deliver(pending, unavailable_placeholder(), grace_s)
        except Exception:  # noqa: BLE001
            logger.exception("late video fallback failed", job_id=pending.job_id)
    finally:
        with _lock:
            _watching.discard(pending.job_id)


def _await_video(pending: VideoPending) -> VideoResult | None:
    """El video del trabajo si llega antes del tope tardío; None si no."""
    from llm.images.video_openrouter import VideoGenerationError, resume_openrouter_video

    if time.time() - pending.started_at > RESUME_MAX_AGE_S:
        return None
    if pending.fake:
        return _await_fake(pending)
    if pending.provider not in SUPPORTED_PROVIDERS or not pending.api_key:
        logger.warning("late video cannot be polled", job_id=pending.job_id, provider=pending.provider)
        return None
    options = default_options()
    remaining = late_deadline(pending.started_at) - time.time()
    try:
        file = resume_openrouter_video(
            pending.job_id,
            pending.api_key,
            deadline=time.monotonic() + max(0.0, remaining),
            poll_s=options.poll_s,
            max_bytes=options.max_bytes,
            polling_url=pending.polling_url,
        )
    except VideoGenerationError as exc:
        logger.warning("late video not arrived", job_id=pending.job_id, error=str(exc)[:240])
        return None
    except Exception as exc:  # noqa: BLE001 — red, JSON: se queda el aviso definitivo
        logger.warning("late video crashed", job_id=pending.job_id, error_type=type(exc).__name__)
        return None
    logger.info(
        "late video arrived",
        job_id=pending.job_id,
        model=pending.model_id,
        size_bytes=file.size_bytes,
        cost_usd=file.cost_usd,
        waited_s=round(time.time() - pending.started_at),
    )
    return VideoResult(
        file.data_uri, pending.provider, pending.model_id, None, None, file.size_bytes, None, file.cost_usd
    )


def _await_fake(pending: VideoPending) -> VideoResult | None:
    """LLM_FAKE: el video «llega» `LLM_FAKE_VIDEO_LATE_S` después de encargarlo."""
    from llm.images.media_fake import fake_media_enabled, fake_video_data_uri, fake_video_late_s

    if not fake_media_enabled():
        return None  # un aviso simulado que sobrevivió a un cambio de modo
    arrives = pending.started_at + fake_video_late_s()
    deadline = late_deadline(pending.started_at)
    _sleep(min(arrives, deadline) - time.time())
    if arrives > deadline:
        logger.info("fake late video never arrived", job_id=pending.job_id)
        return None
    uri = fake_video_data_uri()
    logger.info("fake late video arrived", job_id=pending.job_id, model=pending.model_id)
    return VideoResult(uri, pending.provider, pending.model_id, None, None, len(uri), None, 0.0)


def _deliver(pending: VideoPending, fragment: str, grace_s: float) -> None:
    """Entrega el resultado hasta que el aviso esté sustituido en todas partes."""
    start = time.monotonic()
    seen = False
    quiet = 0
    while True:
        sink = _sink
        try:
            report = sink(pending.job_id, pending.started_at, fragment) if sink else ApplyReport(0)
        except Exception:  # noqa: BLE001 — base de datos caída un momento: se reintenta
            logger.exception("late video delivery failed; retrying", job_id=pending.job_id)
            report = ApplyReport(0, busy=True)
        if report.replaced:
            seen, quiet = True, 0
        elif report.busy:
            quiet = 0
        else:
            quiet += 1
        elapsed = time.monotonic() - start
        if seen and quiet >= _QUIET_PASSES:
            break
        if not seen and not report.busy and elapsed >= grace_s:
            # El docente quitó el aviso o regeneró el recurso: nada que sustituir.
            logger.info("late video discarded: placeholder not found", job_id=pending.job_id)
            break
        if elapsed >= SETTLE_MAX_S:
            logger.warning("late video delivery gave up", job_id=pending.job_id, seen=seen)
            break
        _sleep(SETTLE_POLL_S)
    if seen:
        logger.info("late video delivered", job_id=pending.job_id)
