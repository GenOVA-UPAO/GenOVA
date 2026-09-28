"""Límite de intentos de login por email — complementa al limitador por IP (SlowAPI).

Frena a un atacante que rota IPs contra una sola cuenta: como mucho
``EMAIL_LOGIN_MAX`` intentos por email en ``EMAIL_LOGIN_WINDOW_S`` segundos; el
siguiente recibe 429 «Demasiados intentos para esta cuenta».

La cuenta vive en el almacén compartido (`core.shared_throttle`: Redis si hay
``REDIS_URL``, si no la tabla ``throttle_hits`` de Postgres, migración 042).
Antes era un dict en la memoria de cada proceso y con N workers de uvicorn el
límite real era N veces mayor. Con SQLite o si el almacén falla, cuenta en
memoria del proceso (mejor un límite por proceso que ninguno o un login caído).

Esto no es el bloqueo de la cuenta: ese (5 fallos → 15 min) vive en la BD
(``users.failed_login_attempts`` / ``locked_until``), ya es compartido, y lo
limpian un login correcto y el «Desbloquear cuenta» del admin. Esta ventana
cuenta todos los intentos, aciertos incluidos, y se vacía sola al pasar el
minuto, así que no necesita desbloqueo propio.
"""

from __future__ import annotations

import hashlib

from core.shared_throttle import MemoryWindow, SharedWindow, SlidingWindow

EMAIL_LOGIN_WINDOW_S = 60.0
EMAIL_LOGIN_MAX = 5


def _subject(normalized_email: str) -> str:
    # El almacén guarda un resumen, no el correo: ni la tabla ni las claves de
    # Redis acumulan direcciones en claro, y la longitud queda fija.
    return hashlib.sha256(normalized_email.encode("utf-8")).hexdigest()


class EmailLoginWindow:
    """Ventana deslizante por email sobre un almacén (compartido o en memoria)."""

    BUCKET = "login_email"

    def __init__(
        self,
        limit: int = EMAIL_LOGIN_MAX,
        window_s: float = EMAIL_LOGIN_WINDOW_S,
        store: SlidingWindow | None = None,
    ) -> None:
        self.limit = limit
        self.window_s = window_s
        # Sin `store` (tests) cuenta en memoria del proceso.
        self.store: SlidingWindow = store if store is not None else MemoryWindow()

    def throttled(self, normalized_email: str) -> bool:
        """True si el email agotó sus intentos; si no, apunta este y da False."""
        wait = self.store.hit(self.BUCKET, _subject(normalized_email), self.limit, self.window_s)
        return wait > 0

    def reset(self) -> None:
        self.store.reset(self.BUCKET)


# La instancia del proceso: el almacén se elige al primer login (no al importar).
email_login_window = EmailLoginWindow(store=SharedWindow())


def email_throttled(email: str) -> bool:
    """True si *email* superó los intentos de login dentro de la ventana."""
    return email_login_window.throttled(email)
