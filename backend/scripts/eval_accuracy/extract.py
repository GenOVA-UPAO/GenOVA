"""HTML generado → afirmaciones atómicas verificables (OE2).

El recurso es HTML interactivo: además de las etiquetas hay que descartar el
texto de interfaz (botones, instrucciones de navegación), que no afirma nada
sobre el dominio y contaminaría el denominador de la métrica.
"""

from __future__ import annotations

import re
import time
from html import unescape

from llm.router import generar_texto_with_model
from llm.utils.utils import parse_json

_DROP_BLOCKS = re.compile(r"<(script|style|svg|noscript)\b.*?</\1>", re.DOTALL | re.IGNORECASE)
_TAGS = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")

_EXTRACT_PROMPT = """\
[ROL] Extractor de afirmaciones sobre la materia en un recurso educativo.
[CONCEPTO] {concepto}

[TAREA] Extrae solo las afirmaciones ATÓMICAS SOBRE LA MATERIA: aserciones acerca
del concepto que serían verdaderas o falsas con independencia del recurso, escritas
autocontenidas (sin pronombres sin antecedente) y con las palabras del texto.

[CONSERVA] Definiciones, propiedades, fórmulas, valores, límites, condiciones,
relaciones causales, comparaciones entre métodos, autoría y fechas de algoritmos.

[DESCARTA — NO son afirmaciones sobre la materia]
1. Andamiaje narrativo: empresas, personas, instituciones, lugares o conjuntos de
   datos inventados para ambientar el ejercicio ("FreshCart tiene 5.000 clientes",
   "los docentes de la facultad de X usan…"). Son escenarios didácticos, no
   afirmaciones sobre el tema; el recurso DEBE inventarlos.
2. Texto de interfaz: "haz clic", "siguiente", "arrastra la tarjeta".
3. Títulos sueltos, enunciados de pregunta sin respuesta, felicitaciones,
   instrucciones al estudiante y objetivos de aprendizaje.

[CRITERIO] Si la frase solo es cierta dentro del escenario inventado del recurso,
descártala. Si es una afirmación sobre {concepto} que un libro podría contradecir,
consérvala.

[SALIDA] JSON puro sin markdown: {{"afirmaciones": ["...", "..."]}}
Máximo {max_claims}. Si no hay ninguna sobre la materia devuelve una lista vacía.

[TEXTO]
{texto}"""


def html_to_text(html: str, max_chars: int = 12000) -> str:
    """Texto plano legible del recurso, sin script/style ni etiquetas."""
    if not html:
        return ""
    cleaned = _DROP_BLOCKS.sub(" ", html)
    cleaned = _TAGS.sub(" ", cleaned)
    # Se desescapa DESPUÉS de quitar etiquetas: al revés, un `&lt;script&gt;`
    # escapado se convertiría en etiqueta real y se colaría en el texto.
    cleaned = unescape(cleaned).replace("\xa0", " ")
    return _WS.sub(" ", cleaned).strip()[:max_chars]


def extract_claims(
    html: str,
    model_id: str,
    provider: str,
    max_claims: int = 12,
    concepto: str = "el tema del recurso",
) -> list[str]:
    """Afirmaciones atómicas SOBRE LA MATERIA. Devuelve [] si no hay ninguna o si
    el modelo falla (el recurso queda fuera del denominador, no cuenta como fallo
    de precisión).

    El andamiaje narrativo (empresas y escenarios ficticios) queda fuera a
    propósito: medirlo contra el RAG penalizaba justo lo que un generador de OVAs
    debe inventar, y hacía el umbral inalcanzable por construcción.
    """
    texto = html_to_text(html)
    if len(texto) < 80:
        return []
    prompt = _EXTRACT_PROMPT.format(texto=texto, max_claims=max_claims, concepto=concepto)
    # Reintento con backoff: un corte por rate-limit dejaba el recurso entero sin
    # afirmaciones y lo sacaba de la muestra sin dejar rastro en el resumen.
    for attempt in range(3):
        try:
            raw = generar_texto_with_model(prompt, model_id, provider, max_tokens=2048)
            data = parse_json(raw)
            break
        except Exception:  # noqa: BLE001 — el recurso se salta, no invalida la corrida
            if attempt == 2:
                return []
            time.sleep(2 ** (attempt + 1))
    if not isinstance(data, dict):
        return []
    claims = data.get("afirmaciones")
    if not isinstance(claims, list):
        return []
    out = []
    for c in claims[:max_claims]:
        text = str(c).strip()
        if len(text) >= 15:
            out.append(text)
    return out
