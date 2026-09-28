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

# El modelo no siempre respeta el token __IMG_N__ del catálogo: inventa
# "image_placeholder", "IMAGE-PLACEHOLDER", "placeholder.png"… Si eso llega al
# HTML el navegador pinta una imagen rota, así que se neutraliza aquí.
_INVENTED_IMG_NAME = r"(?:[\w./-]*(?:image[_-]?placeholder|placeholder[_-]?image)[\w./-]*)"
_INVENTED_IMG_SRC_RE = re.compile(
    rf"""(?P<attr>\bimg-src\s*=\s*)(?P<q>["'])\s*{_INVENTED_IMG_NAME}\s*(?P=q)""",
    re.IGNORECASE,
)
_INVENTED_SRC_RE = re.compile(
    rf"""(?P<attr>\bsrc\s*=\s*)(?P<q>["'])\s*{_INVENTED_IMG_NAME}\s*(?P=q)""",
    re.IGNORECASE,
)


def _neutralize_invented_tokens(html: str) -> str:
    """Un `img-src` inventado se vacía (el componente ya dibuja su propio hueco);
    un `src` suelto de `<img>` cae al SVG "Imagen no disponible"."""
    html = _INVENTED_IMG_SRC_RE.sub(
        lambda m: f'{m.group("attr")}{m.group("q")}{m.group("q")}', html
    )
    return _INVENTED_SRC_RE.sub(
        lambda m: f'{m.group("attr")}{m.group("q")}{IMG_PLACEHOLDER}{m.group("q")}', html
    )


def resolve_image_placeholders(
    html: str, replacements: dict[str, str] | None = None
) -> str:
    """Embed generated images and never expose an unresolved ``__IMG_N__`` token.

    The final sweep is deliberately unconditional: an LLM refinement can return
    new HTML after image enrichment, and generation may be disabled altogether.
    """
    for placeholder, uri in (replacements or {}).items():
        html = html.replace(placeholder, uri)
    html = _IMAGE_PLACEHOLDER_RE.sub(IMG_PLACEHOLDER, html)
    return _neutralize_invented_tokens(html)
