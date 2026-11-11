"""Con «IA elige» (color «free») el recurso de plantilla también lleva la hoja base."""

import pytest

from ova_engine.pipeline import generate_with_template
from ova_engine.registry import get_spec


@pytest.mark.parametrize("theme", [{"color": "upao"}, {"color": "free"}, {"color": "custom"}, {}])
def test_plantilla_siempre_inyecta_hoja_base(theme):
    html, _ = generate_with_template(get_spec("elaborate", 3), "fotosíntesis", theme=theme, fake=True)
    assert 'id="ova-base"' in html
    assert "--action:" in html
