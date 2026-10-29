"""iDevices nativos de eXeLearning para las actividades editables de una OVA.

El `.elpx` mete cada recurso como iframe en un iDevice `text`; las fases con una
actividad editable sincronizada (ver `scorm.domain.activities`) se exportan en su
lugar como el iDevice equivalente de eXe, que el docente puede seguir editando:

| actividad neutral   | iDevice eXe                        | patrón de contenido          |
|---------------------|------------------------------------|------------------------------|
| opción múltiple     | `quick-questions-multiple-choice`  | DataGame cifrado en htmlView |
| completar espacios  | `complete`                         | DataGame cifrado en htmlView |
| relacionar          | `relate`                           | DataGame JSON en htmlView    |
| crucigrama          | `crossword`                        | DataGame cifrado en htmlView |
| verdadero/falso     | `trueorfalse`                      | JSON en jsonProperties       |

Formato (documentación del formato `.elpx` de eXe, `doc/elpx-format/idevices/`):
los juegos guardan su estado en un `<div class="<juego>-DataGame js-hidden">`
dentro de `htmlView`; según el iDevice va como JSON o «cifrado» (cada unidad
UTF-16 XOR 146 y después `escape()` de JavaScript). Son iDevices de tipo `html`:
su editor sólo lee `htmlView` y eXe escribe `<jsonProperties>` vacío (la plantilla
de campos del iDevice `text` que traen los proyectos antiguos la descarta el
importador por obsoleta). `trueorfalse` es de tipo `json`: su estado va en
`jsonProperties` y eXe regenera el `htmlView` a partir de él.

Implementación propia a partir de la documentación del formato y de proyectos de
ejemplo; no reutiliza código de eXeLearning (AGPL).
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from html import escape

from scorm.domain.activities import (
    Activity,
    Crossword,
    FillBlanks,
    Matching,
    MultipleChoice,
    TrueFalse,
    crossword_word,
)

# Caracteres que `escape()` de JavaScript deja tal cual.
_JS_SAFE = frozenset("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@*_+-./")
_XOR_KEY = 146
_ESCAPED = re.compile(r"%u([0-9A-Fa-f]{4})|%([0-9A-Fa-f]{2})")


def js_escape(text: str) -> str:
    """`escape()` de JavaScript: %XX para unidades < 256 y %uXXXX para el resto."""
    out: list[str] = []
    raw = (text or "").encode("utf-16-le", "surrogatepass")
    for i in range(0, len(raw), 2):
        unit = raw[i] | (raw[i + 1] << 8)
        ch = chr(unit)
        if ch in _JS_SAFE:
            out.append(ch)
        elif unit < 256:
            out.append(f"%{unit:02X}")
        else:
            out.append(f"%u{unit:04X}")
    return "".join(out)


def js_unescape(text: str) -> str:
    """Inversa de `js_escape` (`unescape()` de JavaScript)."""
    buf = bytearray()
    i = 0
    while i < len(text):
        match = _ESCAPED.match(text, i)
        if match:
            buf += int(match.group(1) or match.group(2), 16).to_bytes(2, "little")
            i = match.end()
        else:
            buf += text[i].encode("utf-16-le", "surrogatepass")
            i += 1
    return buf.decode("utf-16-le", "surrogatepass")


def _xor_units(text: str) -> str:
    raw = text.encode("utf-16-le", "surrogatepass")
    units = (((raw[i] | (raw[i + 1] << 8)) ^ _XOR_KEY) for i in range(0, len(raw), 2))
    return b"".join(u.to_bytes(2, "little") for u in units).decode("utf-16-le", "surrogatepass")


def encrypt_game(data: dict) -> str:
    """Estado de un juego tal como lo guarda eXe en su DataGame «cifrado»."""
    return js_escape(_xor_units(json.dumps(data, ensure_ascii=False, separators=(",", ":"))))


def decrypt_game(payload: str) -> dict:
    return json.loads(_xor_units(js_unescape(payload.strip())))


# --- piezas comunes ---------------------------------------------------------------

# Textos de interfaz de los juegos (eXe los guarda con el estado; al reeditar el
# iDevice el editor los reemplaza por los de su idioma).
GAME_MESSAGES: dict[str, str] = {
    "msgActityComply": "Ya realizaste esta actividad.",
    "msgAllQuestions": "¡Respondiste todas las preguntas!",
    "mgsAllQuestions": "¡Respondiste todas las preguntas!",
    "msgAnswer": "Responder",
    "msgAudio": "Audio",
    "msgAuthor": "Autoría",
    "msgCheck": "Comprobar",
    "msgClose": "Cerrar",
    "msgClue": "¡Muy bien! La pista es:",
    "msgCodeAccess": "Código de acceso",
    "msgCool": "¡Bien!",
    "msgCorrect": "Correcto",
    "msgEndGameM": "Terminaste el juego. Tu puntuación es %s.",
    "msgEndGameScore": "Empieza la actividad antes de guardar la puntuación.",
    "msgEndScore": "Tuviste %s aciertos y %d errores.",
    "msgEndTime": "Se acabó el tiempo.",
    "msgEnterCode": "Escribe el código de acceso",
    "msgErrorCode": "El código de acceso no es correcto",
    "msgErrors": "Errores",
    "msgExitFullScreen": "Salir de pantalla completa",
    "msgFailures": "¡No es correcto! | ¡Incorrecto! | ¡Inténtalo otra vez! | ¡Casi! | ¡Error!",
    "msgFalse": "Falso",
    "msgFeedback": "Retroalimentación",
    "msgFullScreen": "Pantalla completa",
    "msgGameEnd": "Completaste la actividad",
    "msgGameOver": "¡Fin del juego!",
    "msgHide": "Ocultar",
    "msgHits": "Aciertos",
    "msgHorizontals": "Horizontales",
    "msgIncorrect": "Incorrecto",
    "msgIndicateWord": "Escribe una palabra o expresión",
    "msgInformation": "Información",
    "msgInformationLooking": "¡Muy bien! Esta es la información que buscabas",
    "msgKO": "Incorrecto",
    "msgLive": "Vida",
    "msgLoading": "Cargando, espera por favor…",
    "msgLoseLive": "Perdiste una vida",
    "msgLoseT": "Perdiste puntos",
    "msgLostLives": "¡Perdiste todas tus vidas!",
    "msgMaximize": "Maximizar",
    "msgMinimize": "Minimizar",
    "msgMoveOne": "Saltar",
    "msgNewGame": "Pulsa aquí para jugar otra vez",
    "msgNoImage": "Pregunta sin imagen",
    "msgNotNetwork": "Esta actividad necesita conexión a internet.",
    "msgNumQuestions": "Número de preguntas",
    "msgOk": "Correcto",
    "msgOnlySave": "Sólo puedes guardar una vez",
    "msgOnlySaveAuto": "Tu puntuación se guarda después de cada pregunta. Sólo puedes jugar una vez.",
    "msgOnlySaveScore": "¡Sólo puedes guardar la puntuación una vez!",
    "msgOption": "Opción",
    "msgOrders": "Ordena todas las respuestas",
    "msgPlayAgain": "Jugar otra vez",
    "msgPlaySeveralTimes": "Puedes realizar esta actividad las veces que quieras",
    "msgPlayStart": "Pulsa aquí para empezar",
    "msgPoints": "puntos",
    "msgQuestion": "Pregunta",
    "msgReady": "¿Listo?",
    "msgReboot": "Volver a intentar",
    "msgReply": "Responder",
    "msgRequiredAccessKey": "Necesitas el código de acceso",
    "msgRestart": "Reiniciar",
    "msgRickText": "Texto enriquecido",
    "msgSaveAuto": "Tu puntuación se guarda automáticamente después de cada pregunta.",
    "msgScore": "Puntuación",
    "msgScoreScorm": "La puntuación no se puede guardar: esta página no forma parte de un paquete SCORM.",
    "msgSelectWord": "Elige una palabra para ver su definición",
    "msgSeveralScore": "Puedes guardar la puntuación las veces que quieras",
    "msgShow": "Mostrar",
    "msgShowBack": "Mostrar u ocultar la imagen de fondo",
    "msgShowDefinitions": "Mostrar u ocultar las definiciones",
    "msgShowSolution": "Ver las soluciones",
    "msgSolution": "Solución",
    "msgSolutionWord": "Palabra",
    "msgStartGame": "Pulsa aquí para empezar",
    "msgSubmit": "Enviar",
    "msgSuccesses": "¡Correcto! | ¡Excelente! | ¡Muy bien! | ¡Perfecto! | ¡Genial!",
    "msgSuccessfulActivity": "Actividad superada. Puntuación: %s",
    "msgSuggestion": "Sugerencia",
    "msgTime": "Tiempo por pregunta",
    "msgTrue": "Verdadero",
    "msgTry": "¡Inténtalo otra vez!",
    "msgTryAgain": "Necesitas al menos un %s% de aciertos para ver la información. Vuelve a intentarlo.",
    "msgUncompletedActivity": "Actividad sin completar",
    "msgUnsuccessfulActivity": "Actividad no superada. Puntuación: %s",
    "msgUseFulInformation": "e información útil",
    "msgVerticals": "Verticales",
    "msgVideoIntro": "Video de introducción",
    "msgWeight": "Peso",
    "msgWrote": "Escribe la palabra correcta y pulsa Responder.",
    "msgYouHas": "Tienes %1 aciertos y %2 errores",
    "msgYouLastScore": "La última puntuación guardada es",
    "msgYouScore": "Tu puntuación",
}

_ITINERARY = {
    "showClue": False,
    "clueGame": "",
    "percentageClue": 40,
    "showCodeAccess": False,
    "codeAccess": "",
    "messageCodeAccess": "",
}

_SCORM = {
    "isScorm": 0,
    "textButtonScorm": "Guardar la puntuación",
    "repeatActivity": True,
    "weighted": 100,
    "evaluation": False,
    "evaluationID": "",
}

_NO_SUPPORT = "Tu navegador no es compatible con esta actividad."


@dataclass(frozen=True, slots=True)
class NativeIdevice:
    """Lo que va en un `<odeComponent>`: tipo, `htmlView` y `jsonProperties`
    (vacío en los iDevices de tipo `html`)."""

    type_name: str
    html_view: str
    json_properties: dict


def _h(text: str) -> str:
    return escape(text or "", quote=False)


def _p(text: str) -> str:
    return f"<p>{_h(text)}</p>" if text else ""


def _instructions_html(activity: Activity) -> str:
    return _p(activity.instructions) or _p(activity.title)


def _evaluation_div(idevice_id: str) -> str:
    return (
        f'<div class="game-evaluation-ids js-hidden" data-id="{idevice_id}" '
        'data-evaluationb="false" data-evaluationid=""></div>'
    )


def _text_after(activity: Activity, prefix: str) -> str:
    return f'<div class="{prefix}-extra-content">{_p(activity.closing)}</div>' if activity.closing else ""


# --- un builder por actividad ---------------------------------------------------------


def multiple_choice_game(activity: MultipleChoice, idevice_id: str) -> dict:
    letters = "ABCDEFGH"
    questions = [
        {
            "typeSelect": 0,
            "type": 0,
            # Índice de la lista de tiempos de eXe (15 s, 30 s, 1 min, 3 min…): 1 minuto.
            "time": 2,
            "numberOptions": len(q.choices),
            "url": "",
            "x": 0,
            "y": 0,
            "author": "",
            "alt": "",
            "soundVideo": 1,
            "imageVideo": 1,
            "iVideo": 0,
            "fVideo": 0,
            "eText": "",
            "quextion": q.prompt,
            "options": [c.text for c in q.choices],
            "solution": letters[q.correct_index],
            "silentVideo": 0,
            "tSilentVideo": 0,
            "solutionWord": "",
            "solutionQuestion": "",
            "audio": "",
            "hit": -1,
            "error": -1,
            "msgHit": q.feedback_correct,
            "msgError": q.feedback_incorrect,
            "customScore": 1,
            "percentageShow": 35,
        }
        for q in activity.questions
    ]
    return {
        "asignatura": "",
        "author": "",
        "authorVideo": "",
        "typeGame": "Selecciona",
        "endVideo": 0,
        "idVideo": "",
        "startVideo": 0,
        "instructionsExe": js_escape(_instructions_html(activity)),
        "instructions": activity.instructions,
        "showMinimize": False,
        "optionsRamdon": False,
        "answersRamdon": True,
        "showSolution": True,
        "timeShowSolution": 3,
        "useLives": False,
        "numberLives": 3,
        "itinerary": dict(_ITINERARY),
        "selectsGame": questions,
        **_SCORM,
        "title": activity.title,
        "customScore": False,
        "textAfter": js_escape(_p(activity.closing)),
        "textFeedBack": "",
        "gameMode": 0,
        "feedBack": False,
        "percentajeFB": 100,
        "order": 0,
        # Con mensajes propios, cada pregunta muestra su retroalimentación al responder.
        "customMessages": True,
        "version": 3.1,
        "percentajeQuestions": 100,
        "audioFeedBach": False,
        "modeBoard": False,
        "id": idevice_id,
        "globalTime": 0,
        "msgs": dict(GAME_MESSAGES),
    }


def _multiple_choice(activity: MultipleChoice, idevice_id: str) -> NativeIdevice:
    game = multiple_choice_game(activity, idevice_id)
    html = (
        '<div class="selecciona-IDevice">'
        f"{_evaluation_div(idevice_id)}"
        f'<div class="selecciona-instructions SLCNP-instructions">{_instructions_html(activity)}</div>'
        '<div class="selecciona-version js-hidden">3.1</div>'
        '<div class="selecciona-feedback-game"></div>'
        f'<div class="selecciona-DataGame js-hidden">{encrypt_game(game)}</div>'
        f"{_text_after(activity, 'selecciona')}"
        f'<div class="selecciona-bns js-hidden">{_NO_SUPPORT}</div>'
        "</div>"
    )
    return NativeIdevice(
        "quick-questions-multiple-choice", html, {}
    )


def _blank_word(answer: str) -> str:
    # `@@` delimita el hueco en eXe y `|` separa respuestas alternativas.
    return answer.replace("@@", "").replace("|", "/").strip()


def complete_text_html(activity: FillBlanks) -> str:
    """Texto con los huecos marcados como `@@respuesta@@` (una oración por párrafo)."""
    return "".join(
        "<p>"
        + " ".join(
            part
            for part in (_h(s.before), f"@@{_h(_blank_word(s.answer))}@@", _h(s.after))
            if part
        )
        + "</p>"
        for s in activity.sentences
    )


def complete_game(activity: FillBlanks, idevice_id: str) -> dict:
    return {
        "typeGame": "Completa",
        "instructions": _instructions_html(activity),
        "textText": js_escape(complete_text_html(activity)),
        "showMinimize": False,
        "itinerary": dict(_ITINERARY),
        "caseSensitive": False,
        **_SCORM,
        "textFeedBack": "",
        "textAfter": js_escape(_p(activity.closing)),
        "feedBack": False,
        "percentajeFB": 100,
        "version": 1,
        # Como la plantilla: no importan mayúsculas ni tildes.
        "estrictCheck": False,
        "wordsSize": False,
        "time": 0,
        "type": 0,
        "wordsErrors": "",
        "attempsNumber": 2,
        "percentajeError": 20,
        "showSolution": True,
        "wordsLimit": False,
        "hasBack": False,
        "urlBack": "",
        "authorBackImage": "",
        "fontColor": "#000000",
        "id": idevice_id,
        "msgs": dict(GAME_MESSAGES),
    }


def _complete(activity: FillBlanks, idevice_id: str) -> NativeIdevice:
    game = complete_game(activity, idevice_id)
    html = (
        '<div class="completa-IDevice">'
        f"{_evaluation_div(idevice_id)}"
        '<div class="completa-feedback-game"></div>'
        f'<div class="completa-instructions gameQP-instructions">{_instructions_html(activity)}</div>'
        f'<div class="completa-DataGame js-hidden">{encrypt_game(game)}</div>'
        f'<div class="completa-text-game js-hidden">{complete_text_html(activity)}</div>'
        f"{_text_after(activity, 'completa')}"
        f'<div class="cmpt-bns js-hidden">{_NO_SUPPORT}</div>'
        "</div>"
    )
    return NativeIdevice("complete", html, {})


def relate_game(activity: Matching, idevice_id: str) -> dict:
    cards = [
        {
            "url": "",
            "x": 0,
            "y": 0,
            "author": "",
            "alt": "",
            "audio": "",
            "color": "#000000",
            "backcolor": "#ffffff",
            "eText": pair.term,
            "urlBk": "",
            "xBk": 0,
            "yBk": 0,
            "authorBk": "",
            "altBk": "",
            "audioBk": "",
            "colorBk": "#000000",
            "backcolorBk": "#ffffff",
            "eTextBk": pair.definition,
        }
        for pair in activity.pairs
    ]
    return {
        "typeGame": "Relaciona",
        "author": "",
        "randomCards": True,
        "instructions": _instructions_html(activity),
        "showMinimize": False,
        "itinerary": dict(_ITINERARY),
        "cardsGame": cards,
        **_SCORM,
        "textAfter": js_escape(_p(activity.closing)),
        "version": 2,
        "percentajeCards": 100,
        "type": 0,
        "showSolution": True,
        "timeShowSolution": 3,
        "time": 0,
        "id": idevice_id,
        "msgs": dict(GAME_MESSAGES),
    }


def _relate(activity: Matching, idevice_id: str) -> NativeIdevice:
    game = relate_game(activity, idevice_id)
    # `relate` guarda el JSON sin cifrar y lo lee con `.text()`: se escapa como texto HTML.
    payload = _h(json.dumps(game, ensure_ascii=False, separators=(",", ":")))
    html = (
        '<div class="relaciona-IDevice">'
        f'<div class="relaciona-instructions gameQP-instructions">{_instructions_html(activity)}</div>'
        f'<div class="relaciona-DataGame js-hidden">{payload}</div>'
        f"{_evaluation_div(idevice_id)}"
        f"{_text_after(activity, 'relaciona')}"
        f'<div class="relaciona-bns js-hidden">{_NO_SUPPORT}</div>'
        "</div>"
    )
    return NativeIdevice("relate", html, {})


def crossword_game(activity: Crossword, idevice_id: str) -> dict:
    words = [
        {
            "word": crossword_word(e.answer),
            "definition": e.clue,
            "x": 0,
            "y": 0,
            "author": "",
            "alt": "",
            "url": "",
            "audio": "",
            "percentageShow": 35,
        }
        for e in activity.entries
    ]
    return {
        "typeGame": "Crucigrama",
        "instructions": _instructions_html(activity),
        "showMinimize": False,
        "showSolution": True,
        "itinerary": dict(_ITINERARY),
        "wordsGame": words,
        **_SCORM,
        "hasBack": False,
        "urlBack": "",
        "textFeedBack": "",
        "textAfter": js_escape(_p(activity.closing)),
        "caseSensitive": False,
        "tilde": False,
        "feedBack": False,
        "percentajeFB": 100,
        "version": 2,
        "percentajeQuestions": "100",
        "difficulty": "100",
        "time": "0",
        "authorBackImage": "",
        "id": idevice_id,
        "msgs": dict(GAME_MESSAGES),
    }


def _crossword(activity: Crossword, idevice_id: str) -> NativeIdevice:
    game = crossword_game(activity, idevice_id)
    html = (
        '<div class="crucigrama-IDevice">'
        f"{_evaluation_div(idevice_id)}"
        # versión > 0: el juego descifra el DataGame.
        '<div class="crucigrama-version js-hidden">1</div>'
        '<div class="crucigrama-feedback-game"></div>'
        f'<div class="crucigrama-instructions gameQP-instructions">{_instructions_html(activity)}</div>'
        f'<div class="crucigrama-DataGame js-hidden">{encrypt_game(game)}</div>'
        f"{_text_after(activity, 'crucigrama')}"
        f'<div class="crucigrama-bns js-hidden">{_NO_SUPPORT}</div>'
        "</div>"
    )
    return NativeIdevice("crossword", html, {})


def _true_false(activity: TrueFalse, idevice_id: str) -> NativeIdevice:
    properties = {
        "id": idevice_id,
        "ideviceId": idevice_id,
        "typeGame": "TrueOrFalse",
        "eXeGameInstructions": _instructions_html(activity),
        "eXeIdeviceTextAfter": _p(activity.closing),
        "msgs": dict(GAME_MESSAGES),
        "questionsRandom": False,
        "percentageQuestions": 100,
        "isTest": True,
        "time": 0,
        "questionsGame": [
            {
                "question": _p(s.statement),
                "feedback": _p(s.feedback),
                "suggestion": "",
                "solution": 1 if s.is_true else 0,
            }
            for s in activity.statements
        ],
        **_SCORM,
    }
    # iDevice de tipo `json`: eXe genera la vista a partir de jsonProperties.
    html = (
        '<div class="exe-trueorfalse-container">'
        f"{_evaluation_div(idevice_id)}"
        f'<div class="TOFP-instructions">{_instructions_html(activity)}</div>'
        "</div>"
    )
    return NativeIdevice("trueorfalse", html, properties)


_BUILDERS = {
    MultipleChoice: _multiple_choice,
    FillBlanks: _complete,
    Matching: _relate,
    Crossword: _crossword,
    TrueFalse: _true_false,
}


def native_idevice(activity: Activity, idevice_id: str) -> NativeIdevice:
    return _BUILDERS[type(activity)](activity, idevice_id)
