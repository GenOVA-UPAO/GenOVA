"""Política de bloqueo por intentos fallidos (state machine pura).

5 fallos consecutivos bloquean la cuenta 15 minutos; al bloquear se reinicia
el contador. Un login correcto limpia ambos. La normalización a UTC tz-aware
absorbe el ``DateTime(timezone=True)`` que SQLite devuelve naive (mismo
tratamiento que reset_router/verify_router).
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

MAX_FAILED_ATTEMPTS = 5
LOCK_DURATION = timedelta(minutes=15)


def as_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)


def is_locked(locked_until: datetime | None, now: datetime) -> bool:
    return locked_until is not None and as_utc(locked_until) > now


def minutes_remaining(locked_until: datetime, now: datetime) -> int:
    """Minutos que faltan para el desbloqueo (mínimo 1, como hoy)."""
    remaining = int((as_utc(locked_until) - now).total_seconds() // 60)
    return max(1, remaining)


def next_failure_state(attempts: int, now: datetime) -> tuple[int, datetime | None]:
    """Estado (contador, locked_until) tras registrar un fallo más.

    Al alcanzar el umbral: contador a 0 y bloqueo de 15 min.
    """
    attempts += 1
    if attempts >= MAX_FAILED_ATTEMPTS:
        return 0, now + LOCK_DURATION
    return attempts, None
