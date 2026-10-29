"""Chat "Aplicar" con recurso seleccionado = edición puntual, no regen desde cero.

Bug: el mensaje del chat ("arregla los botones") se usaba como CONCEPTO y el
recurso se recreaba entero (título y tema nuevos). Ahora el mensaje es una
INSTRUCCIÓN sobre el HTML actual y el tema se conserva.
"""

import generation.regen.regen_edit as regen_edit

_regen_one_phase = regen_edit._regen_one_phase
edit_phase_content = regen_edit.edit_phase_content

_BASE_HTML = "<!DOCTYPE html><html><head></head><body>" + "x" * 400 + "</body></html>"


class _Phase:
    id = "p1"
    phase_type = "explore"
    resource_type_id = 2
    content = _BASE_HTML
    title = "explore · Simulador"


def test_edit_keeps_topic_and_passes_current_html(monkeypatch):
    seen = {}

    def fake_generar(prompt, tarea, *a, **kw):
        seen["prompt"] = prompt
        return "<!DOCTYPE html><html><body>" + "y" * 500 + "</body></html>"

    monkeypatch.setattr(regen_edit, "generar_texto", fake_generar)
    out = edit_phase_content("Aprendizaje supervisado", "arregla los botones", _BASE_HTML)

    assert out and out.strip().lower().endswith("</html>")
    assert "arregla los botones" in seen["prompt"]
    assert "Aprendizaje supervisado" in seen["prompt"]
    assert "HTML_ACTUAL" in seen["prompt"]


def test_edit_discards_truncated_result(monkeypatch):
    monkeypatch.setattr(regen_edit, "generar_texto", lambda *a, **kw: "<html><body>cortad")
    assert edit_phase_content("tema", "cambio", _BASE_HTML) is None


def test_edit_discards_shrunk_result(monkeypatch):
    monkeypatch.setattr(regen_edit, "generar_texto", lambda *a, **kw: "<html></html>")
    assert edit_phase_content("tema", "cambio", _BASE_HTML) is None


def test_edit_noop_without_instruction():
    assert edit_phase_content("tema", "", _BASE_HTML) is None
    assert edit_phase_content("tema", "   ", _BASE_HTML) is None


def test_regen_one_phase_routes_to_edit_when_instruction(monkeypatch):
    called = {}
    monkeypatch.setattr(
        regen_edit,
        "edit_phase_content",
        lambda *a, **kw: called.setdefault("edit", True) or "<html></html>",
    )
    monkeypatch.setattr(
        regen_edit,
        "regenerate_phase_content",
        lambda *a, **kw: called.setdefault("regen", True),
    )
    _regen_one_phase(_Phase(), "tema", "sube el contraste", None, None, None)
    assert called == {"edit": True}


def test_regen_one_phase_routes_to_regen_without_instruction(monkeypatch):
    called = {}
    monkeypatch.setattr(
        regen_edit, "edit_phase_content", lambda *a, **kw: called.setdefault("edit", True)
    )
    monkeypatch.setattr(
        regen_edit,
        "regenerate_phase_content",
        lambda *a, **kw: called.setdefault("regen", True) or "<html></html>",
    )
    _regen_one_phase(_Phase(), "tema", None, None, None, None)
    assert called == {"regen": True}


# ── Recurso añadido con «Añadir recurso»: aún guarda el marcador pendiente ─────


def _placeholder_phase(prompt: str = "un ejercicio práctico sobre el sobreajuste"):
    from ova.domain.editor import placeholder_content

    class _New:
        id = "p-nuevo"
        phase_type = "explore"
        resource_type_id = None
        content = placeholder_content(prompt)
        title = None

    return _New()


def test_placeholder_prompt_reads_back_the_instructions():
    from ova.domain.editor import placeholder_content, placeholder_prompt

    assert placeholder_prompt(placeholder_content("  una lectura [con corchetes]  ")) == (
        "una lectura [con corchetes]"
    )
    assert placeholder_prompt(_BASE_HTML) is None
    assert placeholder_prompt("[Generado con prompt: x] otra cosa") is None
    assert placeholder_prompt(None) is None


def test_new_resource_is_generated_from_scratch_with_its_instructions(monkeypatch):
    seen = {}
    monkeypatch.setattr(
        regen_edit,
        "edit_phase_content",
        lambda *a, **kw: seen.setdefault("edit", True),
    )

    def fake_regen(phase_type, rtype, concept, *_a, **kw):
        seen.update(phase_type=phase_type, rtype=rtype, concept=concept, theme=kw.get("theme"))
        return "<html>nuevo</html>"

    monkeypatch.setattr(regen_edit, "regenerate_phase_content", fake_regen)
    theme = {"color": "free", "design": "free"}
    out = _regen_one_phase(
        _placeholder_phase(), "Aprendizaje supervisado", None, None, None, None, "", theme
    )

    assert out == "<html>nuevo</html>"
    assert "edit" not in seen  # no «edita» el texto del marcador
    assert seen["phase_type"] == "explore" and seen["rtype"]  # tipo por defecto de la fase
    assert "Aprendizaje supervisado" in seen["concept"]
    assert "un ejercicio práctico sobre el sobreajuste" in seen["concept"]
    assert seen["theme"] == theme  # colores del resto del OVA


def test_new_resource_prefers_the_request_instructions(monkeypatch):
    seen = {}
    monkeypatch.setattr(regen_edit, "edit_phase_content", lambda *a, **kw: None)
    monkeypatch.setattr(
        regen_edit,
        "regenerate_phase_content",
        lambda _p, _r, concept, *a, **kw: seen.setdefault("concept", concept),
    )
    _regen_one_phase(_placeholder_phase("viejo"), "Tema", "un mapa conceptual", None, None, None)
    assert "un mapa conceptual" in seen["concept"] and "viejo" not in seen["concept"]


def test_new_resource_concept_without_instructions_keeps_topic():
    assert regen_edit.new_resource_concept("Tema", "  ") == "Tema"
    assert regen_edit.new_resource_concept("", "solo esto") == "solo esto"


# ── Edición por parches (M7) ─────────────────────────────────────────────────

_PATCHABLE = (
    "<!DOCTYPE html><html><head></head><body><h1>Quiz</h1><button id='go'>Enviar</button>"
    + "x" * 400
    + "</body></html>"
)


def test_edicion_por_parches_aplica_solo_los_fragmentos_y_pide_poca_salida(monkeypatch):
    calls = []

    def fake_generar(prompt, tarea, max_tokens, *a, **kw):
        calls.append(max_tokens)
        return '{"edits": [{"old": "Enviar", "new": "Responder"}]}'

    monkeypatch.setattr(regen_edit, "generar_texto", fake_generar)
    out = edit_phase_content("tema", "cambia el texto del botón", _PATCHABLE)

    assert "Responder" in out and "Enviar" not in out and "<h1>Quiz</h1>" in out
    # Una sola llamada y con una salida por debajo del umbral de «thinking» (6k).
    assert len(calls) == 1 and calls[0] < 6000


def test_parche_invalido_cae_a_reescribir_el_documento(monkeypatch):
    calls = []

    def fake_generar(prompt, tarea, max_tokens, *a, **kw):
        calls.append(max_tokens)
        if len(calls) == 1:
            return "no es json"
        return "<!DOCTYPE html><html><body>" + "y" * 500 + "</body></html>"

    monkeypatch.setattr(regen_edit, "generar_texto", fake_generar)
    out = edit_phase_content("tema", "cambio", _PATCHABLE)

    assert out and out.strip().lower().endswith("</html>")
    assert len(calls) == 2 and calls[1] > calls[0]


def test_parche_con_fragmento_repetido_o_inexistente_se_descarta():
    assert regen_edit.apply_edits("<p>a</p><p>a</p></html>", [("a", "b")]) is None
    assert regen_edit.apply_edits("<p>a</p></html>", [("zzz", "b")]) is None
    assert regen_edit.apply_edits("<p>a</p></html>", [("a", "a")]) is None
    assert regen_edit.apply_edits("<p>a</p></html>", [("<p>a</p>", "<p>b</p>")]) == "<p>b</p></html>"


def test_parche_que_rompe_el_cierre_del_documento_se_descarta():
    assert regen_edit.apply_edits("<p>a</p></html>", [("</html>", "")]) is None


def test_si_el_modelo_falla_en_el_parche_se_intenta_el_documento_entero(monkeypatch):
    calls = []

    def fake_generar(*a, **kw):
        calls.append(1)
        if len(calls) == 1:
            raise RuntimeError("EmptyContentError")
        return "<!DOCTYPE html><html><body>" + "z" * 500 + "</body></html>"

    monkeypatch.setattr(regen_edit, "generar_texto", fake_generar)
    assert edit_phase_content("tema", "cambio", _PATCHABLE)
    assert len(calls) == 2
