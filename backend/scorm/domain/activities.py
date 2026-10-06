"""Actividades editables: modelos neutrales a partir de los datos de una plantilla.

El motor por plantillas (`ova_engine`) guarda, junto al HTML, el JSON de texto
validado de cada recurso (ver `ova_resource_activities`). Este módulo traduce ese
JSON a modelos neutrales (opción múltiple, completar espacios, relacionar,
crucigrama, verdadero/falso) que los exportadores convierten en actividades
editables de otras herramientas: H5P (`formats/h5p.py`) e iDevices nativos de
eXeLearning (`formats/exe_idevices.py`).

El mapeo es un contrato con el schema de cada plantilla (`ova_engine/templates/
evaluate_NN.py`); `tests/test_activities.py` lo verifica contra `sample()` de cada
una. Datos que no encajan → `None` y el recurso se exporta como HTML.

Sólo se usa si los datos siguen sincronizados con el HTML de la fase: el registro
guarda el hash del HTML generado y, si el docente lo edita, el hash deja de
coincidir y el recurso vuelve a exportarse como HTML (nunca se exportan datos que
ya no corresponden a lo que ve el estudiante).
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Callable, Mapping
from dataclasses import dataclass

from core.text import content_hash

# --- modelos neutrales -------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class Choice:
    text: str
    correct: bool


@dataclass(frozen=True, slots=True)
class ChoiceQuestion:
    prompt: str
    choices: tuple[Choice, ...]  # exactamente una correcta
    feedback_correct: str = ""
    feedback_incorrect: str = ""

    @property
    def correct_index(self) -> int:
        return next(i for i, c in enumerate(self.choices) if c.correct)


@dataclass(frozen=True, slots=True)
class MultipleChoice:
    title: str
    instructions: str
    questions: tuple[ChoiceQuestion, ...]
    closing: str = ""
    kind: str = "multiple_choice"


@dataclass(frozen=True, slots=True)
class BlankSentence:
    before: str
    answer: str
    after: str = ""
    explanation: str = ""


@dataclass(frozen=True, slots=True)
class FillBlanks:
    title: str
    instructions: str
    sentences: tuple[BlankSentence, ...]
    closing: str = ""
    kind: str = "fill_blanks"


@dataclass(frozen=True, slots=True)
class MatchPair:
    term: str
    definition: str
    feedback_correct: str = ""
    feedback_incorrect: str = ""


@dataclass(frozen=True, slots=True)
class Matching:
    title: str
    instructions: str
    pairs: tuple[MatchPair, ...]
    closing: str = ""
    kind: str = "matching"


@dataclass(frozen=True, slots=True)
class CrosswordEntry:
    answer: str  # tal cual la escribió el LLM; cada exportador la normaliza (`crossword_word`)
    clue: str


@dataclass(frozen=True, slots=True)
class Crossword:
    title: str
    instructions: str
    entries: tuple[CrosswordEntry, ...]
    closing: str = ""
    kind: str = "crossword"


@dataclass(frozen=True, slots=True)
class TrueFalseStatement:
    statement: str
    is_true: bool
    feedback: str = ""


@dataclass(frozen=True, slots=True)
class TrueFalse:
    title: str
    instructions: str
    statements: tuple[TrueFalseStatement, ...]
    closing: str = ""
    kind: str = "true_false"


Activity = MultipleChoice | FillBlanks | Matching | Crossword | TrueFalse


def crossword_word(answer: str) -> str:
    """Palabra de crucigrama: sin tildes ni espacios, sólo letras en mayúscula
    (misma regla que la plantilla `evaluate_07`)."""
    base = unicodedata.normalize("NFD", str(answer or ""))
    base = "".join(ch for ch in base if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^A-Za-z]", "", base).upper()


# --- mapeo plantilla → modelo ------------------------------------------------------


def _text(value) -> str:
    return " ".join(str(value or "").split())


def _single_correct(options: list) -> tuple[Choice, ...]:
    """Una sola correcta, como hace `render` de las plantillas: el LLM es entrada
    no confiable y puede marcar 0 o varias."""
    flags = [bool(o.get("correcta")) for o in options]
    if flags.count(True) != 1:
        first = flags.index(True) if True in flags else 0
        flags = [i == first for i in range(len(options))]
    return tuple(Choice(_text(o.get("texto")), flag) for o, flag in zip(options, flags, strict=True))


def _choice_quiz(data: Mapping, *, ok_key: str, ko_key: str | None, intro_key: str) -> MultipleChoice:
    questions = tuple(
        ChoiceQuestion(
            prompt=_text(q["enunciado"]),
            choices=_single_correct(q["opciones"]),
            feedback_correct=_text(q.get(ok_key)),
            feedback_incorrect=_text(q.get(ko_key or ok_key)),
        )
        for q in data["preguntas"]
    )
    return MultipleChoice(
        _text(data["titulo"]), _text(data.get(intro_key)), questions, _text(data.get("cierre"))
    )


def _quiz(data: Mapping) -> MultipleChoice:  # evaluate:1 Quiz Interactivo
    return _choice_quiz(
        data, ok_key="feedback_correcto", ko_key="feedback_incorrecto", intro_key="instrucciones"
    )


def _timed_challenge(data: Mapping) -> MultipleChoice:  # evaluate:3 Desafío Contrarreloj
    return _choice_quiz(data, ok_key="explicacion", ko_key=None, intro_key="reglas")


def _exam(data: Mapping) -> MultipleChoice:  # evaluate:4 Examen Opción Múltiple
    return _choice_quiz(data, ok_key="justificacion", ko_key=None, intro_key="instrucciones")


def _fill_blanks(data: Mapping) -> FillBlanks:  # evaluate:5 Completar Espacios
    sentences = tuple(
        BlankSentence(
            _text(o["antes"]), _text(o["respuesta"]), _text(o.get("despues")), _text(o.get("explicacion"))
        )
        for o in data["oraciones"]
    )
    return FillBlanks(
        _text(data["titulo"]), _text(data.get("instrucciones")), sentences, _text(data.get("cierre"))
    )


def _matching(data: Mapping) -> Matching:  # evaluate:6 Relacionar Conceptos
    pairs = tuple(
        MatchPair(
            _text(p["termino"]),
            _text(p["definicion"]),
            _text(p.get("feedback_acierto")),
            _text(p.get("feedback_error")),
        )
        for p in data["parejas"]
    )
    return Matching(
        _text(data["titulo"]), _text(data.get("instrucciones")), pairs, _text(data.get("cierre"))
    )


def _crossword(data: Mapping) -> Crossword:  # evaluate:7 Crucigrama Conceptual
    entries = tuple(
        CrosswordEntry(_text(e["respuesta"]), _text(e["pista"]))
        for e in data["entradas"]
        if crossword_word(e["respuesta"])
    )
    return Crossword(
        _text(data["titulo"]), _text(data.get("instrucciones")), entries, _text(data.get("cierre"))
    )


# Clave de plantilla (`fase:rt`) → mapeo. Hoy no hay plantilla de verdadero/falso:
# cuando exista, basta con añadir aquí su función a `TrueFalse`.
MAPPERS: dict[str, Callable[[Mapping], Activity]] = {
    "evaluate:1": _quiz,
    "evaluate:3": _timed_challenge,
    "evaluate:4": _exam,
    "evaluate:5": _fill_blanks,
    "evaluate:6": _matching,
    "evaluate:7": _crossword,
}

_MIN_ITEMS = {"multiple_choice": 1, "fill_blanks": 1, "matching": 2, "crossword": 2, "true_false": 1}


def _items(activity: Activity) -> tuple:
    if isinstance(activity, MultipleChoice):
        return activity.questions
    if isinstance(activity, FillBlanks):
        return activity.sentences
    if isinstance(activity, Matching):
        return activity.pairs
    if isinstance(activity, Crossword):
        return activity.entries
    return activity.statements


def activity_from_template(template_key: str | None, data) -> Activity | None:
    """Modelo neutral del recurso, o None si la plantilla no tiene equivalente
    editable o sus datos no encajan (el recurso se exporta entonces como HTML)."""
    mapper = MAPPERS.get(template_key or "")
    if mapper is None or not isinstance(data, Mapping):
        return None
    try:
        activity = mapper(data)
    except (KeyError, TypeError, ValueError, AttributeError):
        return None
    return activity if len(_items(activity)) >= _MIN_ITEMS[activity.kind] else None


def phase_activity(phase: Mapping) -> Activity | None:
    """Actividad de una fase preparada para exportar (`phase["activity"]` =
    {"template", "data", ...}, presente sólo si los datos siguen sincronizados)."""
    record = phase.get("activity")
    if not isinstance(record, Mapping):
        return None
    return activity_from_template(record.get("template"), record.get("data"))


__all__ = [
    "MAPPERS",
    "Activity",
    "BlankSentence",
    "Choice",
    "ChoiceQuestion",
    "Crossword",
    "CrosswordEntry",
    "FillBlanks",
    "MatchPair",
    "Matching",
    "MultipleChoice",
    "TrueFalse",
    "TrueFalseStatement",
    "activity_from_template",
    "content_hash",
    "crossword_word",
    "phase_activity",
]
