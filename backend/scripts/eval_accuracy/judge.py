"""Juez de anclaje: ¿la afirmación está soportada por el contexto RAG? (OE2)

El juez usa un modelo **distinto** al generador a propósito: si el mismo modelo
que escribió el recurso juzga su propio contenido, la métrica mide autoconsistencia,
no precisión. Aun así el juicio automático no basta para defender la cifra — hay
que validar una submuestra a mano y reportar el acuerdo (Cohen's kappa).
"""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor

from llm.router import generar_texto_with_model
from llm.utils.utils import parse_json

# Etiquetas del veredicto. Solo `soportada` cuenta en el numerador.
SUPPORTED = "soportada"
CONTRADICTED = "contradicha"
NOT_INFERABLE = "no_inferible"
_VALID = {SUPPORTED, CONTRADICTED, NOT_INFERABLE}

_JUDGE_PROMPT = """\
[ROL] Verificador de anclaje factual. Juzgas SOLO contra las fuentes dadas.
[REGLA] No uses conocimiento propio. Si la afirmación es cierta en el mundo pero
no se deduce de las fuentes, es "no_inferible".

[ETIQUETAS]
- "soportada": las fuentes la afirman o permiten deducirla directamente.
- "contradicha": las fuentes afirman lo contrario.
- "no_inferible": las fuentes no dicen nada al respecto.

[SALIDA] JSON puro sin markdown: {{"veredicto": "...", "evidencia": "cita breve o ''"}}

[FUENTES]
{contexto}

[AFIRMACION]
{afirmacion}"""


def judge_claim(claim: str, contexto: str, model_id: str, provider: str, attempts: int = 3) -> dict:
    """Veredicto de una afirmación. Un fallo del juez devuelve `error` para que la
    afirmación se excluya del denominador en vez de contarse como fallo.

    Reintenta con backoff porque el free tier de Groq corta por rate-limit y el
    reintento interno del router cae en un modelo de OpenRouter que ya no es
    gratuito (404): sin esto se perdía ~1 de cada 4 veredictos.
    """
    prompt = _JUDGE_PROMPT.format(contexto=contexto, afirmacion=claim)
    last_exc = ""
    for attempt in range(attempts):
        try:
            raw = generar_texto_with_model(prompt, model_id, provider, max_tokens=512)
            data = parse_json(raw)
            break
        except Exception as exc:  # noqa: BLE001
            last_exc = str(exc)
            if attempt < attempts - 1:
                time.sleep(2 ** (attempt + 1))
    else:
        return {"claim": claim, "veredicto": None, "evidencia": "", "error": last_exc}
    if not isinstance(data, dict):
        return {"claim": claim, "veredicto": None, "evidencia": "", "error": "respuesta no JSON"}
    veredicto = str(data.get("veredicto", "")).strip().lower()
    if veredicto not in _VALID:
        return {
            "claim": claim,
            "veredicto": None,
            "evidencia": "",
            "error": f"veredicto inválido: {veredicto!r}",
        }
    return {
        "claim": claim,
        "veredicto": veredicto,
        "evidencia": str(data.get("evidencia", ""))[:300],
        "error": None,
    }


def judge_batch(
    claims: list[str],
    contexto: str,
    model_id: str,
    provider: str,
    concurrency: int = 8,
) -> list[dict]:
    """Juzga en paralelo: cada afirmación es una llamada independiente y son
    decenas por OVA, así que en serie la corrida completa tarda minutos por recurso.
    El orden de salida se mantiene igual al de entrada."""
    if not claims:
        return []
    workers = max(1, min(concurrency, len(claims)))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        return list(pool.map(lambda c: judge_claim(c, contexto, model_id, provider), claims))
