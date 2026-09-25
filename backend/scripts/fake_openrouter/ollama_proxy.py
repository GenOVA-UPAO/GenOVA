"""Chat de texto del OpenRouter simulado: lo responde un modelo local de Ollama.

Cualquier id de modelo («deepseek/deepseek-v4.1-flash», «openai/gpt-…») se
atiende con FAKE_OR_TEXT_MODEL, así la configuración de GenOVA no cambia. Solo
pasan los parámetros que Ollama entiende; los propios de OpenRouter
(«provider», «reasoning», «usage»…) se quitan.
"""

from __future__ import annotations

import os

import httpx

OLLAMA = os.getenv("FAKE_OR_OLLAMA", "http://localhost:11435").rstrip("/")
TEXT_MODEL = os.getenv("FAKE_OR_TEXT_MODEL", "qwen2.5-coder:7b")
# El contexto de Ollama (OLLAMA_CONTEXT_LENGTH) limita prompt + respuesta.
MAX_TOKENS = int(os.getenv("FAKE_OR_MAX_TOKENS", "10000"))
_ALLOWED = ("messages", "temperature", "top_p", "stop", "response_format", "seed", "stream")


def ollama_body(body: dict) -> dict:
    out = {k: body[k] for k in _ALLOWED if k in body}
    out["model"] = TEXT_MODEL
    requested = body.get("max_tokens") or body.get("max_completion_tokens") or MAX_TOKENS
    out["max_tokens"] = min(int(requested), MAX_TOKENS)
    return out


def with_openrouter_fields(data: dict, requested_model: str) -> dict:
    """La respuesta de Ollama con el modelo pedido y un coste 0 como OpenRouter."""
    data["model"] = requested_model
    usage = data.setdefault("usage", {})
    usage["cost"] = 0
    return data


async def complete(body: dict) -> dict:
    async with httpx.AsyncClient(timeout=600) as client:
        resp = await client.post(f"{OLLAMA}/v1/chat/completions", json={**ollama_body(body), "stream": False})
        resp.raise_for_status()
        return with_openrouter_fields(resp.json(), body.get("model") or TEXT_MODEL)


async def stream(body: dict):
    async with (
        httpx.AsyncClient(timeout=600) as client,
        client.stream("POST", f"{OLLAMA}/v1/chat/completions", json={**ollama_body(body), "stream": True}) as resp,
    ):
        async for line in resp.aiter_lines():
            if line:
                yield f"{line}\n\n"
