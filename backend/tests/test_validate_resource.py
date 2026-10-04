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
