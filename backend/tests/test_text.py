"""Contrato de core.text.smart_truncate (títulos de OVA desde el prompt)."""

from core.text import ova_title, smart_truncate


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


def test_titulo_es_la_primera_frase():
    prompt = (
        "Aprendizaje supervisado y no supervisado en machine learning. "
        "Objetivos: distinguir ambos enfoques y elegir uno según el problema."
    )
    assert ova_title(prompt) == "Aprendizaje supervisado y no supervisado en machine learning"


def test_titulo_usa_la_primera_linea():
    prompt = "Ley de Ohm en circuitos de corriente continua\nNivel educativo: universitario"
    assert ova_title(prompt) == "Ley de Ohm en circuitos de corriente continua"


def test_titulo_con_frase_corta_usa_la_linea_entera():
    assert ova_title("Ley de Ohm. Circuitos en serie y paralelo") == (
        "Ley de Ohm. Circuitos en serie y paralelo"
    )


def test_titulo_largo_sin_punto_se_trunca_por_palabra():
    prompt = "Fundamentos " + "de redes de computadoras " * 6
    result = ova_title(prompt)
    assert len(result) <= 80
    assert result.endswith("…")


def test_titulo_vacio():
    assert ova_title("  \n ") == ""
