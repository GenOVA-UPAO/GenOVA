"""Optional OpenRouter diagram JSON generation, with an Ollama fallback."""

from __future__ import annotations

import json
import os

import httpx

from llm.images.sources.contract import DIAGRAM_SCHEMA
from llm.images.sources.diagram import _matches


def generate_diagram_json(prompt: str, *, model: str | None = None) -> tuple[str, str]:
    """Return raw JSON and the actual model; SVG rendering remains offline.

    A model containing '/' is an OpenRouter ID. A bare name is an Ollama ID.
    Invalid credentials, HTTP errors and invalid structured output fall back locally.
    """
    selected = model or os.getenv("OVA_DIAGRAM_MODEL", "")
    key = os.getenv("OPENROUTER_API_KEY", "")
    if selected and "/" in selected and not key:
        try:
            from llm.clients.clients import _get_provider_key

            key = _get_provider_key("openrouter") or ""
        except Exception:
            key = ""  # Missing database/configuration must not disable the local fallback.
    if selected and "/" in selected and key:
        try:
            response = httpx.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {key}"},
                json={
                    "model": selected,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0,
                    "max_tokens": 3000,
                    "response_format": {
                        "type": "json_schema",
                        "json_schema": {
                            "name": "diagram",
                            "strict": True,
                            "schema": DIAGRAM_SCHEMA,
                        },
                    },
                },
                timeout=90,
            )
            response.raise_for_status()
            raw = response.json()["choices"][0]["message"]["content"]
            if _matches(json.loads(raw), DIAGRAM_SCHEMA):
                return raw, selected
        except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
            pass
    local_model = (
        selected
        if selected and "/" not in selected
        else os.getenv("OVA_LOCAL_LLM_MODEL", "qwen3:8b")
    )
    response = httpx.post(
        os.getenv("OVA_LOCAL_LLM_URL", "http://localhost:11435").rstrip("/") + "/api/chat",
        json={
            "model": local_model,
            "messages": [{"role": "user", "content": prompt}],
            "format": DIAGRAM_SCHEMA,
            "stream": False,
            "think": False,
            "options": {"num_predict": 3000, "temperature": 0},
        },
        timeout=float(os.getenv("OVA_LOCAL_LLM_TIMEOUT", "300")),
    )
    response.raise_for_status()
    return response.json()["message"]["content"], local_model
