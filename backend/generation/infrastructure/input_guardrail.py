"""Chequeo de entrada del prompt ANTES de crear el job.

Una sola llamada a `llm.router.generar_texto` cuando hace falta el modelo
(moderación configurada y/o área temática). Nunca loguea el prompt completo
en un rechazo de moderación: solo motivo + user_id.

No se pasa `deadline` a generar_texto: el router corta la cadena si quedan
< 20 s de presupuesto (pensado para recursos 5E). Aquí el tope es timeout_s.
"""

from __future__ import annotations

from uuid import UUID

import structlog

from generation.domain.guardrails import (
    LlmVerdict,
    evaluate_input,
    parse_classifier_response,
    parse_moderation_model,
    raise_if_blocked,
)
from generation.infrastructure import guardrails_store

logger = structlog.get_logger(__name__)

_LLM_TIMEOUT_S = 15
_LLM_MAX_TOKENS = 120

_CLASSIFIER_PROMPT = """\
Eres un clasificador binario de un generador educativo. Responde SOLO un JSON:
{{"language":"ok"|"block","topic":"ok"|"block"}}

Reglas:
- language=block solo por insultos o contenido sexual explícito. No bloquees
  vocabulario histórico, médico o político (p.ej. esclavitud, Guerra Civil).
- topic=block solo si el prompt NO trata el área: {area}
- Si un eje no aplica, pon "ok" en ese eje.

Prompt del usuario:
{prompt}
"""


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
        if model is None:
            return LlmVerdict(language_ok=None, topic_ok=parsed.topic_ok)
        return parsed

    def _call_llm(self, prompt: str, area: str, model: tuple[str, str] | None) -> str:
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
