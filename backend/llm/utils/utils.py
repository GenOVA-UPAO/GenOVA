"""Shared utilities for all phase generation routers."""

import json
import re

from llm.utils.themes import build_design_system

SCORM_JS = (
    'function _scormInit(){if(window.API)window.API.LMSInitialize("")}'
    "function _scormComplete(s){if(window.API){"
    'if(s!=null)window.API.LMSSetValue("cmi.core.score.raw",s);'
    'window.API.LMSSetValue("cmi.core.lesson_status","completed");'
    'window.API.LMSCommit("");window.API.LMSFinish("")}}'
    'window.addEventListener("load",_scormInit)'
)

# Default design system (UPAO color + UPAO design). Injected into every
# HTML-generating prompt that doesn't pass an explicit themed `design_system`.
# Non-Prometheus callers (labs, regen, legacy routers) keep using this default;
# the Prometheus plans pass a per-job themed string via build_design_system().
DESIGN_SYSTEM = build_design_system("upao", "upao")

# Shared course context injected into every generation prompt. GenOVA serves
# any university course (UPAO), so the context fixes the audience and the
# pedagogical bar but never the subject: the topic always comes from the
# user's prompt. (It used to hardcode a Machine Learning course, which pulled
# unrelated topics — circuits, history, biology — toward ML examples.)
CURSO_CONTEXTO = (
    "Recurso para un curso universitario (pregrado, UPAO). Audiencia: estudiantes "
    "universitarios; usa el nivel de profundidad, notación y rigor propios de la "
    "asignatura indicada en el tema (fórmulas, unidades y ejemplos numéricos "
    "cuando el tema lo requiera). Idioma: español. El recurso debe enseñar de "
    "verdad: objetivo de aprendizaje claro, explicación correcta, ejemplos "
    "trabajados paso a paso, práctica con retroalimentación que explique el porqué "
    "y un cierre que consolide. Todo ejemplo, dato, analogía o mecánica debe ser "
    "específico y fiel al tema indicado — nunca genérico ni de otro dominio."
)


def format_contexto_usuario(contexto: str | None) -> str:
    """Wrap retrieved RAG context in a tagged block for prompt injection. Returns
    "" when no context was retrieved (callers concat unconditionally)."""
    if not contexto or not contexto.strip():
        return ""
    return (
        "\n[CONTEXTO_APORTADO_POR_EL_USUARIO]\n"
        "Material de apoyo subido por el estudiante. Úsalo como referencia fiel "
        "siempre que sea coherente con la tarea pedida.\n"
        f"{contexto.strip()}\n"
        "[/CONTEXTO_APORTADO_POR_EL_USUARIO]\n"
    )


_FENCE = re.compile(r"```[a-zA-Z0-9_-]*[ \t]*\n([\s\S]*?)\n?[ \t]*```")
_HTML_START = re.compile(r"<!doctype html|<html[\s>]", re.I)


def strip_markdown(text: str) -> str:
    """Return the payload of an LLM answer, dropping chatter around it.

    Models often wrap the document in a code fence AND add prose before or after
    it ("Here is a self-contained HTML…", "### How it works…"). The fence is
    matched anywhere (not only at the end of the text), and when several fences
    exist the longest one wins — the explanation blocks are short.
    """
    text = text.strip()
    blocks = _FENCE.findall(text)
    if blocks:
        return max(blocks, key=len).strip()
    # Unterminated fence (truncated answer): keep what follows the opener.
    text = (
        re.sub(r"^[\s\S]*?```[a-zA-Z0-9_-]*[ \t]*\n", "", text, count=1) if "```" in text else text
    )
    text = re.sub(r"\s*```\s*$", "", text)
    return text.strip()


def extract_html_document(text: str) -> str:
    """strip_markdown + cut any prose outside <!DOCTYPE html> … </html>."""
    html = strip_markdown(text)
    start = _HTML_START.search(html)
    if start and start.start() > 0:
        html = html[start.start() :]
    end = html.lower().rfind("</html>")
    if end != -1:
        html = html[: end + len("</html>")]
    return html.strip()


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
