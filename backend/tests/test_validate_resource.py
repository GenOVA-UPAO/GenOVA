"""F2.3 — checklist estructural + compuerta de refinamiento fusionada (casos reales)."""

import prometheus.engine.refine as refine_mod
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


def test_refine_improves_with_feedback(monkeypatch):
    calls = []

    def fake_feedback(html, concept, defects, phase, rt, *a, **k):
        calls.append(list(defects))
        return GOOD

    monkeypatch.setattr(refine_mod, "apply_feedback", fake_feedback)
    monkeypatch.setattr(refine_mod, "_refine_enabled", lambda: True)
    out, remaining = refine_mod.refine_and_check(NOTICIA_ROTA, "engage", 6, "tema")
    assert out == GOOD and remaining == []
    assert calls and any("_scormComplete" in d for d in calls[0])


def test_refine_keeps_original_on_regression(monkeypatch):
    monkeypatch.setattr(refine_mod, "apply_feedback", lambda *a, **k: "<html>x</html>")
    monkeypatch.setattr(refine_mod, "_refine_enabled", lambda: True)
    out, remaining = refine_mod.refine_and_check(NOTICIA_ROTA, "engage", 6, "tema", max_rounds=1)
    assert out == NOTICIA_ROTA  # el refinado regresivo (muy corto) se descarta
    assert remaining  # y los defectos quedan reportados


def test_refine_disabled_is_noop(monkeypatch):
    monkeypatch.setattr(refine_mod, "_refine_enabled", lambda: False)
    called = []
    monkeypatch.setattr(refine_mod, "apply_feedback", lambda *a, **k: called.append(1))
    out, remaining = refine_mod.refine_and_check(NOTICIA_ROTA, "engage", 6, "tema")
    assert out == NOTICIA_ROTA and remaining  # devuelve defectos sin llamar al LLM
    assert not called


def test_refine_skips_llm_when_budget_exhausted(monkeypatch):
    monkeypatch.setattr(refine_mod, "_refine_enabled", lambda: True)
    called = []
    monkeypatch.setattr(refine_mod, "apply_feedback", lambda *a, **k: called.append(1) or GOOD)
    out, remaining = refine_mod.refine_and_check(
        NOTICIA_ROTA, "engage", 6, "tema", deadline=0.0
    )
    assert out == NOTICIA_ROTA and remaining
    assert not called
