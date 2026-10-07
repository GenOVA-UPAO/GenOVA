"""F2.3 — checklist estructural por recurso (casos reales)."""

from prometheus.engine.validate import structural_defects

GOOD = (
    "<!DOCTYPE html><html><head></head><body>"
    "<h1>Regresión lineal</h1>"
    + "<p>Contenido pedagógico real y desarrollado sobre el concepto. </p>"
    * 60
    + '<button id="done">Continuar</button>'
    "<script>document.getElementById('done').addEventListener('click',()=>_scormComplete());"
    "function _scormComplete(){}</script></body></html>"
)

# Caso auditoría: Noticia de Impacto — 0 clickables, sin _scormComplete()
NOTICIA_ROTA = (
    "<!DOCTYPE html><html><head></head><body><h1>Titular</h1>"
    + "<p>Cuerpo de la noticia con contenido suficiente para no ser escaso. </p>" * 60
    + "</body></html>"
)

# Caso auditoría: Lab de Código esqueleto
LAB_ESQUELETO = (
    "<!DOCTYPE html><html><head></head><body><h1>Lab</h1>"
    "<div>Contenido del card</div><button>Ejecutar</button>"
    "<script>_scormComplete();function _scormComplete(){}</script></body></html>"
)


def test_good_resource_has_no_defects():
    assert structural_defects(GOOD) == []


def test_noticia_sin_clickables_detectada():
    defects = structural_defects(NOTICIA_ROTA)
    joined = " ".join(defects)
    assert "_scormComplete" in joined
    assert "interactivo" in joined


def test_lab_esqueleto_detectado():
    defects = structural_defects(LAB_ESQUELETO)
    joined = " ".join(defects)
    assert "placeholder" in joined
    assert "escaso" in joined


def test_visible_text_ignora_script_style_y_etiquetas():
    from prometheus.engine.validate import _visible_text

    html = "<style>p{color:red}</style><p>Hola <b>mundo</b></p><script>var x=1;</script>fin"
    assert _visible_text(html).split() == ["Hola", "mundo", "fin"]


def test_entrada_maliciosa_se_procesa_en_tiempo_lineal():
    import time

    from prometheus.engine.js_check import script_syntax_errors
    from prometheus.engine.validate import _visible_text

    for evil in ("<style" + " a" * 50000, "<script " * 50000, "<" * 100000, "<script>" + "<" * 100000):
        start = time.perf_counter()
        _visible_text(evil)
        script_syntax_errors(evil)
        assert time.perf_counter() - start < 0.5


def test_inline_scripts_cierre_con_atributos_y_filtros():
    from prometheus.engine.js_check import _inline_scripts

    html = (
        '<script>var a=1</script foo="x"><script src="x.js">q</script>'
        '<script type="text/plain">z</script><SCRIPT type="module">var b</SCRIPT>'
    )
    assert _inline_scripts(html) == ["var a=1", "var b"]
