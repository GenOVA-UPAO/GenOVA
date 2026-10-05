"""Actividades editables: persistencia de los datos de plantilla y mapeo a modelos neutrales.

Puros salvo el almacén, que se prueba con una sesión falsa (sin Postgres).
"""

import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret-0123456789-abcdef-ghijkl-32+")

import pytest  # noqa: E402

import prometheus.engine.activity_store as store  # noqa: E402
import prometheus.plans.generate as gen  # noqa: E402
from core.config import settings  # noqa: E402
from core.text import content_hash  # noqa: E402
from ova.application.dto import ExportOvaInput  # noqa: E402
from ova.application.use_cases import ExportPackage, ExportScorm  # noqa: E402
from ova.domain.editor import EditorPhase, EditorVersion  # noqa: E402
from ova.domain.model import Ova, OvaActor  # noqa: E402
from ova_engine.registry import get_spec  # noqa: E402
from scorm.domain.activities import (  # noqa: E402
    MAPPERS,
    Crossword,
    FillBlanks,
    Matching,
    MultipleChoice,
    activity_from_template,
    crossword_word,
    phase_activity,
)

EXPECTED = {
    "evaluate:1": MultipleChoice,
    "evaluate:3": MultipleChoice,
    "evaluate:4": MultipleChoice,
    "evaluate:5": FillBlanks,
    "evaluate:6": Matching,
    "evaluate:7": Crossword,
}


def _param_variants(spec):
    """params mínimos, por defecto y máximos de la plantilla."""
    lo = {p.name: p.min if p.min is not None else p.default for p in spec.params}
    hi = {p.name: p.max if p.max is not None else p.default for p in spec.params}
    return [spec.resolve_params(v) for v in (lo, {}, hi)]


# --- mapeo -------------------------------------------------------------------------


def test_mappers_cover_the_assessment_templates():
    assert set(MAPPERS) == set(EXPECTED)
    for key in MAPPERS:
        phase, rt = key.split(":")
        assert get_spec(phase, int(rt)) is not None, key


@pytest.mark.parametrize("key", sorted(EXPECTED))
def test_every_template_sample_maps_to_its_model(key):
    phase, rt = key.split(":")
    spec = get_spec(phase, int(rt))
    for params in _param_variants(spec):
        data = spec.sample("Índices B-tree", params)
        activity = activity_from_template(key, data)
        assert isinstance(activity, EXPECTED[key]), (key, params)
        assert activity.title == data["titulo"]


def test_multiple_choice_keeps_exactly_one_correct_answer():
    data = get_spec("evaluate", 1).sample("x", {"num_questions": 4})
    data["preguntas"][0]["opciones"] = [
        {"texto": t, "correcta": True} for t in ("a", "b", "c", "d")
    ]
    data["preguntas"][1]["opciones"] = [
        {"texto": t, "correcta": False} for t in ("a", "b", "c", "d")
    ]
    quiz = activity_from_template("evaluate:1", data)
    for q in quiz.questions:
        assert sum(c.correct for c in q.choices) == 1
    assert quiz.questions[0].correct_index == 0
    assert quiz.questions[1].correct_index == 0
    first = data["preguntas"][2]
    assert quiz.questions[2].feedback_correct == first["feedback_correcto"]
    assert quiz.questions[2].feedback_incorrect == first["feedback_incorrecto"]


def test_field_mapping_of_blanks_matching_and_crossword():
    blanks = activity_from_template(
        "evaluate:5", get_spec("evaluate", 5).sample("x", {"num_sentences": 4, "word_bank": "si"})
    )
    assert blanks.sentences[1].answer == "hoja"
    assert blanks.sentences[1].after.startswith("guardan")
    pairs = activity_from_template("evaluate:6", get_spec("evaluate", 6).sample("x", {"num_pairs": 4}))
    assert pairs.pairs[2].term == "ROWID"
    assert pairs.pairs[2].definition.startswith("Dirección física")
    data = {
        "titulo": "C",
        "instrucciones": "i",
        "entradas": [
            {"respuesta": "Índice B", "pista": "p1"},
            {"respuesta": "123", "pista": "sin letras"},
            {"respuesta": "raíz", "pista": "p2"},
        ],
        "cierre": "",
    }
    cw = activity_from_template("evaluate:7", data)
    assert [e.clue for e in cw.entries] == ["p1", "p2"]  # sin letras → fuera
    assert [crossword_word(e.answer) for e in cw.entries] == ["INDICEB", "RAIZ"]


@pytest.mark.parametrize(
    ("key", "data"),
    [
        ("evaluate:2", {"titulo": "rúbrica"}),  # sin equivalente editable
        ("evaluate:1", {"titulo": "sin preguntas"}),
        ("evaluate:1", {"titulo": "t", "preguntas": [{"enunciado": "x"}]}),
        ("evaluate:6", {"titulo": "t", "parejas": [{"termino": "a", "definicion": "b"}]}),  # < 2
        ("evaluate:1", ["no", "es", "un", "dict"]),
        (None, {}),
    ],
)
def test_unsupported_or_malformed_data_falls_back_to_html(key, data):
    assert activity_from_template(key, data) is None


def test_phase_activity_reads_the_attached_record():
    data = get_spec("evaluate", 6).sample("x", {"num_pairs": 4})
    assert isinstance(phase_activity({"activity": {"template": "evaluate:6", "data": data}}), Matching)
    assert phase_activity({"content": "<p>x</p>"}) is None


# --- persistencia ---------------------------------------------------------------------


def test_content_hash_ignores_surrounding_whitespace():
    assert content_hash("  <p>a</p>\n") == content_hash("<p>a</p>")
    assert content_hash("<p>a</p>") != content_hash("<p>b</p>")
    assert len(content_hash(None)) == 64


def test_template_generation_returns_its_structured_data(monkeypatch):
    monkeypatch.setattr(settings, "llm_fake", True)
    monkeypatch.setattr(settings, "ova_engine_templates", True)
    result = gen.generate_resource("evaluate", 5, "Índices B-tree")
    assert result.activity["template"] == "evaluate:5"
    assert result.activity["phase"] == "evaluate" and result.activity["resource_type"] == 5
    assert result.activity["data"] == result.raw_json
    assert result.activity["params"]["num_sentences"] >= 4  # leídos del meta del HTML
    assert isinstance(activity_from_template("evaluate:5", result.activity["data"]), FillBlanks)


class _FakeResult:
    def __init__(self, row):
        self._row = row

    def first(self):
        return self._row


class _FakeSession:
    rows: list = []

    def __init__(self):
        self.committed = False

    def execute(self, stmt):
        sha = stmt.whereclause.right.value
        hit = next((r for r in _FakeSession.rows if r.content_sha256 == sha), None)
        return _FakeResult((hit.id,) if hit else None)

    def add(self, row):
        _FakeSession.rows.append(row)

    def commit(self):
        self.committed = True

    def rollback(self):
        pass

    def close(self):
        pass


def test_record_activity_stores_data_once_per_html(monkeypatch):
    _FakeSession.rows = []
    monkeypatch.setattr(store, "SessionLocal", _FakeSession)
    activity = {
        "template": "evaluate:6",
        "phase": "evaluate",
        "resource_type": 6,
        "data": {"titulo": "t", "parejas": []},
        "params": {"num_pairs": 5},
    }
    store.record_activity("<html>uno</html>", activity)
    store.record_activity("<html>uno</html>\n", activity)  # mismo HTML → no duplica
    store.record_activity("<html>dos</html>", activity)
    store.record_activity("<html>tres</html>", None)  # podcast / sin plantilla
    store.record_activity("", activity)
    assert [r.content_sha256 for r in _FakeSession.rows] == [
        content_hash("<html>uno</html>"),
        content_hash("<html>dos</html>"),
    ]
    row = _FakeSession.rows[0]
    assert (row.template_key, row.phase_type, row.resource_type) == ("evaluate:6", "evaluate", "6")
    assert row.data == activity["data"] and row.params == {"num_pairs": 5}


def test_record_activity_never_raises(monkeypatch):
    class Boom(_FakeSession):
        def execute(self, stmt):
            raise RuntimeError("db caída")

    monkeypatch.setattr(store, "SessionLocal", Boom)
    store.record_activity("<p>x</p>", {"template": "evaluate:1", "data": {}})


# --- exportación: sólo datos sincronizados -----------------------------------------------

GENERATED = "<!DOCTYPE html><html><body>quiz generado</body></html>"


class _Lifecycle:
    def get_active(self, ova_id):
        return Ova(
            id="ova-1",
            owner_id="u1",
            title="OVA",
            description=None,
            status="listo",
            file_path=None,
            storage_key=None,
            version_number=1,
            created_at=None,
            updated_at=None,
            deleted_at=None,
        )


class _Editor:
    def __init__(self, contents):
        self.contents = contents

    def get_active_version(self, ova_id):
        return EditorVersion(id="v1", version_number=1, prompt="", is_active=True, created_at=None)

    def list_phases(self, version_id):
        return tuple(
            EditorPhase(f"p{i}", "evaluate", i, c, False, 1, f"Fase {i}")
            for i, c in enumerate(self.contents, start=1)
        )


class _Activities:
    def __init__(self, records):
        self.records = records
        self.asked: list = []

    def find_by_hashes(self, hashes):
        self.asked.append(hashes)
        return {h: r for h, r in self.records.items() if h in hashes}


class _CapturingFormat:
    id = "h5p"
    extension = "h5p"
    media_type = "application/zip"

    def __init__(self):
        self.phases = None

    def build(self, course_title, phases):
        self.phases = phases
        return b"x"


def _export(contents, records):
    fmt = _CapturingFormat()
    lifecycle, editor = _Lifecycle(), _Editor(contents)
    activities = _Activities(records)
    use_case = ExportPackage(
        lifecycle, editor, ExportScorm(lifecycle, editor, None), lambda _id: fmt, activities
    )
    use_case.execute(ExportOvaInput("ova-1", OvaActor(id="u1", is_admin=False), "h5p"))
    return fmt.phases, activities


def test_export_attaches_data_only_while_html_is_unchanged():
    record = {"template": "evaluate:1", "data": {"titulo": "q"}, "params": {}}
    edited = GENERATED.replace("quiz generado", "quiz editado por el docente")
    phases, activities = _export([GENERATED, edited, GENERATED], {content_hash(GENERATED): record})
    assert phases[0]["activity"] == record
    assert "activity" not in phases[1]  # desincronizado → se exporta como HTML
    assert phases[2]["activity"] == record
    assert activities.asked == [(content_hash(GENERATED), content_hash(edited))]


def test_export_without_activity_repository_keeps_plain_phases():
    lifecycle, editor = _Lifecycle(), _Editor([GENERATED])
    fmt = _CapturingFormat()
    use_case = ExportPackage(lifecycle, editor, ExportScorm(lifecycle, editor, None), lambda _id: fmt)
    use_case.execute(ExportOvaInput("ova-1", OvaActor(id="u1", is_admin=False), "h5p"))
    assert "activity" not in fmt.phases[0]
