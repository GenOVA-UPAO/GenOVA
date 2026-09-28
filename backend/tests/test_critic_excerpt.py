"""Tests puros de build_excerpt (EN-015) — sin LLM, sin red, sin BD."""

import pytest

from prometheus.critic.excerpt import DEFAULT_BUDGET, build_excerpt

OVA_BASE = '<style id="ova-base">.ova-x{color:#000}</style>'


def _doc(body: str = "", script: str = "", own_style: str = "") -> str:
    style = OVA_BASE + (f"<style>{own_style}</style>" if own_style else "")
    sc = f"<script>{script}</script>" if script else ""
    return (
        f'<!DOCTYPE html><html lang="es"><head><title>Titulo del recurso</title>'
        f"{style}</head><body>{body}{sc}</body></html>"
    )


# ---------------------------------------------------------------------------
# data-URIs
# ---------------------------------------------------------------------------


def test_data_uri_gigante_al_principio_se_marca():
    payload = "A" * (4096 * 100)  # bytes = 307200 -> exactamente 300KB
    html = f'<img src="data:image/png;base64,{payload}">' + _doc()
    out = build_excerpt(html)
    assert "[img:data-uri 300KB]" in out
    assert "A" * 100 not in out
    assert len(out) < len(html)


def test_varios_data_uris_imagen_audio_video():
    html = (
        '<img src="data:image/jpeg;base64,' + "B" * 4097 + '" alt="x">'
        '<audio src="data:audio/wav;base64,' + "C" * (4096 * 10) + '"></audio>'
        '<video src="data:video/mp4;base64,' + "D" * (4096 * 20) + '"></video>'
        + _doc()
    )
    out = build_excerpt(html)
    assert "[img:data-uri 3KB]" in out
    assert "[audio:data-uri 30KB]" in out
    assert "[video:data-uri 60KB]" in out
    assert ";base64," not in out


def test_data_uri_dentro_de_script_tambien_se_marca():
    html = (
        "<script>const cfg={img:'data:image/png;base64," + "D" * 8192 + "'};</script>"
        + _doc()
    )
    out = build_excerpt(html)
    assert "[img:data-uri" in out
    assert ";base64," not in out


def test_data_uri_corto_se_deja_como_esta():
    uri = "data:image/gif;base64,R0lGOA=="
    html = _doc() + f'<img src="{uri}">'
    out = build_excerpt(html)
    assert uri in out  # menor de 60 chars: el marcador seria mas largo


# ---------------------------------------------------------------------------
# HTML constante inyectado
# ---------------------------------------------------------------------------


def test_ova_base_style_eliminado_y_estilo_propio_conservado():
    html = _doc(own_style="h1{font-size:2rem}")
    out = build_excerpt(html)
    assert 'id="ova-base"' not in out
    assert ".ova-x{color:#000}" not in out
    assert "h1{font-size:2rem}" in out


def test_libreria_componentes_upao_eliminada_script_propio_conservado():
    lib = (
        "<script>\n/* UPAO Components v1.0 — Universidad Privada Antenor Orrego */\n"
        "(function(G){})();\n</script>"
    )
    html = _doc(script="addEventListener('click',h);_scormComplete();") + lib
    out = build_excerpt(html)
    assert "UPAO Components v" not in out
    assert "addEventListener('click',h);_scormComplete();" in out


# ---------------------------------------------------------------------------
# Muestreo
# ---------------------------------------------------------------------------


def test_html_mas_corto_que_presupuesto_se_devuelve_entero_sin_marca():
    html = _doc(body="<h1>Hola</h1><p>Parrafo</p>", script="x();")
    out = build_excerpt(html)
    assert "omitidos" not in out
    assert "<title>Titulo del recurso</title>" in out
    assert "<h1>Hola</h1><p>Parrafo</p>" in out
    assert "x();" in out
    assert 'id="ova-base"' not in out


def test_html_igual_al_presupuesto_se_devuelve_entero():
    html = "x" * DEFAULT_BUDGET
    assert build_excerpt(html) == html


def test_oversize_recorta_por_el_medio_y_marca_el_corte():
    body = "<p>" + ("contenido didactico " * 400) + "</p>"
    script = "logica(interactiva);" * 800
    html = _doc(body=body, script=script)
    out = build_excerpt(html)
    assert "omitidos" in out
    assert out.startswith("<!DOCTYPE html>")
    assert out.rstrip().endswith("</html>")
    assert len(out) <= DEFAULT_BUDGET + 200


def test_script_final_incluido_en_extracto_grande():
    script = (
        "const quiz=[" + ",".join(f"'q{i}'" for i in range(500)) + "];"
        "addEventListener('click',go);_scormComplete();"
    )
    html = _doc(body="<p>" + ("texto pedagogico " * 900) + "</p>", script=script)
    out = build_excerpt(html, budget=6000)
    assert "omitidos" in out
    assert "const quiz=[" in out  # inicio del script propio
    assert "_scormComplete();" in out  # final del script propio


def test_documento_sin_script_no_falla():
    html = _doc(body="<h1>Titulo</h1><p>" + "texto " * 2000 + "</p>")
    out = build_excerpt(html)
    assert "Titulo" in out
    assert "omitidos" in out
    assert len(out) <= DEFAULT_BUDGET + 200


def test_sin_head_ni_body_etiquetas():
    html = "<p>" + ("contenido " * 3000) + "</p>"
    out = build_excerpt(html)
    assert out
    assert len(out) <= DEFAULT_BUDGET + 200


def test_presupuesto_cero_devuelve_vacio():
    assert build_excerpt("<p>hola</p>", budget=0) == ""


def test_presupuesto_diminuto_no_falla_y_respeta_el_corte_blando():
    html = _doc(body="<p>" + "texto " * 5000 + "</p>", script="y();")
    out = build_excerpt(html, budget=500)
    assert len(out) <= 500 + 200
    assert out


def test_varios_scripts_se_reparten_presupuesto():
    s1 = "a();" + "x();" * 2000
    s2 = "b();" + "y();" * 2000
    html = _doc(body="p", script=s1) + _doc(script=s2)
    out = build_excerpt(html, budget=4000)
    assert "omitidos" in out
    assert "a();" in out and "b();" in out


def test_default_budget_mayor_que_el_viejo():
    assert DEFAULT_BUDGET > 2000


# ---------------------------------------------------------------------------
# Invariantes
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "html",
    [
        '<img src="data:image/png;base64,' + "E" * 100000 + '">' + _doc(script="z();"),
        _doc(body="<p>" + "t " * 20000 + "</p>"),
        _doc(body="<p>fin</p>"),
        _doc(own_style="s{}")
        + '<img src="data:image/jpeg;base64,' + "F" * 5000 + '">',
    ],
    ids=["uri_gigante", "body_grande", "doc_pequeno", "uri_medio"],
)
def test_invariantes_basiques(html):
    out = build_excerpt(html)
    assert ";base64," not in out
    assert "UPAO Components v" not in out
    assert 'id="ova-base"' not in out
