"""El material del docente (contexto RAG) llega de verdad a los prompts del LLM.

Se sustituye `generar_texto` (la única frontera con el LLM) por un doble que
captura los prompts, y se recorre cada camino: generación inicial (two_step,
direct_code, worker del work-pool y reintento de repair), regeneración desde cero
y edición desde el chat del editor. También cubre el modo LLM_FAKE, que ahora
muestra el contexto recibido en el HTML, y el informe de material de la
regeneración.
"""

import pytest

import generation.regen.regen_edit as regen_edit
import prometheus.plans.generate as gen
from rag.domain.context import (
    build_contexto_usuario,
    select_context_chunks,
    sources_in_context,
    summarize_sources,
)

MARK = "La constante de Planck vale 6,626e-34 J·s según el apunte del docente."
CTX = build_contexto_usuario(
    [{"content": MARK, "source_filename": "apunte-fisica.pdf", "upload_id": "u1"}]
)
HTML = (
    "<!DOCTYPE html><html lang='es'><head></head><body><h1>Tema</h1>"
    + "<p>Contenido desarrollado del recurso. </p>" * 60
    + "<button id='d'>Ir</button><script>document.getElementById('d')"
    ".addEventListener('click',()=>_scormComplete());function _scormComplete(){}"
    "</script></body></html>"
)


def _capture(prompts):
    def fake(prompt, task, *a, **k):
        prompts.append((task, prompt))
        return '{"contenido": "demo"}' if task == "texto" else HTML

    return fake


# --- generación inicial -------------------------------------------------------


def test_two_step_lleva_el_material_a_los_dos_prompts(monkeypatch):
    prompts: list = []
    monkeypatch.setattr(gen, "generar_texto", _capture(prompts))
    gen.generate_resource("evaluate", 1, "Cuántica", contexto=CTX, refine=False)
    assert [t for t, _ in prompts] == ["texto", "codigo"]
    assert all(MARK in p for _, p in prompts)
    assert all("CONTEXTO_APORTADO_POR_EL_USUARIO" in p for _, p in prompts)


def test_direct_code_lleva_el_material(monkeypatch):
    prompts: list = []
    monkeypatch.setattr(gen, "generar_texto", _capture(prompts))
    gen.generate_resource("explain", 2, "Cuántica", contexto=CTX, refine=False)
    assert len(prompts) == 1 and MARK in prompts[0][1]


def test_sin_material_no_hay_bloque(monkeypatch):
    prompts: list = []
    monkeypatch.setattr(gen, "generar_texto", _capture(prompts))
    gen.generate_resource("explain", 2, "Cuántica", refine=False)
    assert "CONTEXTO_APORTADO_POR_EL_USUARIO" not in prompts[0][1]


def test_el_worker_del_workpool_pasa_el_contexto_del_concierge(monkeypatch):
    from prometheus.engine import workpool

    seen = {}

    def fake_generate(*a, **k):
        seen["contexto"] = k.get("contexto")
        raise RuntimeError("parar aquí")

    monkeypatch.setattr(gen, "generate_resource", fake_generate)
    workpool.resource_worker(
        {
            "prompt": "Cuántica",
            "rag_context": CTX,
            "work_item": {"phase": "explain", "resource_type": 2, "resource_order": 0},
        }
    )
    assert seen["contexto"] == CTX


def test_fan_out_reparte_el_contexto_a_cada_worker():
    from prometheus.engine import workpool

    sends = workpool.fan_out(
        {
            "rag_context": CTX,
            "phase_order": ["explain"],
            "phases": {"explain": [{"resource_type": 2, "resource_order": 0}]},
            "intentions": [],
        }
    )
    assert sends[0].arg["rag_context"] == CTX


def test_repair_reintenta_con_el_mismo_contexto(monkeypatch):
    from prometheus.nodes import repair

    seen = {}

    def fake_generate(*a, **k):
        seen["contexto"] = k.get("contexto")
        raise RuntimeError("otra vez")

    monkeypatch.setattr(gen, "generate_resource", fake_generate)
    monkeypatch.setattr(repair, "_touch_job", lambda *_: None)
    monkeypatch.setattr(
        repair,
        "_pending_failures",
        lambda state: [{"phase": "explain", "resource_type": 2, "plan": "direct_code"}],
    )
    repair.repair_node({"prompt": "Cuántica", "rag_context": CTX})
    assert seen["contexto"] == CTX


# --- regeneración y edición desde el chat -------------------------------------


class _Phase:
    id = "p1"
    phase_type = "explain"
    resource_type_id = 2
    content = HTML
    title = "explain · Mapa"


def test_edicion_del_chat_inyecta_el_material(monkeypatch):
    prompts: list = []
    monkeypatch.setattr(regen_edit, "generar_texto", _capture(prompts))
    out = regen_edit.regen_phases_parallel(
        [_Phase()], "Cuántica", "usa el dato del apunte", None, contexto=CTX
    )
    assert out["p1"]
    assert "MATERIAL DE REFERENCIA DEL DOCENTE" in prompts[0][1]
    assert MARK in prompts[0][1]
    # El guardado anti-inyección viaja con el bloque.
    assert "INSTRUCCIÓN DE SEGURIDAD" in prompts[0][1]


def test_edicion_sin_material_no_anade_bloque(monkeypatch):
    prompts: list = []
    monkeypatch.setattr(regen_edit, "generar_texto", _capture(prompts))
    regen_edit.edit_phase_content("Cuántica", "sube el contraste", HTML)
    assert "MATERIAL DE REFERENCIA" not in prompts[0][1]


def test_regenerar_desde_cero_pasa_el_contexto_al_pipeline(monkeypatch):
    seen = {}

    def fake_generate(*a, **k):
        seen["contexto"] = k.get("contexto")
        return gen.ResourceResult(HTML, [], None)

    monkeypatch.setattr(gen, "generate_resource", fake_generate)
    regen_edit.regen_phases_parallel([_Phase()], "Cuántica", None, None, contexto=CTX)
    assert seen["contexto"] == CTX


# --- LLM_FAKE -----------------------------------------------------------------


def test_fake_resume_el_contexto_recibido():
    from prometheus.engine.fake_invoke import stub_resource_html

    html = stub_resource_html("Cuántica", "explain", 2, CTX)
    assert 'data-llm-fake-rag="1"' in html
    assert "1 fragmento de: apunte-fisica.pdf (1)" in html
    assert "constante de Planck" in html
    assert "data-llm-fake-rag" not in stub_resource_html("Cuántica", "explain", 2)


def test_fake_editar_deja_nota_con_el_cambio_y_el_material(monkeypatch):
    from core.config import settings

    monkeypatch.setattr(settings, "llm_fake", True)
    monkeypatch.setattr(regen_edit, "generar_texto", lambda *a, **k: pytest.fail("sin LLM"))
    out = regen_edit.edit_phase_content("Cuántica", "añade <b>ejemplos</b>", HTML, contexto=CTX)
    assert out is not None and out.rstrip().endswith("</html>")
    assert "Cambio aplicado con LLM_FAKE=1: añade &lt;b&gt;ejemplos&lt;/b&gt;" in out
    assert "apunte-fisica.pdf" in out


# --- dominio del contexto -----------------------------------------------------


def test_fuentes_solo_cuentan_lo_que_entra_en_el_presupuesto():
    chunks = [
        {"content": "A" * 900, "source_filename": "a.pdf", "upload_id": "a"},
        {"content": "B" * 900, "source_filename": "b.pdf", "upload_id": "b"},
    ]
    selected = select_context_chunks(chunks, max_chars=1000)
    assert [c["source_filename"] for c in selected] == ["a.pdf"]
    assert summarize_sources(selected) == [{"filename": "a.pdf", "chunks": 1, "upload_id": "a"}]


def test_fuentes_desde_un_bloque_formateado():
    ctx = build_contexto_usuario(
        [
            {"content": "uno", "source_filename": "a.pdf"},
            {"content": "dos", "source_filename": "b.docx"},
            {"content": "tres", "source_filename": "a.pdf"},
        ]
    )
    assert sources_in_context(ctx) == [
        {"filename": "a.pdf", "chunks": 2},
        {"filename": "b.docx", "chunks": 1},
    ]


# --- material de la regeneración ----------------------------------------------


def _chunk(upload_id, name, text="contenido relevante"):
    return {"id": f"{upload_id}-{name}", "upload_id": upload_id, "source_filename": name,
            "content": text}


def test_material_prioriza_el_adjunto_y_suma_lo_que_el_ova_ya_tenia(monkeypatch):
    import rag
    from generation.regen.regen_rag import build_regen_material

    calls = []

    def fake_top_k(db, query, ids, k=None):
        calls.append((query, list(ids), k))
        return [_chunk(ids[0], "nuevo.docx" if ids == ["new"] else "origen.pdf")]

    monkeypatch.setattr(rag, "is_enabled", lambda: True)
    monkeypatch.setattr(rag, "upload_ids_for_ova", lambda db, ova: ["old", "new"])
    monkeypatch.setattr(rag, "top_k", fake_top_k)
    attachments = [{"upload_id": "new", "filename": "nuevo.docx",
                    "rag_status": {"status": "indexed"}}]

    m = build_regen_material(None, "ova-1", attachments, "Tema", "usa el documento")

    assert calls[0] == ("usa el documento\nTema", ["new"], None)
    assert calls[1] == ("usa el documento\nTema", ["old"], 3)
    assert "nuevo.docx" in m.contexto and "origen.pdf" in m.contexto
    assert m.report["status"] == "used"
    assert m.report["sources"] == [
        {"filename": "nuevo.docx", "chunks": 1, "origin": "adjunto"},
        {"filename": "origen.pdf", "chunks": 1, "origin": "ova"},
    ]
    assert m.report["attachments"] == [{"filename": "nuevo.docx", "used": True, "reason": None}]


def test_material_con_rag_desactivado_no_finge_que_se_uso(monkeypatch):
    import rag
    from generation.regen.regen_rag import build_regen_material

    monkeypatch.setattr(rag, "is_enabled", lambda: False)
    monkeypatch.setattr(rag, "top_k", lambda *a, **k: pytest.fail("no debe buscar"))
    m = build_regen_material(
        None, "ova-1", [{"upload_id": "n", "filename": "x.pdf", "rag_status": {}}], "T", "c"
    )
    assert m.contexto == ""
    assert m.report["status"] == "disabled"
    assert m.report["attachments"][0]["used"] is False
    assert "desactivada" in m.report["attachments"][0]["reason"]


def test_adjunto_sin_indexar_explica_el_motivo(monkeypatch):
    import rag
    from generation.regen.regen_rag import build_regen_material

    monkeypatch.setattr(rag, "is_enabled", lambda: True)
    monkeypatch.setattr(rag, "upload_ids_for_ova", lambda db, ova: [])
    monkeypatch.setattr(rag, "top_k", lambda *a, **k: [])
    att = {"upload_id": "n", "filename": "scan.pdf",
           "rag_status": {"status": "skipped", "message": "No se encontró texto"}}
    m = build_regen_material(None, "ova-1", [att], "T", "c")
    assert m.report["status"] == "no_matches"
    assert m.report["attachments"][0] == {
        "filename": "scan.pdf", "used": False, "reason": "No se encontró texto"
    }


def test_sin_material_alguno_el_informe_lo_dice(monkeypatch):
    import rag
    from generation.regen.regen_rag import build_regen_material

    monkeypatch.setattr(rag, "is_enabled", lambda: True)
    monkeypatch.setattr(rag, "upload_ids_for_ova", lambda db, ova: [])
    m = build_regen_material(None, "ova-1", [], "T", None)
    assert m.report == {"status": "none", "sources": [], "attachments": []}
