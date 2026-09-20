"""Chequeo de sintaxis del JS de un recurso (sin ejecutarlo).

El modelo escribe la lógica interactiva (simuladores, quizzes) en <script>.
Un error de sintaxis — típicamente un script cortado al tocar el tope de
tokens — deja el recurso muerto aunque el HTML "se vea" bien: el slider no
calcula, los botones no responden. `html_validator.repair_truncated_html`
cierra la etiqueta pero no puede arreglar el código, así que aquí se detecta
con un motor JS real (QuickJS, compilando con `new Function`) y el mensaje
exacto viaja como defecto al refinador.
"""

import json
import re

import structlog

logger = structlog.get_logger(__name__)

_SCRIPT = re.compile(r"<script(\s[^>]*)?>([\s\S]*?)</script\s*>", re.I)
# Runtime inyectado y snippet SCORM: código propio ya probado, no se revisa.
_SKIP_MARKERS = ("UPAO Components v", "function _scormInit")
_MAX_ERRORS = 3


def _inline_scripts(html: str) -> list[str]:
    scripts = []
    for match in _SCRIPT.finditer(html):
        attrs = (match.group(1) or "").lower()
        body = match.group(2)
        if "src=" in attrs or (
            "type=" in attrs and "javascript" not in attrs and "module" not in attrs
        ):
            continue
        if body.strip() and not any(m in body for m in _SKIP_MARKERS):
            scripts.append(body)
    return scripts


def script_syntax_errors(html: str) -> list[str]:
    """Mensajes 'script N, línea L: SyntaxError …' de los scripts inline rotos."""
    try:
        import quickjs
    except ImportError:
        logger.warning("quickjs not installed; skipping JS syntax check")
        return []

    errors: list[str] = []
    for idx, body in enumerate(_inline_scripts(html), start=1):
        try:
            quickjs.Context().eval("new Function(" + json.dumps(body) + ")")
        except Exception as exc:  # noqa: BLE001 — cualquier fallo de compilación es el hallazgo
            lines = str(exc).splitlines()
            where = re.search(r":(\d+)", lines[1]) if len(lines) > 1 else None
            line = f", línea {where.group(1)}" if where else ""
            errors.append(f"script {idx}{line}: {lines[0] if lines else exc}")
        if len(errors) >= _MAX_ERRORS:
            break
    return errors
