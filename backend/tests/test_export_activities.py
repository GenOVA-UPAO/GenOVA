"""Exportación de actividades editables: paquete H5P e iDevices nativos de eXeLearning.

Puros (sin DB ni red). Las fases llevan `activity` como la deja `ExportPackage`
cuando los datos de la plantilla siguen sincronizados con el HTML.
"""

import html
import json
import os
import random
import re
from datetime import UTC, datetime
from io import BytesIO
from zipfile import ZipFile

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")

import pytest  # noqa: E402
from lxml import etree  # noqa: E402

from ova_engine.registry import get_spec  # noqa: E402
from scorm import build_export  # noqa: E402
from scorm.domain.activities import TrueFalse, TrueFalseStatement  # noqa: E402
from scorm.domain.formats.elpx import (  # noqa: E402
    ElpxPage,
    OdeIdFactory,
    build_content_xml,
    build_elpx_bytes,
)
from scorm.domain.formats.exe_idevices import (  # noqa: E402
    decrypt_game,
    encrypt_game,
    js_escape,
    js_unescape,
)
from scorm.domain.formats.h5p import LIBRARIES, build_h5p_content  # noqa: E402

ODE = "{http://www.intef.es/xsd/ode}"
ODE_ID = re.compile(r"^[0-9]{14}[A-Z0-9]{6}$")
CONCEPT = "Índices B-tree"


def _activity_phase(rt: int, order: int, **params) -> dict:
    spec = get_spec("evaluate", rt)
    resolved = spec.resolve_params(params)
    return {
        "type": "evaluate",
        "order": order,
        "title": spec.title,
        "content": f"<!DOCTYPE html><html><body>recurso {rt}</body></html>",
        "activity": {"template": spec.key, "data": spec.sample(CONCEPT, resolved), "params": resolved},
    }


PHASES = [
    {"type": "engage", "order": 0, "title": "Inicio", "content": "<p>Simulación interactiva</p>"},
    _activity_phase(1, 1, num_questions=4),
    _activity_phase(4, 2, num_questions=5),
    _activity_phase(5, 3, num_sentences=4),
    _activity_phase(6, 4, num_pairs=4),
    _activity_phase(7, 5, num_terms=5),
]


def _data(order: int) -> dict:
    return PHASES[order]["activity"]["data"]


# --- H5P ------------------------------------------------------------------------------


def _h5p(phases=PHASES) -> tuple[ZipFile, dict, dict]:
    z = ZipFile(BytesIO(build_export("h5p", "Curso & <ML>", phases)))
    return z, json.loads(z.read("h5p.json")), json.loads(z.read("content/content.json"))


def test_h5p_package_has_only_h5p_json_and_content():
    z, _, _ = _h5p()
    # Sin librerías dentro: la plataforma (Moodle, Lumi…) las instala desde el Hub.
    assert sorted(z.namelist()) == ["content/content.json", "h5p.json"]


def test_h5p_json_is_valid_and_declares_used_libraries():
    _, manifest, content = _h5p()
    assert manifest["title"] == "Curso & <ML>"
    assert manifest["language"] == "es"
    assert manifest["mainLibrary"] == "H5P.Column"
    assert manifest["embedTypes"] == ["iframe"]
    deps = {(d["machineName"], d["majorVersion"], d["minorVersion"]) for d in manifest["preloadedDependencies"]}
    used = {item["content"]["library"] for item in content["content"]}
    assert deps == {LIBRARIES["column"]} | {
        (lib.split()[0], *map(int, lib.split()[1].split("."))) for lib in used
    }
    assert ("H5P.TrueFalse", 1, 8) not in deps  # no se declara lo que no se usa


def test_h5p_column_items_have_library_params_and_unique_subcontent_ids():
    _, _, content = _h5p()
    items = content["content"]
    ids = [item["content"]["subContentId"] for item in items]
    assert len(ids) == len(set(ids))
    known = {f"{n} {ma}.{mi}" for n, ma, mi in LIBRARIES.values()}
    for item in items:
        assert item["useSeparator"] in {"auto", "disabled", "enabled"}
        assert item["content"]["library"] in known
        assert isinstance(item["content"]["params"], dict)
        assert item["content"]["metadata"]["title"]


def _by_library(content: dict, prefix: str) -> list[dict]:
    return [i["content"]["params"] for i in content["content"] if i["content"]["library"].startswith(prefix)]


def test_h5p_multichoice_one_per_question_with_single_correct_answer():
    _, _, content = _h5p()
    mcs = _by_library(content, "H5P.MultiChoice ")
    assert len(mcs) == 4 + 5
    first = _data(1)["preguntas"][0]
    assert mcs[0]["question"] == f"<p>{html.escape(first['enunciado'], quote=False)}</p>"
    for params in mcs:
        assert sum(a["correct"] for a in params["answers"]) == 1
        assert params["behaviour"]["type"] == "single"
        assert params["UI"]["checkAnswerButton"] == "Comprobar"
    ok = next(a for a in mcs[0]["answers"] if a["correct"])
    assert ok["tipsAndFeedback"]["chosenFeedback"] == first["feedback_correcto"]


def test_h5p_blanks_marks_answers_with_asterisks_and_crossword_falls_back_to_blanks():
    _, _, content = _h5p()
    blanks, crossword = _by_library(content, "H5P.Blanks ")
    sentences = _data(3)["oraciones"]
    assert len(blanks["questions"]) == len(sentences)
    for q, s in zip(blanks["questions"], sentences, strict=True):
        assert f"*{s['respuesta']}*" in q
    assert blanks["behaviour"]["caseSensitive"] is False
    # H5P.Column no admite H5P.Crossword: cada pista es un hueco con la palabra.
    entries = _data(5)["entradas"]
    assert crossword["questions"][0] == f"<p>{entries[0]['pista']}: *{entries[0]['respuesta']}*</p>"


def test_h5p_matching_is_drag_text_with_one_line_per_pair():
    _, _, content = _h5p()
    (drag,) = _by_library(content, "H5P.DragText ")
    lines = drag["textField"].split("\n")
    pairs = _data(4)["parejas"]
    assert len(lines) == len(pairs)
    assert lines[0].endswith(f"*{pairs[0]['termino']}*")


def test_h5p_resources_without_activity_become_text():
    _, manifest, content = _h5p(PHASES[:1])
    assert [i["content"]["library"] for i in content["content"]] == ["H5P.AdvancedText 1.1"]
    assert "SCORM o Web" in content["content"][0]["content"]["params"]["text"]
    assert [d["machineName"] for d in manifest["preloadedDependencies"]] == ["H5P.Column", "H5P.AdvancedText"]


def test_h5p_escapes_syntax_characters_in_answers():
    phase = _activity_phase(5, 1, num_sentences=4)
    phase["activity"]["data"]["oraciones"][0].update(antes="a * b <c>", respuesta="x:y*", despues="")
    content, _ = build_h5p_content([phase])
    question = _by_library(content, "H5P.Blanks ")[0]["questions"][0]
    assert question == "<p>a  b &lt;c&gt; *x y*</p>"


def test_h5p_true_false_statements_map_to_truefalse(monkeypatch):
    from scorm.domain import activities

    tf = TrueFalse("VF", "Indica", (TrueFalseStatement("A", True), TrueFalseStatement("B", False)))
    monkeypatch.setitem(activities.MAPPERS, "test:vf", lambda data: tf)
    content, used = build_h5p_content(
        [{"type": "evaluate", "order": 1, "content": "x", "activity": {"template": "test:vf", "data": {}}}]
    )
    assert "truefalse" in used
    assert [p["correct"] for p in _by_library(content, "H5P.TrueFalse ")] == ["true", "false"]


# --- eXeLearning: iDevices nativos --------------------------------------------------------


def _elpx(phases=PHASES) -> tuple[ZipFile, etree._Element]:
    data = build_elpx_bytes(
        "Curso", "OVA", phases, now=datetime(2026, 10, 5, 12, 0, tzinfo=UTC), rng=random.Random(3)
    )
    z = ZipFile(BytesIO(data))
    return z, etree.fromstring(z.read("content.xml"))


def _components(root) -> list:
    return root.findall(f".//{ODE}odeComponent")


def _game(comp, css: str, encrypted: bool = True) -> dict:
    view = comp.findtext(f"{ODE}htmlView")
    raw = re.search(rf'<div class="{css} js-hidden">(.*?)</div>', view, re.S).group(1)
    return decrypt_game(raw) if encrypted else json.loads(html.unescape(raw))


def test_js_escape_and_game_cipher_roundtrip():
    text = "Índice ‘B-tree’ 😀 <a&b> ñ @*_+-./"
    assert js_escape("ñ ‘") == "%F1%20%u2018"
    assert js_unescape(js_escape(text)) == text
    assert decrypt_game(encrypt_game({"t": text})) == {"t": text}
    assert encrypt_game({"a": 1}).startswith("%E9")  # «{» XOR 146


def test_elpx_supported_phases_become_native_idevices():
    z, root = _elpx()
    types = [c.findtext(f"{ODE}odeIdeviceTypeName") for c in _components(root)]
    assert types == [
        "text",
        "quick-questions-multiple-choice",
        "quick-questions-multiple-choice",
        "complete",
        "relate",
        "crossword",
    ]
    # Sólo el recurso sin actividad se empaqueta como HTML para el iframe.
    assert [n for n in z.namelist() if n.endswith(".html")] == ["content/resources/genova/recurso_1.html"]


def test_elpx_native_ids_are_valid_and_synchronized():
    _, root = _elpx()
    for comp in _components(root)[1:]:
        idevice_id = comp.findtext(f"{ODE}odeIdeviceId")
        assert ODE_ID.match(idevice_id)
        view = comp.findtext(f"{ODE}htmlView")
        assert f'data-id="{idevice_id}"' in view
        # Tipo `html`: eXe sólo lee htmlView y escribe jsonProperties vacío.
        assert (comp.findtext(f"{ODE}jsonProperties") or "") == ""
        assert comp.findtext(f"{ODE}odeComponentsOrder") == "1"


def test_elpx_multiple_choice_game_data():
    _, root = _elpx()
    game = _game(_components(root)[1], "selecciona-DataGame")
    questions = _data(1)["preguntas"]
    assert game["typeGame"] == "Selecciona"
    assert game["id"] == _components(root)[1].findtext(f"{ODE}odeIdeviceId")
    assert len(game["selectsGame"]) == len(questions)
    for q, src in zip(game["selectsGame"], questions, strict=True):
        assert q["quextion"] == src["enunciado"]
        assert q["options"] == [o["texto"] for o in src["opciones"]]
        assert q["solution"] == "ABCD"[[o["correcta"] for o in src["opciones"]].index(True)]
        assert q["msgHit"] == src["feedback_correcto"]
    assert game["msgs"]["msgPlayStart"]


def test_elpx_complete_game_marks_blanks():
    _, root = _elpx()
    comp = _components(root)[3]
    game = _game(comp, "completa-DataGame")
    text = js_unescape(game["textText"])
    for s in _data(3)["oraciones"]:
        assert f"@@{s['respuesta']}@@" in text
    assert "completa-text-game" in comp.findtext(f"{ODE}htmlView")


def test_elpx_relate_and_crossword_game_data():
    _, root = _elpx()
    relate = _game(_components(root)[4], "relaciona-DataGame", encrypted=False)
    assert [(c["eText"], c["eTextBk"]) for c in relate["cardsGame"]] == [
        (p["termino"], p["definicion"]) for p in _data(4)["parejas"]
    ]
    crossword = _game(_components(root)[5], "crucigrama-DataGame")
    assert [w["word"] for w in crossword["wordsGame"]] == [e["respuesta"] for e in _data(5)["entradas"]]
    assert '<div class="crucigrama-version js-hidden">1</div>' in _components(root)[5].findtext(
        f"{ODE}htmlView"
    )


def test_elpx_true_false_keeps_state_in_json_properties():
    tf = TrueFalse("VF", "Indica", (TrueFalseStatement("A", True, "sí"), TrueFalseStatement("B", False)))
    xml = build_content_xml("C", "m", [ElpxPage("VF", activity=tf)], OdeIdFactory())
    comp = _components(etree.fromstring(xml.encode()))[0]
    assert comp.findtext(f"{ODE}odeIdeviceTypeName") == "trueorfalse"
    props = json.loads(comp.findtext(f"{ODE}jsonProperties"))
    assert props["typeGame"] == "TrueOrFalse"
    assert props["ideviceId"] == comp.findtext(f"{ODE}odeIdeviceId")
    assert [q["solution"] for q in props["questionsGame"]] == [1, 0]


@pytest.mark.parametrize("fmt", ["scorm2004", "html", "epub"])
def test_other_formats_ignore_activities(fmt):
    plain = [{k: v for k, v in p.items() if k != "activity"} for p in PHASES]
    with_data = ZipFile(BytesIO(build_export(fmt, "C", PHASES)))
    without = ZipFile(BytesIO(build_export(fmt, "C", plain)))
    assert with_data.namelist() == without.namelist()
