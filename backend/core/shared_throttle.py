"""Ventana deslizante compartida entre procesos (límites de gasto por persona).

Un contador en la memoria de cada proceso no limita nada con varios procesos:
con N workers de uvicorn cada uno lleva su cuenta y el límite real es N veces
mayor. Aquí la cuenta vive en un almacén compartido:

- con ``REDIS_URL``: un sorted set por persona, actualizado con un script Lua
  (atómico en Redis);
- si no, con Postgres: tabla ``throttle_hits`` (migración 042), una fila por
  intento; la comprobación y el apunte van en una transacción corta serializada
  por un advisory lock *de transacción* (seguro con el pooler por transacción,
  a diferencia de uno de sesión);
- con SQLite (desarrollo de un proceso, tests) o si el almacén falla: en memoria
  del proceso. Mejor un límite por proceso que dejar la herramienta sin límite o
  caída por un fallo del almacén.

`hit()` devuelve 0 si el intento cabe (y lo apunta) o los segundos hasta poder.
"""

from __future__ import annotations

import random
import threading
import time
import uuid
from collections import deque
from typing import Protocol

import structlog

logger = structlog.get_logger(__name__)

# Uno de cada N intentos purga las filas caducadas de todas las personas (las de
# la persona que prueba se purgan siempre).
_GLOBAL_PURGE_EVERY = 50


class SlidingWindow(Protocol):
    def hit(self, bucket: str, subject: str, limit: int, window_s: float) -> int: ...
    def reset(self, bucket: str) -> None: ...


def _wait(remaining_s: float) -> int:
    return max(1, int(remaining_s) + 1)


class MemoryWindow:
    """Por proceso: SQLite, tests y reserva si el almacén compartido falla."""

    def __init__(self) -> None:
        self._hits: dict[tuple[str, str], deque[float]] = {}
        self._lock = threading.Lock()

    def hit(self, bucket: str, subject: str, limit: int, window_s: float) -> int:
        now = time.monotonic()
        with self._lock:
            hits = self._hits.setdefault((bucket, subject), deque())
            while hits and now - hits[0] >= window_s:
                hits.popleft()
            if len(hits) >= limit:
                return _wait(window_s - (now - hits[0]))
            hits.append(now)
            return 0

    def reset(self, bucket: str) -> None:
        with self._lock:
            for key in [k for k in self._hits if k[0] == bucket]:
                del self._hits[key]


class PostgresWindow:
    def hit(self, bucket: str, subject: str, limit: int, window_s: float) -> int:
        from sqlalchemy import text

        from core.database import engine

        key = {"b": bucket, "s": subject}
        with engine.begin() as conn:
            # Dos procesos que prueban a la vez no pueden contar los dos «9 de 10».
            conn.execute(
                text("SELECT pg_advisory_xact_lock(hashtextextended(:b || ':' || :s, 0))"), key
            )
            if random.randrange(_GLOBAL_PURGE_EVERY) == 0:  # noqa: S311 — no es criptográfico
                conn.execute(
                    text("DELETE FROM throttle_hits WHERE expires_at <= clock_timestamp()")
                )
            else:
                conn.execute(
                    text(
                        "DELETE FROM throttle_hits WHERE bucket = :b AND subject = :s"
                        " AND expires_at <= clock_timestamp()"
                    ),
                    key,
                )
            count, remaining = conn.execute(
                text(
                    "SELECT count(*), EXTRACT(EPOCH FROM min(expires_at) - clock_timestamp())"
                    " FROM throttle_hits WHERE bucket = :b AND subject = :s"
                ),
                key,
            ).one()
            if count >= limit:
                return _wait(float(remaining or 0.0))
            conn.execute(
                text(
                    "INSERT INTO throttle_hits (bucket, subject, expires_at)"
                    " VALUES (:b, :s, clock_timestamp() + make_interval(secs => :w))"
                ),
                {**key, "w": float(window_s)},
            )
        return 0

    def reset(self, bucket: str) -> None:
        from sqlalchemy import text

        from core.database import engine

        with engine.begin() as conn:
            conn.execute(text("DELETE FROM throttle_hits WHERE bucket = :b"), {"b": bucket})


# Atómico en Redis: purga lo caducado, cuenta y, si cabe, apunta el intento.
_LUA_HIT = """
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - window)
if redis.call('ZCARD', KEYS[1]) >= limit then
  local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
  return tostring(window - (now - tonumber(oldest[2])))
end
redis.call('ZADD', KEYS[1], now, ARGV[4])
redis.call('PEXPIRE', KEYS[1], math.ceil(window * 1000))
return '0'
"""


class RedisWindow:
    def __init__(self, url: str) -> None:
        import redis

        self._client = redis.Redis.from_url(url, socket_timeout=2.0, socket_connect_timeout=2.0)
        self._script = self._client.register_script(_LUA_HIT)

    def hit(self, bucket: str, subject: str, limit: int, window_s: float) -> int:
        remaining = float(
            self._script(
                keys=[f"throttle:{bucket}:{subject}"],
                args=[time.time(), float(window_s), int(limit), uuid.uuid4().hex],
            )
        )
        return _wait(remaining) if remaining > 0 else 0

    def reset(self, bucket: str) -> None:
        for key in self._client.scan_iter(match=f"throttle:{bucket}:*"):
            self._client.delete(key)


class SharedWindow:
    """Elige el almacén al primer uso (Redis > Postgres > memoria) y cae a
    memoria del proceso si el almacén falla en un intento concreto."""

    def __init__(self) -> None:
        self._backend: SlidingWindow | None = None
        self._fallback = MemoryWindow()
        self._lock = threading.Lock()

    def _resolve(self) -> SlidingWindow:
        with self._lock:
            if self._backend is None:
                self._backend = _pick_backend()
            return self._backend

    def hit(self, bucket: str, subject: str, limit: int, window_s: float) -> int:
        backend = self._resolve()
        try:
            return backend.hit(bucket, subject, limit, window_s)
        except Exception as exc:  # noqa: BLE001 — almacén caído: límite por proceso
            logger.warning(
                "shared throttle unavailable; per-process fallback",
                bucket=bucket,
                error_type=type(exc).__name__,
            )
            return self._fallback.hit(bucket, subject, limit, window_s)

    def reset(self, bucket: str) -> None:
        self._fallback.reset(bucket)
        try:
            self._resolve().reset(bucket)
        except Exception:  # noqa: BLE001
            logger.warning("shared throttle reset failed", bucket=bucket)


def _pick_backend() -> SlidingWindow:
    from core.config import settings

    if settings.redis_url:
        try:
            return RedisWindow(settings.redis_url)
        except Exception:  # noqa: BLE001 — sin cliente Redis: Postgres
            logger.warning("shared throttle: redis client unavailable, using Postgres")
    from core.database import engine

    if engine.dialect.name == "postgresql":
        return PostgresWindow()
    return MemoryWindow()
