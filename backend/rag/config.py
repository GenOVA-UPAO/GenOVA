"""Configuración simple del subsistema RAG."""

from __future__ import annotations

import os


def is_enabled() -> bool:
    """Chequeo rápido para decidir si intentar la ingesta."""
    return os.getenv("RAG_DISABLED", "").lower() not in ("1", "true", "yes")
