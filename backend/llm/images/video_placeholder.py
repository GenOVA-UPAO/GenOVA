"""Avisos en el lugar del video de un recurso: «en preparación» y «no disponible».

Un video que no terminó dentro del tope de la generación ya está pagado: se
sigue esperando en segundo plano (`video_late`) y, mientras, el recurso lleva un
aviso con un marcador (`data-ova-video-pending="<id del trabajo>"`, la hora de
inicio y el modelo) para encontrarlo y sustituirlo cuando llegue el video, o por
el aviso definitivo si no llega. El marcador nunca lleva la clave API: tras un
reinicio la clave se vuelve a resolver por el dueño del OVA.

Los avisos usan las variables CSS del runtime del OVA (con valores de respaldo:
el SCORM y la preview no siempre las definen) y son <figure> con <figcaption>,
que un lector de pantalla anuncia como figura con su texto. El guion del
recurso sigue debajo, como sin video.
"""

from __future__ import annotations

import html as html_lib
import re
from dataclasses import dataclass

MARK_ATTR = "data-ova-video-pending"
# Ids de trabajo que se aceptan en el marcador (los de OpenRouter son de este
# tipo). Con otro formato no se pone marcador: no se podría buscar con LIKE.
_JOB_ID = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")
_ANY_PENDING = re.compile(
    rf"""<figure\b(?=[^>]*\b{MARK_ATTR}\s*=\s*["'](?P<id>[^"']+)["'])(?P<attrs>[^>]*)>.*?</figure\s*>""",
    re.IGNORECASE | re.DOTALL,
)
_ATTR = re.compile(r"""\b(data-ova-video-[a-z]+)\s*=\s*["']([^"']*)["']""", re.IGNORECASE)

_BOX = (
    "margin:1.5rem auto;max-width:960px;aspect-ratio:16/9;display:flex;flex-direction:column;"
    "align-items:center;justify-content:center;gap:.75rem;padding:1.5rem;text-align:center;"
    "border-radius:var(--radius,12px);background:var(--surface-tint,#eef2fb);"
    "color:var(--text,#1f2937)"
)
_ICON = (
    '<svg aria-hidden="true" focusable="false" width="48" height="48" viewBox="0 0 24 24" '
    'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
    'stroke-linejoin="round" style="color:var(--primary,#1746c0)">'
    '<rect x="2" y="5" width="14" height="14" rx="2"/><path d="m16 10 6-3v10l-6-3z"/></svg>'
)
_TITLE_STYLE = "display:block;font-weight:700;font-size:1.05rem;color:var(--primary,#1746c0)"
_TEXT_STYLE = "display:block;margin-top:.35rem;font-size:.95rem;color:var(--text-muted,#475569)"


@dataclass(frozen=True)
class PendingMarker:
    """Lo que dice un aviso pendiente: qué trabajo, desde cuándo y con qué modelo."""

    job_id: str
    started_at: float
    provider: str
    model_id: str


def valid_job_id(job_id: str | None) -> bool:
    return bool(job_id) and bool(_JOB_ID.match(str(job_id)))


def pending_placeholder(job_id: str, started_at: float, provider: str, model_id: str) -> str:
    """Aviso «video en preparación» con el marcador para sustituirlo después."""
    model = html_lib.escape(f"{provider}/{model_id}", quote=True)
    return (
        f'<figure class="genova-video-pending" {MARK_ATTR}="{html_lib.escape(job_id, quote=True)}" '
        f'data-ova-video-started="{int(started_at)}" data-ova-video-model="{model}" '
        f'style="{_BOX};border:2px dashed var(--primary,#1746c0)">'
        f"{_ICON}"
        '<figcaption aria-live="polite">'
        f'<strong style="{_TITLE_STYLE}">Video en preparación</strong>'
        f'<span style="{_TEXT_STYLE}">El video de este recurso se está generando y aparecerá '
        "aquí en unos minutos. Mientras tanto, puedes seguir el guion de abajo.</span>"
        "</figcaption></figure>"
    )


def unavailable_placeholder() -> str:
    """Aviso definitivo, sin marcador: el video no llegó y ya no se espera."""
    return (
        f'<figure class="genova-video-unavailable" '
        f'style="{_BOX};border:1px solid var(--border,#cbd5e1)">'
        f"{_ICON}"
        "<figcaption>"
        f'<strong style="{_TITLE_STYLE}">Video no disponible</strong>'
        f'<span style="{_TEXT_STYLE}">El video de este recurso no está disponible. '
        "Usa el guion de abajo.</span>"
        "</figcaption></figure>"
    )


def pending_markers(html: str | None) -> list[PendingMarker]:
    """Avisos pendientes que hay en un HTML (para reanudarlos tras un reinicio)."""
    found: list[PendingMarker] = []
    for match in _ANY_PENDING.finditer(html or ""):
        attrs = {k.lower(): html_lib.unescape(v) for k, v in _ATTR.findall(match.group("attrs"))}
        job_id = html_lib.unescape(match.group("id"))
        provider, _, model = attrs.get("data-ova-video-model", "").partition("/")
        try:
            started = float(attrs.get("data-ova-video-started") or 0)
        except ValueError:
            started = 0.0
        found.append(PendingMarker(job_id, started, provider, model))
    return found


def replace_pending(html: str | None, job_id: str, fragment: str) -> tuple[str, int]:
    """Sustituye el aviso pendiente de `job_id` por `fragment`. Devuelve (html, cuántos).

    Solo toca los avisos de ese trabajo: si el docente lo quitó o regeneró el
    recurso, no hay nada que sustituir y el HTML sale igual.
    """
    text = html or ""
    count = 0

    def swap(match: re.Match) -> str:
        nonlocal count
        if html_lib.unescape(match.group("id")) != job_id:
            return match.group(0)
        count += 1
        return fragment

    # Función de reemplazo (no cadena): el base64 del video no se interpreta.
    out = _ANY_PENDING.sub(swap, text)
    return out, count
