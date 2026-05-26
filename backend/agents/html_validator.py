"""Inline HTML validation and auto-repair for generated resources.

Validates LLM output against the quality spec used in tests and attempts
to repair common failures (truncation, missing SCORM callbacks) before
the response reaches the client.
"""
import logging
import re

from agents.utils import SCORM_JS

logger = logging.getLogger(__name__)

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
    ("engage", 1): 3000, ("engage", 2): 2000, ("engage", 3): 1500,
    ("engage", 4): 3000, ("engage", 5): 2000, ("engage", 6): 1500,
    ("engage", 7): 2000, ("engage", 8): 2500, ("engage", 9): 3000,
    ("engage", 10): 3000,
    ("explore", 1): 4000, ("explore", 2): 3000, ("explore", 3): 3000,
    ("explore", 4): 2500, ("explore", 5): 2500, ("explore", 6): 4000,
    ("explore", 7): 3500, ("explore", 8): 3000, ("explore", 9): 3500,
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


def repair_truncated_html(html: str) -> str:
    """Best-effort repair of truncated HTML from LLM output.

    Closes open tags and injects SCORM if missing. This is NOT a substitute
    for regeneration — it just prevents completely broken resources.
    """
    repaired = html.rstrip()

    # Close unclosed script tag
    if "<script>" in repaired.lower() and "</script>" not in repaired.lower():
        repaired += "\n</script>"

    # Inject SCORM callbacks if missing
    if "_scormInit" not in repaired:
        repaired = _inject_scorm(repaired)

    # Close body/html
    lower = repaired.lower()
    if "</body>" not in lower:
        repaired += "\n</body>"
    if "</html>" not in lower:
        repaired += "\n</html>"

    return repaired


def _inject_scorm(html: str) -> str:
    """Insert the SCORM JS snippet before the closing </script> or </body>."""
    scorm_block = f"\n<script>{SCORM_JS}</script>\n"
    lower = html.lower()
    # Prefer inserting before </body>
    idx = lower.rfind("</body>")
    if idx != -1:
        return html[:idx] + scorm_block + html[idx:]
    # Fallback: append
    return html + scorm_block


def validate_and_repair(
    html: str, phase: str, resource_type: int
) -> tuple[str, list[str]]:
    """Validate, attempt repair if needed, re-validate. Returns (html, failures).

    If the repaired HTML still fails validation, the failures list will be
    non-empty but the HTML is returned anyway (best effort).
    """
    failures = validate_html(html, phase, resource_type)
    if not failures:
        return html, []

    logger.warning(
        "HTML validation failed for %s/%d (%d issues), attempting repair",
        phase, resource_type, len(failures),
    )

    repaired = repair_truncated_html(html)
    remaining = validate_html(repaired, phase, resource_type)

    if remaining:
        logger.warning(
            "Repair incomplete for %s/%d: %s", phase, resource_type, remaining,
        )
    else:
        logger.info("HTML repair succeeded for %s/%d", phase, resource_type)

    return repaired, remaining
