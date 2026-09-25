"""Imágenes y videos simulados para LLM_FAKE=1 (local, CI, e2e).

Con LLM_FAKE nunca sale una petición de generación de medios a la red: se
devuelve un resultado determinista y gratuito que dice qué proveedor y qué
modelo lo habría generado, para comprobar de punta a punta que la cadena
configurada en /models (principal + respaldos) es la que se usa.

Para ensayar los respaldos sin clave real:
- sin clave (ninguna resuelta para el proveedor) falla, como en real;
- una clave que empieza por «fake-down» simula un proveedor caído;
- `LLM_FAKE_MEDIA_FAIL_MODELS` (ids separados por comas) hace fallar esos
  modelos concretos.

Para ensayar el video tardío: `LLM_FAKE_VIDEO_LATE_S=N` hace que el video no
termine dentro del tope (el recurso sale con el aviso «en preparación») y
«llegue» N segundos después de encargarlo. Si N pasa del tope tardío
(`OVA_VIDEO_LATE_MAX_S`) no llega nunca y queda el aviso definitivo.
Nunca activar en producción.
"""

from __future__ import annotations

import base64
import html
import os
from functools import cache
from pathlib import Path

_FIXTURE = Path(__file__).parent / "data" / "fake_video.webm"


def fake_media_enabled() -> bool:
    from core.config import settings

    return bool(settings.llm_fake)


def fake_failure(api_key: str | None, model: str | None) -> bool:
    """True si la llamada simulada debe fallar (para probar los respaldos)."""
    if not api_key or api_key.startswith("fake-down"):
        return True
    failing = {m.strip() for m in os.getenv("LLM_FAKE_MEDIA_FAIL_MODELS", "").split(",") if m.strip()}
    return bool(model and model in failing)


def fake_image_data_uri(provider: str, model: str | None, width: int = 512, height: int = 512) -> str:
    """SVG determinista que nombra el modelo que la habría generado."""
    label = html.escape(f"{provider}/{model}" if model else provider)
    w, h = max(64, int(width)), max(64, int(height))
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="0 0 {w} {h}" data-llm-fake-media="image">'
        f'<rect width="{w}" height="{h}" fill="#e8eef7"/>'
        f'<text x="50%" y="46%" text-anchor="middle" font-family="sans-serif" '
        f'font-size="20" fill="#1f3a68">Imagen simulada</text>'
        f'<text x="50%" y="58%" text-anchor="middle" font-family="sans-serif" '
        f'font-size="13" fill="#475569">{label}</text></svg>'
    )
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode("ascii")


def fake_video_late_s() -> float:
    """Segundos hasta que «llega» un video simulado tardío (0 = llega a tiempo)."""
    try:
        return max(0.0, float(os.getenv("LLM_FAKE_VIDEO_LATE_S", "0") or 0))
    except ValueError:
        return 0.0


@cache
def _fixture_b64() -> str:
    return base64.b64encode(_FIXTURE.read_bytes()).decode("ascii")


def fake_video_data_uri() -> str:
    """Video WebM diminuto (1 s, 160×90) incluido en el repo: siempre el mismo."""
    return "data:video/webm;base64," + _fixture_b64()
