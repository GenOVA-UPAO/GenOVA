"""Latido de una regeneración mientras su ejecutor trabaja.

Un hilo daemon renueva `regen_jobs.heartbeat_at` cada `RENEW_S` con su propia
conexión (nunca la sesión del hilo de la regeneración: no es thread-safe). Si el
proceso muere, el hilo muere con él y en `TTL_S` cualquier otro proceso puede
darla por interrumpida y liberar el OVA. Si al latir descubre que otro proceso
ya la dio por interrumpida (el proceso estuvo parado más de `TTL_S`), lo señala
en `lost` y deja de latir; el ejecutor ya no escribirá la versión nueva.
"""

from __future__ import annotations

import threading

import structlog

from generation.regen import regen_jobs

logger = structlog.get_logger(__name__)


class JobHeartbeat:
    def __init__(self, job_id: str, interval_s: float | None = None) -> None:
        self.job_id = job_id
        self.interval_s = regen_jobs.RENEW_S if interval_s is None else interval_s
        self.lost = threading.Event()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def __enter__(self) -> JobHeartbeat:
        self._thread = threading.Thread(
            target=self._run, daemon=True, name=f"regen-beat-{self.job_id[:8]}"
        )
        self._thread.start()
        return self

    def __exit__(self, *_exc) -> None:
        self._stop.set()

    def _run(self) -> None:
        while not self._stop.wait(self.interval_s):
            try:
                alive = regen_jobs.touch_regen(self.job_id)
            except Exception:  # noqa: BLE001 — BD caída un momento: se reintenta
                logger.exception("regen heartbeat failed", job_id=self.job_id)
                continue
            if not alive:
                if not self._stop.is_set():
                    logger.warning("regen tomada por la recuperación", job_id=self.job_id)
                    self.lost.set()
                return
