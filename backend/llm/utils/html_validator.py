"""Inline HTML validation and auto-repair for generated resources.

Validates LLM output against the quality spec used in tests and attempts
to repair common failures (truncation, missing SCORM callbacks) before
the response reaches the client.
"""

import structlog

logger = structlog.get_logger(__name__)

_FORBIDDEN_CDN = [
    "cdn.jsdelivr.net",
    "cdnjs.cloudflare.com",
    "unpkg.com",
    "code.jquery.com",
    "stackpath.bootstrapcdn.com",
    "ajax.googleapis.com",
    "maxcdn.bootstrapcdn.com",
]

_SCORM_TOKENS = ["_scormInit", "_scormComplete", "cmi.core.lesson_status"]

# Minimum char thresholds per (phase, resource_type). If missing, use default.
_MIN_CHARS: dict[tuple[str, int], int] = {
    ("engage", 1): 3000,
    ("engage", 2): 2000,
    ("engage", 3): 1500,
    ("engage", 4): 3000,
    ("engage", 5): 2000,
    ("engage", 6): 1500,
    ("engage", 7): 2000,
    ("engage", 8): 2500,
    ("engage", 9): 3000,
    ("engage", 10): 3000,
    ("explore", 1): 4000,
    ("explore", 2): 3000,
    ("explore", 3): 3000,
    ("explore", 4): 2500,
    ("explore", 5): 2500,
    ("explore", 6): 4000,
    ("explore", 7): 3500,
    ("explore", 8): 3000,
    ("explore", 9): 3500,
    ("explore", 10): 4000,
}
_DEFAULT_MIN = 2000


def validate_html(html: str, phase: str, resource_type: int) -> list[str]:
    """Return a list of failure messages. Empty list = all OK."""
    failures: list[str] = []
    lower = html.lower()

    # Structure checks
    if "<!doctype html>" not in lower:
        failures.append("missing <!DOCTYPE html>")
    if "</html>" not in lower:
        failures.append("missing </html> — likely truncated")
    if "</script>" not in lower and "<script>" in lower:
        failures.append("unclosed <script> — truncated JS")

    # SCORM callbacks
    for token in _SCORM_TOKENS:
        if token not in html:
            failures.append(f"SCORM missing: '{token}'")

    # Minimum length
    threshold = _MIN_CHARS.get((phase, resource_type), _DEFAULT_MIN)
    if len(html) < threshold:
        failures.append(f"too short: {len(html)} < {threshold}")

    # Forbidden external CDN
    for cdn in _FORBIDDEN_CDN:
        if cdn in lower:
            failures.append(f"external CDN: {cdn}")

    return failures
