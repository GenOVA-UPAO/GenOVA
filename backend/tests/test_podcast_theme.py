"""El podcast respeta los temas de paquete y es legible (QA 2026-10-06)."""

from llm.podcast import podcast


def test_podcast_usa_tokens_del_tema_y_no_blanco_sobre_naranja():
    css = podcast._STYLE
    assert "var(--action" in css and "var(--text" in css and "var(--bg" in css
    # El botón principal ya no es blanco fijo sobre el naranja #F47A20 (2.74:1).
    assert ".btn{background:#F47A20" not in css
