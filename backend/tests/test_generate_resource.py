"""Cobertura del pipeline unificado `generate_resource` (#2).

Primera cobertura real del pipeline por recurso: el BDD stubea el engine entero,
así que two_step/direct_code/podcast + retry de JSON + theming + la compuerta de
refinamiento fusionada no tenían tests. Se mockea `generar_texto` (única frontera
LLM) y se ejerce la lógica real de plan, parseo, inyección y defectos.
"""

import prometheus.plans.generate as gen

FULL_HTML = (
    "<!DOCTYPE html><html lang='es'><head></head><body>"
    "<h1>Regresión lineal</h1>"
    + "<p>Contenido pedagógico real y desarrollado del concepto. </p>"
    * 60
    + "<button id='d'>Ir</button>"
    "<script>document.getElementById('d').addEventListener('click',()=>_scormComplete());"
    "function _scormComplete(){}</script></body></html>"
)


def _fake_generar(html=FULL_HTML):
    """Fake de generar_texto: JSON en el paso 'texto', HTML en el paso 'codigo'."""

    def fake(prompt, task, *a, **k):
        return '{"contenido": "demo"}' if task == "texto" else html

    return fake


def test_two_step_applies_theming_and_returns_json(monkeypatch):
    monkeypatch.setattr(gen, "generar_texto", _fake_generar())
    r = gen.generate_resource("evaluate", 1, "tema", refine=False)  # evaluate:1 = two_step
    assert r.raw_json == {"contenido": "demo"}
    assert 'id="ova-base"' in r.html  # base_css inyectado (theme upao por defecto)
    assert "UPAO Components v" in r.html  # componentes inyectados
    assert r.defects == []


def test_direct_code_single_call_no_json(monkeypatch):
    calls = []

    def fake(prompt, task, *a, **k):
        calls.append(task)
        return FULL_HTML

    monkeypatch.setattr(gen, "generar_texto", fake)
    r = gen.generate_resource("explain", 2, "tema", refine=False)  # explain:2 = direct_code
    assert calls == ["codigo"]  # una sola llamada, sin paso texto→JSON
    assert r.raw_json is None


def test_json_retry_recovers_bad_first_parse(monkeypatch):
    seq = iter(["esto no es json", '{"ok": 1}'])

    def fake(prompt, task, *a, **k):
        return next(seq) if task == "texto" else FULL_HTML

    monkeypatch.setattr(gen, "generar_texto", fake)
    r = gen.generate_resource("evaluate", 1, "tema", refine=False)
    assert r.raw_json == {"ok": 1}  # el retry estricto recuperó el JSON


def test_podcast_returns_player_and_monologue(monkeypatch):
    monkeypatch.setattr(gen, "generar_texto", lambda *a, **k: "monólogo del podcast")
    monkeypatch.setattr("llm.podcast.podcast.podcast_audio_b64", lambda text: None)
    r = gen.generate_resource("engage", 3, "tema")  # engage:3 = podcast
    assert r.raw_json == {"monologue": "monólogo del podcast"}
    assert r.html and r.defects == []


def test_structural_defects_flow_to_result(monkeypatch):
    import prometheus.engine.refine as refine_mod

    # Placeholder sin resolver: es el único defecto que la inyección de la librería
    # de componentes NO enmascara (esta aporta scorm/interactividad al HTML).
    broken = (
        "<!DOCTYPE html><html><head></head><body><h1>x</h1>"
        "<div>Contenido del card</div>" + "<p>t. </p>" * 60 + "</body></html>"
    )
    monkeypatch.setattr(gen, "generar_texto", _fake_generar(html=broken))
    monkeypatch.setattr(refine_mod, "_refine_enabled", lambda: True)
    monkeypatch.setattr(refine_mod, "apply_feedback", lambda html, *a, **k: html)  # no mejora
    r = gen.generate_resource("evaluate", 1, "tema")
    # El defecto se reporta a `defects` para el routing a repair del workpool.
    assert any("placeholder" in d for d in r.defects)


def test_final_sweep_replaces_markers_when_image_generation_is_disabled(monkeypatch):
    marked_html = FULL_HTML.replace("</body>", '<img src="__IMG_4__"></body>')
    monkeypatch.setattr(gen, "generar_texto", _fake_generar(html=marked_html))

    result = gen.generate_resource("engage", 1, "tema", image_settings={}, refine=False)

    assert "__IMG_4__" not in result.html
    assert "data:image/svg+xml;base64," in result.html


def test_final_sweep_replaces_markers_reintroduced_by_refinement(monkeypatch):
    import prometheus.engine.refine as refine_mod

    monkeypatch.setattr(gen, "generar_texto", _fake_generar())
    monkeypatch.setattr(
        refine_mod,
        "refine_and_check",
        lambda html, *args, **kwargs: (html.replace("</body>", '<img src="__IMG_8__"></body>'), []),
    )

    result = gen.generate_resource("evaluate", 1, "tema")

    assert "__IMG_8__" not in result.html
    assert "data:image/svg+xml;base64," in result.html


def test_json_step_fuerza_thinking_off(monkeypatch):
    calls = []

    def fake(prompt, task, *a, **k):
        calls.append(k)
        return '{"contenido": "demo"}' if task == "texto" else FULL_HTML

    monkeypatch.setattr(gen, "generar_texto", fake)
    gen._parse_json_with_retry("prompt", "engage", 1, {}, [])
    # Ambas llamadas (principal y reintento estricto) van sin thinking.
    assert all(c.get("thinking") is False for c in calls)
