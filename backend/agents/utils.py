"""Shared utilities for all phase generation routers."""
import json
import re

SCORM_JS = (
    'function _scormInit(){if(window.API)window.API.LMSInitialize("")}'
    'function _scormComplete(s){if(window.API){'
    'if(s!=null)window.API.LMSSetValue("cmi.core.score.raw",s);'
    'window.API.LMSSetValue("cmi.core.lesson_status","completed");'
    'window.API.LMSCommit("");window.API.LMSFinish("")}}'
    'window.addEventListener("load",_scormInit)'
)

# Shared course context injected into every generation prompt. The project
# targets a single university Machine Learning course, so the audience and
# level are constant — the only variable is the specific ML concept.
CURSO_CONTEXTO = (
    "Recurso para un curso universitario de Machine Learning. Audiencia: "
    "estudiantes en su primer contacto con el tema, sin formación matemática "
    "avanzada. Idioma: español. El recurso debe ser pedagógicamente sólido y "
    "técnicamente correcto, pero con lenguaje accesible. Todo ejemplo, dato, "
    "analogía o mecánica debe ser específico y fiel al concepto de ML "
    "indicado — nunca genérico ni de otro subtema."
)


def strip_markdown(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json|html)?\s*", "", text)
    text = re.sub(r"\s*```\s*$", "", text)
    return text.strip()


def parse_json(raw: str) -> dict | list:
    """Tolerant JSON parser for LLM output.

    Strategy: strip code fences, try direct parse, then walk balanced bracket
    spans from the first `{` or `[` and try each one. Returns the first valid
    parse; raises ValueError if nothing parses.
    """
    cleaned = strip_markdown(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    for opener, closer in (("{", "}"), ("[", "]")):
        start = cleaned.find(opener)
        while start != -1:
            depth = 0
            for i in range(start, len(cleaned)):
                c = cleaned[i]
                if c == opener:
                    depth += 1
                elif c == closer:
                    depth -= 1
                    if depth == 0:
                        try:
                            return json.loads(cleaned[start : i + 1])
                        except json.JSONDecodeError:
                            break
            start = cleaned.find(opener, start + 1)

    raise ValueError(f"No valid JSON in response: {cleaned[:80]}")
