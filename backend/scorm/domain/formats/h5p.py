"""Paquete H5P (.h5p) con las actividades editables de la OVA.

Un paquete por OVA: el contenido principal es un `H5P.Column` con, por cada fase,
un título (`H5P.AdvancedText`) y su actividad nativa si la fase salió de una
plantilla con equivalente y sus datos siguen sincronizados con el HTML:

| actividad neutral   | librería H5P                                   |
|---------------------|------------------------------------------------|
| opción múltiple     | `H5P.MultiChoice` (una por pregunta)           |
| completar espacios  | `H5P.Blanks`                                   |
| relacionar          | `H5P.DragText` (arrastrar el término a su definición) |
| crucigrama          | `H5P.Blanks` (pista → palabra; ver nota)        |
| verdadero/falso     | `H5P.TrueFalse` (una por afirmación)            |

El resto de recursos (simulaciones, lecturas, videos…) no tiene equivalente H5P:
van como texto que remite al paquete SCORM/web, donde siguen siendo interactivos.

Decisiones:
- **Sin librerías dentro del paquete.** Moodle, WordPress (plugin H5P), Lumi y
  h5p.com instalan las librerías desde el H5P Hub; el paquete sólo declara
  `preloadedDependencies` con las versiones mayor.menor publicadas hoy en el Hub
  (`LIBRARIES`). Incluirlas multiplicaría el tamaño (~5 MB) y fijaría versiones
  viejas en el servidor del docente.
- **Crucigrama como `H5P.Blanks`.** `H5P.Crossword` existe en el Hub (0.5, aún
  0.x), pero `H5P.Column` no lo admite como subcontenido (no está en su lista de
  librerías permitidas), así que el validador de la plataforma lo descartaría.
  Cada pista se convierte en un espacio a completar con la palabra.
"""

from __future__ import annotations

import json
import uuid
from collections.abc import Callable
from html import escape
from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

from core.educational_metadata import EducationalMetadata
from scorm.domain.activities import (
    Activity,
    Crossword,
    FillBlanks,
    Matching,
    MultipleChoice,
    TrueFalse,
    crossword_word,
)
from scorm.domain.resources import PhaseResource, prepare_phase_resources

# (machineName, major, minor): versiones publicadas en el H5P Hub (octubre 2026).
LIBRARIES: dict[str, tuple[str, int, int]] = {
    "column": ("H5P.Column", 1, 18),
    "text": ("H5P.AdvancedText", 1, 1),
    "multichoice": ("H5P.MultiChoice", 1, 16),
    "blanks": ("H5P.Blanks", 1, 14),
    "dragtext": ("H5P.DragText", 1, 10),
    "truefalse": ("H5P.TrueFalse", 1, 8),
}

_CONTENT_TYPE_NAMES = {
    "text": "Text",
    "multichoice": "Multiple Choice",
    "blanks": "Fill in the Blanks",
    "dragtext": "Drag the Words",
    "truefalse": "True/False Question",
}

_SCORE_BAR = "Obtuviste :num de :total puntos"
_CONFIRM_CHECK = {
    "header": "¿Terminar?",
    "body": "¿Seguro que quieres terminar?",
    "cancelLabel": "Cancelar",
    "confirmLabel": "Terminar",
}
_CONFIRM_RETRY = {
    "header": "¿Reintentar?",
    "body": "¿Seguro que quieres volver a intentarlo?",
    "cancelLabel": "Cancelar",
    "confirmLabel": "Confirmar",
}
_A11Y = {
    "a11yCheck": "Comprobar las respuestas. Se marcarán como correctas, incorrectas o sin responder.",
    "a11yShowSolution": "Mostrar la solución. La tarea se marcará con su solución correcta.",
    "a11yRetry": "Reintentar la tarea. Se borrarán todas las respuestas y empezarás de nuevo.",
}


def library_string(key: str) -> str:
    name, major, minor = LIBRARIES[key]
    return f"{name} {major}.{minor}"


def _p(text: str) -> str:
    return f"<p>{escape(text, quote=False)}</p>" if text else ""


class _Column:
    """Acumula los subcontenidos del `H5P.Column` y las librerías usadas."""

    def __init__(self, new_id: Callable[[], str]) -> None:
        self.items: list[dict] = []
        self.used: set[str] = {"column"}
        self._new_id = new_id

    def add(self, key: str, params: dict, title: str, separator: str = "auto") -> None:
        self.used.add(key)
        self.items.append(
            {
                "content": {
                    "library": library_string(key),
                    "params": params,
                    "subContentId": self._new_id(),
                    "metadata": {
                        "contentType": _CONTENT_TYPE_NAMES[key],
                        "license": "U",
                        "title": title[:255] or "Sin título",
                    },
                },
                "useSeparator": separator,
            }
        )

    def text(self, html: str, title: str, separator: str = "auto") -> None:
        self.add("text", {"text": html}, title, separator)


# --- una función por actividad ----------------------------------------------------


def _multichoice(col: _Column, activity: MultipleChoice) -> None:
    total = len(activity.questions)
    for n, q in enumerate(activity.questions, start=1):
        answers = [
            {
                "text": f"<div>{escape(c.text, quote=False)}</div>",
                "correct": c.correct,
                "tipsAndFeedback": {
                    "tip": "",
                    "chosenFeedback": escape(
                        q.feedback_correct if c.correct else q.feedback_incorrect, quote=False
                    ),
                    "notChosenFeedback": "",
                },
            }
            for c in q.choices
        ]
        params = {
            "question": _p(q.prompt),
            "answers": answers,
            "overallFeedback": [{"from": 0, "to": 100}],
            "behaviour": {
                "enableRetry": True,
                "enableSolutionsButton": True,
                "enableCheckButton": True,
                "type": "single",
                "singlePoint": False,
                "randomAnswers": True,
                "showSolutionsRequiresInput": True,
                "confirmCheckDialog": False,
                "confirmRetryDialog": False,
                "autoCheck": False,
                "passPercentage": 100,
                "showScorePoints": True,
            },
            "UI": {
                "checkAnswerButton": "Comprobar",
                "submitAnswerButton": "Enviar",
                "showSolutionButton": "Mostrar solución",
                "tryAgainButton": "Reintentar",
                "tipsLabel": "Mostrar pista",
                "scoreBarLabel": _SCORE_BAR,
                "tipAvailable": "Pista disponible",
                "feedbackAvailable": "Retroalimentación disponible",
                "readFeedback": "Leer retroalimentación",
                "wrongAnswer": "Respuesta incorrecta",
                "correctAnswer": "Respuesta correcta",
                "shouldCheck": "Debía marcarse",
                "shouldNotCheck": "No debía marcarse",
                "noInput": "Responde antes de ver la solución",
                **_A11Y,
            },
            "confirmCheck": _CONFIRM_CHECK,
            "confirmRetry": _CONFIRM_RETRY,
        }
        col.add("multichoice", params, f"Pregunta {n} de {total}")


def _blank_answer(answer: str) -> str:
    # `*` delimita el hueco y `:` introduce una pista en la sintaxis de H5P.Blanks.
    return escape(answer.replace("*", "").replace(":", " ").strip(), quote=False)


def _blank_text(text: str) -> str:
    return escape(text.replace("*", ""), quote=False)


def _blanks_params(instructions: str, questions: list[str]) -> dict:
    return {
        "text": _p(instructions) or "<p>Completa los espacios en blanco.</p>",
        "questions": questions,
        "overallFeedback": [{"from": 0, "to": 100}],
        "showSolutions": "Mostrar solución",
        "tryAgain": "Reintentar",
        "checkAnswer": "Comprobar",
        "submitAnswer": "Enviar",
        "notFilledOut": "Completa todos los espacios para ver la solución",
        "answerIsCorrect": "«:ans» es correcto",
        "answerIsWrong": "«:ans» es incorrecto",
        "answeredCorrectly": "Respuesta correcta",
        "answeredIncorrectly": "Respuesta incorrecta",
        "solutionLabel": "Respuesta correcta:",
        "inputLabel": "Espacio @num de @total",
        "inputHasTipLabel": "Pista disponible",
        "tipLabel": "Pista",
        "behaviour": {
            "enableRetry": True,
            "enableSolutionsButton": True,
            "enableCheckButton": True,
            "autoCheck": False,
            "caseSensitive": False,
            "showSolutionsRequiresInput": True,
            "separateLines": False,
            "confirmCheckDialog": False,
            "confirmRetryDialog": False,
            # La plantilla acepta la respuesta sin importar tildes ni mayúsculas.
            "acceptSpellingErrors": True,
        },
        "confirmCheck": _CONFIRM_CHECK,
        "confirmRetry": _CONFIRM_RETRY,
        "scoreBarLabel": _SCORE_BAR,
        **_A11Y,
        "a11yCheckingModeHeader": "Modo de revisión",
    }


def _blanks(col: _Column, activity: FillBlanks) -> None:
    questions = [
        "<p>"
        + " ".join(
            part
            for part in (
                _blank_text(s.before),
                f"*{_blank_answer(s.answer)}*",
                _blank_text(s.after),
            )
            if part
        )
        + "</p>"
        for s in activity.sentences
    ]
    col.add("blanks", _blanks_params(activity.instructions, questions[:31]), activity.title)


def _crossword(col: _Column, activity: Crossword) -> None:
    questions = [
        f"<p>{_blank_text(e.clue)}: *{crossword_word(e.answer)}*</p>" for e in activity.entries
    ]
    instructions = activity.instructions or "Escribe la palabra que corresponde a cada pista."
    col.add("blanks", _blanks_params(instructions, questions[:31]), activity.title)


def _drag_token(term: str) -> str:
    # En el texto de H5P.DragText `*` marca la palabra, `:` su pista y `\` el feedback.
    return term.replace("*", "").replace(":", " ").replace("\\", " ").strip()


def _dragtext(col: _Column, activity: Matching) -> None:
    lines = [
        f"{escape(p.definition.replace('*', ''), quote=False)} → *{escape(_drag_token(p.term), quote=False)}*"
        for p in activity.pairs
    ]
    params = {
        "taskDescription": _p(activity.instructions)
        or "<p>Arrastra cada término junto a su definición.</p>",
        "textField": "\n".join(lines),
        "overallFeedback": [{"from": 0, "to": 100}],
        "checkAnswer": "Comprobar",
        "submitAnswer": "Enviar",
        "tryAgain": "Reintentar",
        "showSolution": "Mostrar solución",
        "dropZoneIndex": "Zona @index.",
        "empty": "La zona @index está vacía.",
        "contains": "La zona @index contiene el término @draggable.",
        "ariaDraggableIndex": "@index de @count términos.",
        "tipLabel": "Mostrar pista",
        "correctText": "¡Correcto!",
        "incorrectText": "¡Incorrecto!",
        "resetDropTitle": "Vaciar zona",
        "resetDropDescription": "¿Seguro que quieres vaciar esta zona?",
        "grabbed": "Término seleccionado.",
        "cancelledDragging": "Arrastre cancelado.",
        "correctAnswer": "Respuesta correcta:",
        "feedbackHeader": "Retroalimentación",
        "behaviour": {
            "enableRetry": True,
            "enableSolutionsButton": True,
            "enableCheckButton": True,
            "instantFeedback": False,
        },
        "scoreBarLabel": _SCORE_BAR,
        **_A11Y,
    }
    col.add("dragtext", params, activity.title)


def _truefalse(col: _Column, activity: TrueFalse) -> None:
    total = len(activity.statements)
    for n, s in enumerate(activity.statements, start=1):
        params = {
            "question": _p(s.statement),
            "correct": "true" if s.is_true else "false",
            "l10n": {
                "trueText": "Verdadero",
                "falseText": "Falso",
                "score": "Obtuviste @score de @total puntos",
                "checkAnswer": "Comprobar",
                "submitAnswer": "Enviar",
                "showSolutionButton": "Mostrar solución",
                "tryAgain": "Reintentar",
                "wrongAnswerMessage": "Respuesta incorrecta",
                "correctAnswerMessage": "Respuesta correcta",
                "scoreBarLabel": _SCORE_BAR,
                **_A11Y,
            },
            "behaviour": {
                "enableRetry": True,
                "enableSolutionsButton": True,
                "enableCheckButton": True,
                "confirmCheckDialog": False,
                "confirmRetryDialog": False,
                "autoCheck": False,
                "feedbackOnCorrect": s.feedback,
                "feedbackOnWrong": s.feedback,
            },
            "confirmCheck": _CONFIRM_CHECK,
            "confirmRetry": _CONFIRM_RETRY,
        }
        col.add("truefalse", params, f"Afirmación {n} de {total}")


_BUILDERS: dict[type, Callable[[_Column, Activity], None]] = {
    MultipleChoice: _multichoice,
    FillBlanks: _blanks,
    Matching: _dragtext,
    Crossword: _crossword,
    TrueFalse: _truefalse,
}


def _add_resource(col: _Column, resource: PhaseResource) -> None:
    activity = resource.activity
    if activity is None:
        col.text(
            f"<h2>{escape(resource.label, quote=False)}</h2>"
            "<p>Este recurso interactivo no tiene equivalente editable en H5P. "
            "Úsalo desde la OVA exportada en formato SCORM o Web.</p>",
            resource.label,
            separator="enabled",
        )
        return
    intro = f"<h2>{escape(resource.label, quote=False)}</h2>"
    if activity.title and activity.title != resource.label:
        intro += f"<h3>{escape(activity.title, quote=False)}</h3>"
    col.text(intro, resource.label, separator="enabled")
    _BUILDERS[type(activity)](col, activity)
    if activity.closing:
        col.text(_p(activity.closing), f"{resource.label}: cierre", separator="disabled")


def build_h5p_content(
    phases: list[dict] | None, new_id: Callable[[], str] | None = None
) -> tuple[dict, set[str]]:
    """`content/content.json` del `H5P.Column` y las claves de `LIBRARIES` usadas."""
    col = _Column(new_id or (lambda: str(uuid.uuid4())))
    for resource in prepare_phase_resources(phases):
        _add_resource(col, resource)
    return {"content": col.items}, col.used


def build_h5p_json(course_title: str, used: set[str], metadata: EducationalMetadata | None = None) -> dict:
    meta = metadata or EducationalMetadata()
    licenses = {
        "CC BY 4.0": "CC BY", "CC BY-SA 4.0": "CC BY-SA",
        "CC BY-NC 4.0": "CC BY-NC", "CC BY-NC-SA 4.0": "CC BY-NC-SA",
        "CC BY-ND 4.0": "CC BY-ND", "CC BY-NC-ND 4.0": "CC BY-NC-ND",
        "CC0 1.0": "CC0", "Todos los derechos reservados": "C",
    }
    deps = [
        {"machineName": name, "majorVersion": major, "minorVersion": minor}
        for key, (name, major, minor) in LIBRARIES.items()
        if key in used
    ]
    return {
        "title": (course_title or "OVA GenOVA")[:255],
        "language": meta.language,
        "defaultLanguage": meta.language,
        "mainLibrary": LIBRARIES["column"][0],
        "embedTypes": ["iframe"],
        "license": licenses[meta.license],
        **({"licenseVersion": "4.0"} if meta.license.startswith("CC BY") else {}),
        "authors": [{"name": meta.author, "role": "Author"}] if meta.author else [],
        "preloadedDependencies": deps,
    }


def build_h5p_bytes(
    course_title: str = "OVA GenOVA",
    module_title: str = "Objeto Virtual de Aprendizaje",
    phases: list[dict] | None = None,
    *,
    metadata: EducationalMetadata | None = None,
    theme: str = "upao",
) -> bytes:
    # H5P aplica el estilo de la plataforma anfitriona, no CSS del paquete.
    content, used = build_h5p_content(phases)
    manifest = build_h5p_json(course_title, used, metadata)
    for item in content["content"]:
        item["content"]["metadata"].update({
            key: manifest[key] for key in ("license", "licenseVersion", "authors") if key in manifest
        })
    buffer = BytesIO()
    with ZipFile(buffer, mode="w", compression=ZIP_DEFLATED) as zip_file:
        zip_file.writestr("h5p.json", json.dumps(manifest, ensure_ascii=False))
        zip_file.writestr("content/content.json", json.dumps(content, ensure_ascii=False))
    return buffer.getvalue()
