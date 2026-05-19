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


def strip_markdown(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json|html)?\s*", "", text)
    text = re.sub(r"\s*```\s*$", "", text)
    return text.strip()


def parse_json(raw: str) -> dict | list:
    cleaned = strip_markdown(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        m = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", cleaned)
        if m:
            return json.loads(m.group(1))
        raise ValueError(f"No valid JSON in response: {cleaned[:80]}")
