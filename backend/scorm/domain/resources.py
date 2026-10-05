"""Preparación de los recursos (una página HTML por fase) común a todos los formatos.

Cada formato de exportación coloca los recursos en rutas distintas (`resources/`,
`EPUB/`, `content/resources/genova/`…), pero el contenido es el mismo: el documento
HTML de la fase (envuelto si era texto plano) con los videos `data:` sacados a
archivos aparte. Los nombres de los videos son relativos al HTML del recurso
(`media/recurso_N_video_K.mp4`), así que cada formato sólo antepone su carpeta.
"""

from __future__ import annotations

import base64
import binascii
import re
from dataclasses import dataclass

from scorm.domain.templates.html import phase_label, wrap_resource_html

DEFAULT_PHASES = [
    {"type": "engage", "order": 1, "content": "Recurso de la fase ENGAGE no disponible."},
    {"type": "explore", "order": 2, "content": "Recurso de la fase EXPLORE no disponible."},
]

VIDEO_MEDIA_TYPES = {"mp4": "video/mp4", "webm": "video/webm"}

# Video generado incrustado como data URI en el HTML de un recurso. En el paquete
# va como archivo aparte: el base64 pesa un 33 % más y obliga al lector a cargar el
# video entero para pintar la página.
_VIDEO_DATA_URI = re.compile(
    r"""(?P<attr>\bsrc\s*=\s*)(?P<q>["'])data:video/(?P<ext>mp4|webm);base64,(?P<b64>[A-Za-z0-9+/=]+)(?P=q)"""
)


@dataclass(frozen=True, slots=True)
class MediaFile:
    """Archivo binario de un recurso. `name` es relativo al HTML del recurso."""

    name: str
    data: bytes

    @property
    def media_type(self) -> str:
        return VIDEO_MEDIA_TYPES.get(self.name.rsplit(".", 1)[-1], "application/octet-stream")


@dataclass(frozen=True, slots=True)
class PhaseResource:
    """Una fase lista para empaquetar: su HTML autónomo y sus videos."""

    order: int  # 1-based, posición tras ordenar
    label: str
    html: str
    media: tuple[MediaFile, ...]

    @property
    def basename(self) -> str:
        return f"recurso_{self.order}"


def extract_videos(html: str, idx: int) -> tuple[str, tuple[MediaFile, ...]]:
    """Saca cada video `data:` del HTML a un archivo `media/recurso_{idx}_video_{n}.{ext}`
    y deja en el HTML la ruta relativa. Un base64 corrupto se deja tal cual."""
    media: list[MediaFile] = []

    def replace(match: re.Match) -> str:
        try:
            data = base64.b64decode(match.group("b64"), validate=True)
        except (binascii.Error, ValueError):
            return match.group(0)
        name = f"media/recurso_{idx}_video_{len(media) + 1}.{match.group('ext')}"
        media.append(MediaFile(name=name, data=data))
        q = match.group("q")
        return f"{match.group('attr')}{q}{name}{q}"

    return _VIDEO_DATA_URI.sub(replace, html), tuple(media)


def prepare_phase_resources(phases: list[dict] | None) -> list[PhaseResource]:
    """Ordena las fases y devuelve un recurso por fase (sin fases → DEFAULT_PHASES)."""
    ordered = sorted(phases if phases else DEFAULT_PHASES, key=lambda p: p.get("order", 0))
    resources: list[PhaseResource] = []
    for idx, phase in enumerate(ordered, start=1):
        custom_title = (phase.get("title") or "").strip()
        label = custom_title or phase_label(phase.get("type", ""), idx)
        page = wrap_resource_html(phase.get("content", ""), label)
        html, media = extract_videos(page, idx)
        resources.append(PhaseResource(order=idx, label=label, html=html, media=media))
    return resources
