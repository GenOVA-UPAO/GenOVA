"""Contrato de core.text.smart_truncate (títulos de OVA desde el prompt)."""

from core.text import smart_truncate


def test_texto_corto_queda_igual():
    assert smart_truncate("Redes de computadoras") == "Redes de computadoras"


def test_limite_exacto_no_trunca():
    text = "a" * 80
    assert smart_truncate(text) == text


def test_corta_en_limite_de_palabra_con_elipsis():
    text = (
        "OVA sobre fundamentos de redes de computadoras para estudiantes "
        "universitarios de primer ciclo"
    )
    result = smart_truncate(text)
    assert (
        result == "OVA sobre fundamentos de redes de computadoras para estudiantes universitarios…"
    )
    assert len(result) <= 80


def test_sin_espacios_corta_duro():
    assert smart_truncate("a" * 100) == "a" * 79 + "…"


def test_quita_puntuacion_colgante():
    text = "Tema uno, dos, " + "x" * 70
    result = smart_truncate(text)
    assert not result.rstrip("…").endswith((",", ".", ";", ":", " "))


def test_normaliza_espacios_externos():
    assert smart_truncate("  hola  ") == "hola"
