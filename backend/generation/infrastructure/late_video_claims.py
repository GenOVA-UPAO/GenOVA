"""Reclamo exclusivo (entre procesos) de la espera de un video tardío.

La web (main.py) y el worker (worker.py) reanudan al arrancar los avisos de video
pendientes; si arrancan a la vez, o si uno arranca mientras el otro ya espera
ese video en caliente, los dos sondeaban y descargaban el mismo trabajo (no se
paga dos veces, pero se duplica sondeo, descarga y entrega). Ahora, antes de
lanzar el hilo, el proceso reclama el trabajo en `late_video_claims`
(migración 042): una fila por `job_id` con dueño y caducidad.

- El dueño renueva la caducidad cada `RENEW_S` mientras su hilo vive (un único
  hilo de latido por proceso). Si el proceso muere, deja de renovarla y en
  `TTL_S` el trabajo queda libre para otro proceso.
- Al terminar, la fila no se borra: queda `done` durante `DONE_HOLD_S`, para que
  un proceso que acaba de leer el aviso (antes de que se sustituyera) no vuelva a
  descargar un video ya entregado.
- Sin advisory locks de sesión: el pooler de Supabase es por transacción y un
  lock de sesión no sobrevive a eso. Cada operación es una transacción corta.
"""

from __future__ import annotations

import os
import socket
import threading
import time
import uuid

import structlog
from sqlalchemy import text

logger = structlog.get_logger(__name__)

TTL_S = 120
RENEW_S = 30.0
DONE_HOLD_S = 300


def _engine():
    from core.database import engine

    return engine


class LateVideoClaims:
    def __init__(self) -> None:
        # Único por proceso (y por arranque): el pid puede repetirse tras reiniciar.
        self.owner = f"{socket.gethostname()}:{os.getpid()}:{uuid.uuid4().hex[:8]}"
        self._held: set[str] = set()
        self._lock = threading.Lock()
        self._beat: threading.Thread | None = None

    def acquire(self, job_id: str) -> bool:
        """True si este proceso queda como dueño (libre, caducado o ya suyo)."""
        with _engine().begin() as conn:
            got = conn.execute(
                text(
                    "INSERT INTO late_video_claims (job_id, owner, expires_at)"
                    " VALUES (:j, :o, now() + make_interval(secs => :ttl))"
                    " ON CONFLICT (job_id) DO UPDATE SET owner = EXCLUDED.owner,"
                    " claimed_at = now(), expires_at = EXCLUDED.expires_at, done = false"
                    " WHERE late_video_claims.expires_at <= now()"
                    " OR late_video_claims.owner = EXCLUDED.owner"
                    " RETURNING owner"
                ),
                {"j": job_id, "o": self.owner, "ttl": TTL_S},
            ).first()
        if got is None:
            return False
        with self._lock:
            self._held.add(job_id)
            if self._beat is None:
                self._beat = threading.Thread(
                    target=self._heartbeat, daemon=True, name="ova-video-late-claims"
                )
                self._beat.start()
        return True

    def release(self, job_id: str) -> None:
        with self._lock:
            self._held.discard(job_id)
        with _engine().begin() as conn:
            conn.execute(
                text(
                    "UPDATE late_video_claims SET done = true,"
                    " expires_at = now() + make_interval(secs => :hold)"
                    " WHERE job_id = :j AND owner = :o"
                ),
                {"j": job_id, "o": self.owner, "hold": DONE_HOLD_S},
            )

    def held_elsewhere(self, job_ids: list[str]) -> dict[str, float]:
        """Trabajos que otro proceso tiene reclamados → segundos hasta que caduquen."""
        if not job_ids:
            return {}
        with _engine().connect() as conn:
            rows = conn.execute(
                text(
                    "SELECT job_id, EXTRACT(EPOCH FROM expires_at - now())"
                    " FROM late_video_claims WHERE job_id = ANY(:ids)"
                    " AND owner <> :o AND expires_at > now()"
                ),
                {"ids": list(job_ids), "o": self.owner},
            ).all()
        return {job: float(left) for job, left in rows}

    def purge(self) -> None:
        """Las filas caducadas no bloquean nada; se borran para no acumularlas."""
        with _engine().begin() as conn:
            conn.execute(text("DELETE FROM late_video_claims WHERE expires_at < now()"))

    def _heartbeat(self) -> None:
        while True:
            time.sleep(RENEW_S)
            with self._lock:
                held = sorted(self._held)
                if not held:
                    self._beat = None
                    return
            try:
                with _engine().begin() as conn:
                    kept = set(
                        conn.execute(
                            text(
                                "UPDATE late_video_claims"
                                " SET expires_at = now() + make_interval(secs => :ttl)"
                                " WHERE owner = :o AND job_id = ANY(:ids) AND NOT done"
                                " RETURNING job_id"
                            ),
                            {"ttl": TTL_S, "o": self.owner, "ids": held},
                        ).scalars()
                    )
            except Exception:  # noqa: BLE001 — BD caída un momento: se reintenta
                logger.exception("late video claim heartbeat failed")
                continue
            lost = set(held) - kept
            if lost:
                # El proceso estuvo parado más de TTL_S y otro tomó el trabajo: se
                # sigue (a lo sumo se duplica la descarga; no se paga dos veces).
                logger.warning("late video claims lost", job_ids=sorted(lost))


def make_claims() -> LateVideoClaims | None:
    """Solo con Postgres (la tabla es de la migración 042). Con SQLite hay un
    único proceso: no hace falta reclamar nada."""
    return LateVideoClaims() if _engine().dialect.name == "postgresql" else None
