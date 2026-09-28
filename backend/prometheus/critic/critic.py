"""Pedagógico evaluator — Crítico (EN-015).

Evalúa cada recurso HTML generado con una rúbrica de 6 criterios y devuelve un
veredicto estructurado.  El resultado guía el bucle Generador-Crítico en runtime.py:
si el veredicto es "revisar", runtime re-genera pasando los problemas como feedback.
Usa "texto" (no "codigo") porque la evaluación es análisis semántico, no código HTML.

El recurso llega como extracto representativo (`prometheus.critic.excerpt`): sin
data-URIs ni HTML constante inyectado server-side, cubriendo head, cuerpo y el
<script> final (donde vive la interactividad).
"""

import json
import re

import structlog

from llm.router import generar_texto
from prometheus.critic.excerpt import build_excerpt

logger = structlog.get_logger(__name__)

_FALLBACK = {"puntaje": 0, "problemas": [], "veredicto": "aceptar"}

# Respuesta JSON con 6 criterios y lista de problemas: medido sobre 10 recursos
# reales, a 512 tokens el 2/10 truncaba (JSON sin cerrar → fallback silencioso
# aceptar/0) y a 1024 el 0/10 (respuestas de 681-3451 chars ≈ <=930 tokens).
_RESPONSE_MAX_TOKENS = 1024

_PROMPT_TMPL = """\
[ROL] Evaluador pedagógico de recursos educativos HTML5.
[FASE_5E] {phase} | [TIPO_RECURSO] {rt} | [CONCEPTO] "{concept}"
[TAREA] Evalúa este recurso según 6 criterios y responde SOLO con JSON válido:
1. Fidelidad pedagógica: ¿enseña el concepto y cumple el objetivo 5E de la fase?
2. Adecuación tipo/formato: ¿el HTML coincide con el tipo de recurso esperado?
3. Interactividad real: ¿hay handlers JS (addEventListener/onclick) donde se requiere?
4. Correctitud: ¿sin errores conceptuales ni datos inventados?
5. Accesibilidad (solo lo falsable sobre el extracto): un único <h1> y jerarquía
   h2/h3 sin saltos; todo <img> con alt descriptivo (no alt="imagen" ni alt=""
   en una imagen con función); <div>/<span> clicable con tabindex + role +
   handler de teclado (Enter/Space); estado/feedback dinámico en un contenedor
   con aria-live; nada transmitido SOLO por color.
6. Originalidad y oficio (originality check): si el concepto se sustituyera por
   otro vecino, ¿funcionaría el diseño igual de bien? Si sí → genérico. Tells
   concretos de página generada: la misma animación de entrada (opacity 0→1 +
   translateY) repetida en cada sección; todo el contenido picado en tarjetas
   idénticas e intercambiables; numeración 01/02/03 sin secuencia real detrás;
   una sola palabra del titular acentuada en otro color/cursiva; texto de
   relleno con pinta de contenido que no enseña nada. NO marcar como defecto
   estas decisiones de marca del proyecto: el badge/eyebrow con el tipo de
   actividad, los emoji como iconos y la paleta UPAO fija.
[VEREDICTO] "revisar" SOLO si el recurso hay que REHACERLO: incumple su función
pedagógica, error grave de contenido, o el tipo exige interactividad y falta.
Si es funcional pero mejorable → "aceptar" con la lista de problemas y un
puntaje honesto. Los cortes del extracto (marcadores […]) y los marcadores
[img/audio/video:data-uri] NO son defectos del recurso.
[RESPUESTA] {{"puntaje": 0-100, "problemas": ["..."], "veredicto": "aceptar"|"revisar"}}
[HTML_EXTRACTO]
{html_excerpt}
[REGLAS_VERIFICABLES]
TECNICA
- <!DOCTYPE html>, lang="es", meta viewport; sin dependencias externas (nada de
  CDN, fonts externas, jquery o bootstrap en <link>/<script src>).
- JS real: handlers con addEventListener (evita onclick= inline); ningún botón
  sin handler, ningún estado sin transición.
- Si el tipo requiere drag & drop: draggable="true" + handlers
  dragstart/dragend/dragover/drop. Si requiere cronómetro: Date.now() o
  setInterval con cleanup.
- Si requiere visualización: SVG real con viewBox + preserveAspectRatio, texto
  <text> con text-anchor, sin truncar.
- Grid reflow móvil (minmax(min, 1fr)); sin width/min-width en px > 320 sin
  media query o clamp(); sin position:fixed que tape contenido.
PROHIBIDO (defecto real)
- lorem ipsum / placeholder copy, secciones vacías, botones muertos,
  múltiples <h1>.
- Texto visible con jerga interna de pipeline (ENGAGE, EXPLORE, EXPLAIN,
  ELABORATE, EVALUATE, "FASE", "Fase 1/2/…").
CONTEXTO DEL EXTRACTO
- Las clases .ova-* y los <upao-*> corresponden a la hoja base y a la librería
  de componentes inyectadas server-side, NO incluidas en el extracto: no las
  cuentes como CSS/JS ausente.
- Las imágenes/audio/video aparecen como [img/audio/video:data-uri NKB]:
  juzga su uso y densidad, no sus bytes.
"""


def _parse_critic_response(response: str) -> dict:
    """Extract JSON from LLM response robustly; fall back to _FALLBACK on any failure."""
    try:
        match = re.search(r"\{.*\}", response, re.DOTALL)
        if not match:
            return dict(_FALLBACK)
        data = json.loads(match.group())
        puntaje = int(data.get("puntaje", 0))
        problemas = list(data.get("problemas", []))
        veredicto = str(data.get("veredicto", "aceptar"))
        if veredicto not in ("aceptar", "revisar"):
            veredicto = "aceptar"
        return {
            "puntaje": max(0, min(100, puntaje)),
            "problemas": problemas,
            "veredicto": veredicto,
        }
    except Exception:  # noqa: BLE001
        logger.debug("critic parse failed; falling back to accept")
        return dict(_FALLBACK)


def critique_resource(
    html: str,
    phase: str,
    rt: int,
    concept: str,
    llm_config: dict,
    enabled_models: list,
    theme: dict,
) -> dict:
    """Return {"puntaje": 0-100, "problemas": [str], "veredicto": "aceptar"|"revisar"}.

    On any LLM or parse failure the function returns the fallback (accept, score 0)
    so it never blocks resource delivery (R4).
    """
    prompt = _PROMPT_TMPL.format(
        phase=phase,
        rt=rt,
        concept=concept,
        html_excerpt=build_excerpt(html),
    )

    try:
        response = generar_texto(
            prompt, "texto", _RESPONSE_MAX_TOKENS, llm_config, enabled_models
        )
    except Exception:  # noqa: BLE001
        logger.exception("critic LLM call failed", phase=phase, resource_type=rt)
        return dict(_FALLBACK)

    return _parse_critic_response(response)
