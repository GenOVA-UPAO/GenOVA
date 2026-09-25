"""Listas de modelos por proveedor pedidas con una clave concreta.

Las usa el refresco del catálogo de plataforma (con la clave de la plataforma) y
el catálogo por usuario (con la clave propia del usuario). A diferencia de los
`_fetch_*` del refresco, estas funciones LANZAN la excepción: quien llama
necesita saber si la clave es inválida o si el proveedor no respondió, para
decírselo al usuario (`classify_error`).

La clave nunca se registra: los mensajes de error de los SDK pueden incluir
parte de ella («Incorrect API key provided: sk-…»), así que solo se anota el
tipo de excepción y el código HTTP.
"""


import httpx
import structlog

from core import openrouter
from core.config import settings

logger = structlog.get_logger(__name__)

_OPENCODE_API = "https://opencode.ai/zen/go/v1"
_HF_MODELS_API = "https://huggingface.co/api/models"
_TIMEOUT_S = 10.0

# Proveedores de texto cuya lista se puede pedir con la clave del usuario.
LISTABLE_PROVIDERS = ("groq", "openrouter", "opencode", "huggingface")

# Códigos de error por proveedor que ve el frontend.
INVALID_KEY = "invalid_key"
RATE_LIMITED = "rate_limited"
UNREACHABLE = "unreachable"
UNKNOWN = "error"


class ProviderListingError(Exception):
    """Fallo simulado con un código HTTP (solo lo usa el modo LLM_FAKE)."""

    def __init__(self, status_code: int | None):
        super().__init__(f"simulated provider failure (status={status_code})")
        self.status_code = status_code


def _status_of(exc: Exception) -> int | None:
    status = getattr(exc, "status_code", None)
    if status is None:
        status = getattr(getattr(exc, "response", None), "status_code", None)
    return status if isinstance(status, int) else None


def classify_error(exc: Exception) -> str:
    """Traduce una excepción de SDK/httpx a un código estable para la UI."""
    status = _status_of(exc)
    if status in (401, 403):
        return INVALID_KEY
    if status == 429:
        return RATE_LIMITED
    if status is not None and status >= 500:
        return UNREACHABLE
    connection_like = type(exc).__name__ in ("APIConnectionError", "APITimeoutError")
    if connection_like or isinstance(exc, (httpx.TransportError, TimeoutError, ConnectionError)):
        return UNREACHABLE
    return UNKNOWN


def log_listing_failure(provider: str, exc: Exception, **context) -> None:
    """Registra un fallo de listado sin el mensaje (puede llevar la clave)."""
    logger.warning(
        "model list fetch failed",
        provider=provider,
        error_type=type(exc).__name__,
        status=_status_of(exc),
        **context,
    )


# Datos de cada modelo de Groq que usa el catálogo (su API los añade al formato
# de OpenAI): con ellos se distinguen los de voz y transcripción de los de texto.
_GROQ_META_FIELDS = ("name", "input_modalities", "output_modalities", "context_length", "context_window")


def list_groq_ids(api_key: str) -> dict[str, dict]:
    """Modelos de Groq: {id: datos}. Un dict se usa como el conjunto de ids de
    antes (`in`, iterar) y además lleva nombre, modalidades y contexto."""
    from groq import Groq

    resp = Groq(api_key=api_key, max_retries=0, timeout=_TIMEOUT_S).models.list()
    out: dict[str, dict] = {}
    for m in resp.data:
        if not m.id:
            continue
        raw = m.model_dump() if hasattr(m, "model_dump") else {}
        out[m.id] = {k: raw[k] for k in _GROQ_META_FIELDS if raw.get(k) is not None}
    return out


def list_opencode_ids(api_key: str) -> set[str]:
    from openai import OpenAI

    client = OpenAI(api_key=api_key, base_url=_OPENCODE_API, max_retries=0, timeout=_TIMEOUT_S)
    return {m.id for m in client.models.list().data if m.id}


def list_huggingface_ids(api_key: str | None = None) -> set[str]:
    """Modelos de texto «warm» en HF Serverless. La lista es pública; con clave
    se manda en la cabecera para que HF la rechace (401) si no es válida."""
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else None
    resp = httpx.get(
        _HF_MODELS_API,
        params={
            "inference": "warm",
            "pipeline_tag": "text-generation",
            "sort": "downloads",
            "limit": "100",
            "full": "false",
        },
        headers=headers,
        timeout=_TIMEOUT_S,
    )
    resp.raise_for_status()
    return {m["id"] for m in resp.json() if m.get("id")}


def check_openrouter_key(api_key: str) -> None:
    """OpenRouter publica su lista sin clave (la trae el refresco de plataforma):
    con la clave del usuario solo hace falta saber si es válida."""
    resp = httpx.get(
        openrouter.api_url("key"),
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=_TIMEOUT_S,
    )
    resp.raise_for_status()


# ── Modo LLM_FAKE ──────────────────────────────────────────────────────────────
# Sin claves reales no se puede ver el catálogo por usuario en local ni en e2e.
# Con LLM_FAKE=1 (nunca en producción) una clave que empieza por «fake-» no sale
# a la red: devuelve una lista fija por proveedor. «fake-invalid…» simula una
# clave rechazada y «fake-down…» un proveedor caído. El resto de claves van a la
# API real, igual que sin LLM_FAKE.
_FAKE_IDS: dict[str, tuple[str, ...]] = {
    "groq": (
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "qwen/qwen3-32b",
        "moonshotai/kimi-k2-instruct",
        "meta-llama/llama-4-scout-17b-16e-instruct",
    ),
    "opencode": ("deepseek-v4-pro", "kimi-k2", "qwen3-coder", "glm-4.6"),
    "huggingface": (
        "meta-llama/Llama-3.1-8B-Instruct",
        "Qwen/Qwen2.5-7B-Instruct",
        "mistralai/Mistral-7B-Instruct-v0.3",
    ),
}


def _is_fake_key(api_key: str) -> bool:
    return bool(settings.llm_fake) and api_key.startswith("fake-")


def _fake_listing(provider: str, api_key: str) -> set[str] | None:
    if api_key.startswith("fake-invalid"):
        raise ProviderListingError(401)
    if api_key.startswith("fake-down"):
        raise ProviderListingError(503)
    if provider == "openrouter":
        return None
    return set(_FAKE_IDS.get(provider, ()))


def list_models_with_key(provider: str, api_key: str) -> set[str] | dict[str, dict] | None:
    """Ids de modelos de `provider` visibles con `api_key` (Groq: {id: datos}).

    `None` significa «la lista es la pública de la plataforma» (OpenRouter): la
    clave es válida pero no cambia qué modelos hay. Lanza si la clave no sirve o
    el proveedor no responde.
    """
    if _is_fake_key(api_key):
        return _fake_listing(provider, api_key)
    if provider == "groq":
        return list_groq_ids(api_key)
    if provider == "opencode":
        return list_opencode_ids(api_key)
    if provider == "huggingface":
        return list_huggingface_ids(api_key)
    if provider == "openrouter":
        check_openrouter_key(api_key)
        return None
    raise ValueError(f"proveedor sin listado de modelos: {provider}")
