"""Anclaje de tema: lock en el prompt y detección barata de deriva."""

from prometheus.engine.topic import topic_drift_defect
from prometheus.engine.validate import resource_defects
from prometheus.prompts._loader import render_texto


def test_churnfast_desvia_de_revolucion_industrial():
    html = "<html><body><h1>Machine Learning en la retención de clientes</h1></body></html>"
    defect = topic_drift_defect(html, "Revolución Industrial")
    assert defect is not None
    assert "tema desviado" in defect
    assert "Machine Learning" in defect


def test_pitagoras_con_escaleras_no_desvia():
    html = "<html><body><h1>Escaleras y el Teorema de Pitágoras</h1></body></html>"
    prompt = "El teorema de Pitágoras aplicado a escaleras en 3o de secundaria"
    assert topic_drift_defect(html, prompt) is None


def test_tema_de_una_palabra_no_marca_deriva():
    html = "<html><body><h1>La planta verde y la luz solar</h1></body></html>"
    assert topic_drift_defect(html, "Fotosíntesis") is None


def test_sin_h1_no_marca_deriva():
    assert topic_drift_defect("<html><p>sin titulo</p></html>", "Revolución Industrial") is None


def test_resource_defects_incluye_deriva():
    html = (
        "<!DOCTYPE html><html><body><h1>ChurnFast y el machine learning</h1>"
        + "<p>contenido pedagógico desarrollado. </p>" * 60
        + "<button>ok</button><script>_scormComplete()</script></body></html>"
    )
    joined = " ".join(resource_defects(html, "Revolución Industrial"))
    assert "tema desviado" in joined


def test_prompt_lleva_anclaje_de_tema():
    body = render_texto("engage", 3, "Revolución Industrial")
    assert "ANCLAJE DE TEMA" in body
    assert "Revolución Industrial" in body
    assert "PROHIBIDO cambiar de dominio" in body


def test_strip_hidden_blocks_igual_al_regex_original_con_unicode():
    """`html.lower()` alarga «İ» (U+0130) y desplazaba los índices del recorte."""
    import re

    from prometheus.engine.topic import _strip_hidden_blocks

    def original(html: str) -> str:
        return re.sub(r"<(script|style|head)[\s\S]*?</\1>", " ", html, flags=re.I)

    casos = [
        "İİİ<script>var x=1;</script><h1>Índices</h1>",
        "<HEAD><title>t</title></HEAD><p>İstanbul</p><STYLE>p{}</style>fin",
        "<script>sin cierre <style>a</style> resto",
        "<header>cabecera</header><head>x</head>",
    ]
    for html in casos:
        assert _strip_hidden_blocks(html) == original(html), html
