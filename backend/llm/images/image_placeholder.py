"""Fallback and final cleanup for image placeholders in generated HTML."""

import re

IMG_PLACEHOLDER = (
    "data:image/svg+xml;base64,"
    "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdo"
    "dD0iNTEyIj48cmVjdCBmaWxsPSIjZTJlOGYwIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIvPjx0"
    "ZXh0IHg9IjI1NiIgeT0iMjY2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIy"
    "MiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzQ3NTU2OSI+SW1hZ2VuIG5vIGRpc3Bvbmli"
    "bGU8L3RleHQ+PC9zdmc+"
)

_IMAGE_PLACEHOLDER_RE = re.compile(r"__IMG_\d+__")


def resolve_image_placeholders(
    html: str, replacements: dict[str, str] | None = None
) -> str:
    """Embed generated images and never expose an unresolved ``__IMG_N__`` token.

    The final sweep is deliberately unconditional: an LLM refinement can return
    new HTML after image enrichment, and generation may be disabled altogether.
    """
    for placeholder, uri in (replacements or {}).items():
        html = html.replace(placeholder, uri)
    return _IMAGE_PLACEHOLDER_RE.sub(IMG_PLACEHOLDER, html)
