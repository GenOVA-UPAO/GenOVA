"""Errores de frontera de la capa de aplicación de RAG.

Los lanzan los adaptadores de `infrastructure` (embedder, parsers) y los capturan
los casos de uso, que siempre degradan a "sin contexto" (el RAG es best-effort).
"""

from __future__ import annotations


class EmbedderError(RuntimeError):
    """El backend de embeddings no está disponible o falló."""


class ParserError(RuntimeError):
    """El tipo de archivo no es soportado o la extracción de texto falló."""
