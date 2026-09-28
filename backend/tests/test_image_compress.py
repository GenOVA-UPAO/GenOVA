"""Las imágenes generadas se comprimen a WebP sin romper las que no se pueden."""

import base64
import io
import os

from PIL import Image

from llm.images.image_compress import compress_data_uri


def _png(w=1400, h=1000) -> str:
    # Ruido: como una ilustración, no cabe en un PNG pequeño.
    img = Image.frombytes("RGB", (w, h), os.urandom(w * h * 3))
    out = io.BytesIO()
    img.save(out, format="PNG")
    return "data:image/png;base64," + base64.b64encode(out.getvalue()).decode()


def test_png_pasa_a_webp_mas_ligero_y_acotado():
    original = _png()
    packed = compress_data_uri(original)
    assert packed.startswith("data:image/webp;base64,")
    assert len(packed) < len(original)
    with Image.open(io.BytesIO(base64.b64decode(packed.split(",", 1)[1]))) as img:
        assert max(img.size) <= 1024


def test_svg_y_basura_pasan_sin_tocar():
    svg = "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="
    assert compress_data_uri(svg) == svg
    roto = "data:image/png;base64,no-es-una-imagen"
    assert compress_data_uri(roto) == roto
    assert compress_data_uri(None) is None
