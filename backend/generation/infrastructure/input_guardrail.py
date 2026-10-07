"""Chequeo de entrada del prompt ANTES de crear el job.

Una sola llamada a `llm.router.generar_texto` cuando hace falta el modelo
(moderación configurada y/o área temática). Nunca loguea el prompt completo
en un rechazo de moderación: solo motivo + user_id.

No se pasa `deadline` a generar_texto: el router corta la cadena si quedan
< 20 s de presupuesto (pensado para recursos 5E). Aquí el tope es timeout_s.
"""

from __future__ import annotations

import json
import threading
import time
from uuid import UUID

import structlog

from generation.domain.guardrails import (
    LlmVerdict,
    evaluate_input,
    fold_text,
    parse_classifier_response,
    parse_moderation_model,
    raise_if_blocked,
)
from generation.infrastructure import guardrails_store

logger = structlog.get_logger(__name__)

# Tope corto: el chequeo va dentro de POST /api/jobs. Si el modelo tarda más, se
# abre (fail-open, la política de siempre) en vez de bloquear la petición.
_LLM_TIMEOUT_S = 4
_CACHE_TTL_S = 600.0
_CACHE_MAX = 256
_LLM_MAX_TOKENS = 120

_CLASSIFIER_PROMPT = """\
Eres un clasificador binario de un generador educativo. Responde SOLO un JSON:
{{"language":"ok"|"block","topic":"ok"|"block"}}

Reglas:
- language=block solo por insultos o contenido sexual explícito. No bloquees
  vocabulario histórico, médico o político (p.ej. esclavitud, Guerra Civil).
- topic=block solo si el prompt NO PUEDE interpretarse razonablemente dentro del
  área: {area}
  El área orienta todos los OVAs: un término ambiguo o genérico que tiene sentido
  en el área se permite (con el área «Sistemas y gestión de base de datos»:
  «Árboles» = índices B-tree, «Normalización», «Índices», «Modelos», «Regresión»,
  «Seguridad» → ok). Bloquea solo lo que no tiene lectura posible en el área
  (con esa misma área: «Fotosíntesis», «La Revolución Francesa» → block).
- Si un eje no aplica, pon "ok" en ese eje.

Prompt del usuario:
{prompt}
"""


def _fake_classifier(prompt: str, area: str) -> str:
    """Clasificador determinista de LLM_FAKE=1 (sin red): el prompt está en el área
    si comparte alguna palabra de 4+ letras con ella; si no, topic=block. El
    lenguaje siempre es ok (la lista de términos ya actúa antes como suelo)."""
    words = {w for w in fold_text(area).split() if len(w) >= 4}
    text = fold_text(prompt)
    in_area = not words or any(w in text for w in words)
    return json.dumps({"language": "ok", "topic": "ok" if in_area else "block"})


_cache: dict[tuple, tuple[float, LlmVerdict]] = {}
_cache_lock = threading.Lock()


def _cache_key(prompt: str, area: str, model: tuple[str, str] | None, topic_on: bool) -> tuple:
    return (" ".join(fold_text(prompt).split()), " ".join(fold_text(area).split()), model, topic_on)


def _cache_get(key: tuple) -> LlmVerdict | None:
    with _cache_lock:
        hit = _cache.get(key)
        if hit is None:
            return None
        if time.monotonic() - hit[0] > _CACHE_TTL_S:
            _cache.pop(key, None)
            return None
        return hit[1]


def _cache_put(key: tuple, verdict: LlmVerdict) -> None:
    with _cache_lock:
        if len(_cache) >= _CACHE_MAX:
            _cache.pop(next(iter(_cache)), None)
        _cache[key] = (time.monotonic(), verdict)


def clear_verdict_cache() -> None:
    with _cache_lock:
        _cache.clear()


class InputGuardrailChecker:
    """Adaptador: lee PlatformConfig, opcionalmente llama al LLM, decide."""

    def assert_allowed(self, prompt: str, user_id: UUID) -> None:
        cfg = guardrails_store.runtime_settings()
        topic_on = bool(cfg["topic_enabled"] and cfg["topic_area"])
        moderation_on = bool(cfg["moderation_enabled"])
        if not topic_on and not moderation_on:
            return

        # Lista como suelo: si ya hay hit, no se gasta el modelo ni se crea el job.
        if moderation_on:
            listed = evaluate_input(
                prompt,
                topic_enabled=False,
                topic_area="",
                moderation_enabled=True,
                terms=cfg["terms"],
                llm=None,
            )
            if not listed.allowed:
                logger.info(
                    "guardrail rejected prompt",
                    user_id=str(user_id),
                    reason=listed.code,
                )
                raise_if_blocked(listed)

        model = parse_moderation_model(cfg["moderation_model"]) if moderation_on else None
        need_llm = topic_on or (moderation_on and model is not None)
        llm = self._classify(prompt, cfg["topic_area"], need_llm, model, topic_on, user_id)

        verdict = evaluate_input(
            prompt,
            topic_enabled=topic_on,
            topic_area=cfg["topic_area"],
            moderation_enabled=moderation_on,
            terms=cfg["terms"],
            llm=llm,
        )
        if not verdict.allowed:
            logger.info(
                "guardrail rejected prompt",
                user_id=str(user_id),
                reason=verdict.code,
            )
            raise_if_blocked(verdict)

    def _classify(self, prompt, area, need_llm, model, topic_on, user_id):
        if not need_llm:
            return None
        key = _cache_key(prompt, area, model, topic_on)
        cached = _cache_get(key)
        if cached is not None:
            return cached
        try:
            raw = self._call_llm(prompt, area, model)
        except Exception:
            if topic_on:
                logger.warning("guardrail topic check failed open", user_id=str(user_id))
            if model is not None:
                logger.warning(
                    "guardrail model call failed; falling back to term list",
                    user_id=str(user_id),
                )
            return None
        parsed = parse_classifier_response(raw)
        if parsed is None:
            logger.warning(
                "guardrail model response unusable; falling back",
                user_id=str(user_id),
            )
            return None
        # Sin modelo de moderación, el LLM solo opina del tema (la lista es el suelo).
        verdict = LlmVerdict(language_ok=None, topic_ok=parsed.topic_ok) if model is None else parsed
        # Solo se cachean veredictos válidos: un fallo/timeout no se recuerda.
        _cache_put(key, verdict)
        return verdict

    def _call_llm(self, prompt: str, area: str, model: tuple[str, str] | None) -> str:
        from core.config import settings

        if settings.llm_fake:
            return _fake_classifier(prompt, area)
        from llm.router import generar_texto

        body = _CLASSIFIER_PROMPT.format(area=area or "(sin restricción)", prompt=prompt)
        llm_config: dict = {"texto": {"timeout_s": _LLM_TIMEOUT_S}}
        if model is not None:
            llm_config["texto"]["provider"] = model[0]
            llm_config["texto"]["model_id"] = model[1]
        return generar_texto(
            body,
            "texto",
            max_tokens=_LLM_MAX_TOKENS,
            llm_config=llm_config,
        )
