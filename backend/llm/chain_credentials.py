"""Eslabones de la cadena de modelos que se pueden llamar (tienen clave).

Con solo la clave de OpenRouter, la cadena de `codigo` probaba OpenCode (401),
OpenRouter `:free` (429) y Groq (401 «Invalid API Key») y el recurso fallaba:
cada eslabón sin clave solo costaba un error y el backoff. Ahora se saltan
antes de empezar; con claves la cadena queda idéntica.
"""

from collections.abc import Callable

import structlog

from llm import cassette
from llm.utils.llm_helpers import LLMNoCredentialsError

logger = structlog.get_logger(__name__)


def usable_chain(
    tarea: str,
    chain: list[tuple],
    user_keys: dict[str, str],
    platform_key: Callable[[str], str | None],
) -> list[tuple]:
    """La cadena sin los eslabones cuyo proveedor no tiene clave propia
    (`user_keys`) ni de plataforma (`platform_key`, p. ej. `_get_provider_key`).

    En replay (llm.cassette) no se exige clave: no hay red. Si no queda ningún
    eslabón → `LLMNoCredentialsError` sin llamar a ningún proveedor.
    """
    if cassette.replaying():
        return chain
    has_key: dict[str, bool] = {}
    usable = []
    for entry in chain:
        provider = entry[0]
        if provider not in has_key:
            has_key[provider] = bool(user_keys.get(provider) or platform_key(provider))
        if has_key[provider]:
            usable.append(entry)
        else:
            logger.warning(
                "task skipped: provider without credentials",
                tarea=tarea,
                provider=provider,
                model_id=entry[1],
            )
    if not usable:
        raise LLMNoCredentialsError(
            "Ningún proveedor de la cadena tiene clave configurada "
            f"(tarea={tarea}, proveedores: {sorted(has_key)})"
        )
    return usable
