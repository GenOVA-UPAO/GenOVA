"""Meter el video generado en el HTML de un recurso de video 5E.

El video entra DESPUÉS del refinado: el LLM nunca ve el base64 (serían
millones de tokens) y el guion que ya generó el recurso se conserva debajo como
apoyo (narración, marcas de tiempo, pausas activas). La inserción es
determinista: tras la cabecera del recurso (`</upao-header>`), o al principio
del `<body>`.
"""

from __future__ import annotations

import html as html_lib
import re

_HEADER_END = re.compile(r"</upao-header\s*>", re.IGNORECASE)
_BODY_OPEN = re.compile(r"<body\b[^>]*>", re.IGNORECASE)
_PROMPT_KEYS = ("prompt_video", "prompt", "guion_visual", "guion")


def video_prompt(json_data, concept: str) -> str:
    """Prompt para el generador: `prompt_video` del guion, o uno derivado de él."""
    data = json_data if isinstance(json_data, dict) else {}
    for key in _PROMPT_KEYS:
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            text = " ".join(value.split())
            if key == "prompt_video":
                return text
            return (
                f"Short educational video that visually explains {concept}, "
                f"clean cinematic style, no on-screen text. Script: {text[:600]}"
            )
    return f"Short educational video that visually explains {concept}, clean cinematic style."


def video_figure(data_uri: str, *, provider: str, model_id: str) -> str:
    model = html_lib.escape(f"{provider}/{model_id}", quote=True)
    return (
        f'<figure class="genova-video" data-genova-video-model="{model}" '
        'style="margin:1.5rem auto;max-width:960px">'
        f'<video controls playsinline preload="metadata" src="{data_uri}" '
        'style="display:block;width:100%;border-radius:12px;background:#000">'
        "Tu navegador no puede reproducir este video.</video>"
        '<figcaption style="margin-top:.5rem;font-size:.875rem;opacity:.75">'
        "Video generado con IA a partir del guion de este recurso.</figcaption>"
        "</figure>"
    )


def inject_video(html: str, data_uri: str, *, provider: str, model_id: str) -> str:
    """HTML con el video insertado tras la cabecera (o al abrir el body)."""
    figure = video_figure(data_uri, provider=provider, model_id=model_id)
    for pattern in (_HEADER_END, _BODY_OPEN):
        match = pattern.search(html or "")
        if match:
            return html[: match.end()] + figure + html[match.end() :]
    return figure + (html or "")
