"""Perfiles de selección de modelos, aplicados vía API (como el frontend).

- ``default``   → resetea a los DEFAULTS del sistema (OpenCode+Groq).
- ``openrouter``→ asigna texto+código a modelos OpenRouter reales del catálogo.
- ``custom``    → settings JSON provistos por el CLI.
"""

import json
from dataclasses import dataclass, field

# Candidatos por tarea (se elige el primero que exista en el catálogo full).
_OR_TEXTO = ["meta-llama/llama-3.3-70b-instruct", "meta-llama/llama-3.3-70b-instruct:free"]
_OR_CODIGO = ["deepseek/deepseek-chat-v3.1", "qwen/qwen3-coder", "qwen/qwen3-coder:free"]

# Perfil 'groq': todo en Groq (rápido) — aísla fallos de OpenCode/OpenRouter y
# da un E2E verde veloz para validar materialización + SCORM.
_GROQ = {
    "texto": {"provider": "groq", "model_id": "llama-3.3-70b-versatile"},
    "codigo": {"provider": "groq", "model_id": "llama-3.3-70b-versatile"},
    "orquestador": {"provider": "groq", "model_id": "openai/gpt-oss-120b"},
    "razonamiento": {"provider": "groq", "model_id": "qwen/qwen3-32b"},
}


@dataclass
class AppliedProfile:
    name: str
    settings: dict = field(default_factory=dict)
    enabled: list = field(default_factory=list)
    warnings: list = field(default_factory=list)


def _catalog_has(client, provider: str, model_id: str) -> bool:
    data = client.get("/api/users/me/llm-settings", search=model_id, page_size=100)
    for e in data.get("catalog_full", []):
        if e.get("provider") == provider and e.get("model_id") == model_id:
            return True
    return False


def _first_available(client, provider: str, candidates: list[str]) -> str | None:
    for mid in candidates:
        if _catalog_has(client, provider, mid):
            return mid
    return None


def apply(client, name: str, custom_json: str | None = None) -> AppliedProfile:
    if name == "default":
        client.put("/api/users/me/enabled-models", {"models": []})
        client.put("/api/users/me/llm-settings", {"settings": {}})
        return AppliedProfile(name=name)

    if name == "groq":
        client.put("/api/users/me/enabled-models", {"models": list(_GROQ.values())})
        client.put("/api/users/me/llm-settings", {"settings": _GROQ})
        return AppliedProfile(name=name, settings=_GROQ, enabled=list(_GROQ.values()))

    if name == "openrouter":
        return _apply_openrouter(client)

    if name == "custom":
        if not custom_json:
            raise SystemExit("--profiles custom requiere --llm-config '<json>'")
        settings = json.loads(custom_json)
        enabled = [
            {"provider": v["provider"], "model_id": v["model_id"]}
            for v in settings.values()
            if v.get("provider") and v.get("model_id")
        ]
        client.put("/api/users/me/enabled-models", {"models": enabled})
        client.put("/api/users/me/llm-settings", {"settings": settings})
        return AppliedProfile(name=name, settings=settings, enabled=enabled)

    raise SystemExit(f"perfil desconocido: {name}")


def _apply_openrouter(client) -> AppliedProfile:
    warnings: list[str] = []
    texto = _first_available(client, "openrouter", _OR_TEXTO)
    codigo = _first_available(client, "openrouter", _OR_CODIGO)

    settings: dict = {}
    enabled: list = []
    if texto:
        settings["texto"] = {"provider": "openrouter", "model_id": texto, "timeout_s": 120}
        enabled.append({"provider": "openrouter", "model_id": texto})
    else:
        warnings.append("texto: ningún modelo OpenRouter candidato está en el catálogo")
    if codigo:
        settings["codigo"] = {"provider": "openrouter", "model_id": codigo, "timeout_s": 150}
        enabled.append({"provider": "openrouter", "model_id": codigo})
    else:
        warnings.append("codigo: ningún modelo OpenRouter candidato está en el catálogo")

    if enabled:
        client.put("/api/users/me/enabled-models", {"models": enabled})
    if settings:
        client.put("/api/users/me/llm-settings", {"settings": settings})
    return AppliedProfile(name="openrouter", settings=settings, enabled=enabled, warnings=warnings)
