"""Intérprete y guard de alcance basado en Laya System One."""

from __future__ import annotations

import os
import time
from typing import Any

import httpx
import structlog

from editor.application.ports import IntentInterpreterPort, ScopeGuardPort
from editor.domain import (
    OUT_OF_SCOPE_MESSAGE,
    GuardCheckResult,
    Intent,
    IntentBlockRef,
    IntentDestino,
    IntentTrace,
    ResourceBlock,
    extract_core_request,
    normalize_type,
    record_guard_rejection,
)

logger = structlog.get_logger(__name__)

TYPE_DESCRIPTIONS: dict[str, str] = {
    "header": "Encabezado o título del recurso",
    "paragraph": "Párrafo explicativo o texto introductorio",
    "example": "Ejemplo o caso razonado ilustrativo",
    "question": "Pregunta o evaluación tipo quiz",
    "summary": "Resumen, conclusiones o cierre",
    "panel": "Viñeta o cuadro del cómic",
    "steps": "Pasos o guía paso a paso",
    "objective": "Objetivo de aprendizaje",
    "card": "Tarjeta o panel informativo",
    "reveal": "Respuesta desplegable",
}


def _build_questions_payload(blocks: list[ResourceBlock]) -> dict[str, Any]:
    present_types = {normalize_type(b.tipo) for b in blocks if normalize_type(b.tipo)}
    tipo_criteria: dict[str, str] = {
        t: TYPE_DESCRIPTIONS.get(t, f"Componente {t}") for t in present_types
    }
    tipo_criteria["ninguno"] = "Ningún tipo identificado o no aplica"

    return {
        "accion": {
            "type": "choice",
            "instructions": "Elige la acción solicitada por el texto:",
            "criteria": {
                "quitar": "Quitar, eliminar, borrar o sacar un bloque existente",
                "mover": "Mover, desplazar, reordenar, subir o bajar",
                "anadir": "Añadir, agregar, incluir o insertar un nuevo bloque",
                "reemplazar": "Reemplazar o sustituir un bloque existente",
                "ninguna": "Ninguna acción de edición, saludo o instrucción ambigua",
            },
        },
        "tipo_bloque": {
            "type": "choice",
            "instructions": "¿A qué tipo de bloque hace referencia el texto?",
            "criteria": tipo_criteria,
        },
        "indice": {
            "type": "choice",
            "instructions": "¿Qué número u ordinal de elemento se indica en el texto?",
            "criteria": {
                "1": "Primero, primera o número 1",
                "2": "Segundo, segunda o número 2",
                "3": "Tercero, tercera o número 3",
                "4": "Cuarto, cuarta o número 4",
                "5": "Quinto, quinta o número 5",
                "ultimo": "Último, última o al final",
                "unico": "No indica número o elemento único",
                "ninguno": "No aplica",
            },
        },
        "destino": {
            "type": "choice",
            "instructions": "¿Hacia qué posición se pide mover o añadir?",
            "criteria": {
                "inicio": "Al inicio, al principio, antes de todo o arriba",
                "final": "Al final, al cierre, después de todo o abajo",
                "antes": "Antes de otro elemento",
                "despues": "Después de otro elemento",
                "ninguno": "No aplica",
            },
        },
    }


def _parse_laya_answers(
    answers: dict[str, Any],
) -> tuple[str, str | None, int | str | None, str | None, float]:
    accion_choice = answers.get("accion", {}).get("choice", "ninguna")
    tipo_choice = answers.get("tipo_bloque", {}).get("choice")
    indice_choice = answers.get("indice", {}).get("choice")
    destino_choice = answers.get("destino", {}).get("choice")

    accion_conf = answers.get("accion", {}).get("answer_confidence", 0.5)
    tipo_conf = answers.get("tipo_bloque", {}).get("answer_confidence", 0.5)
    indice_conf = answers.get("indice", {}).get("answer_confidence", 0.5)
    dest_conf = answers.get("destino", {}).get("answer_confidence", 0.5)

    overall_conf = round(accion_conf * 0.4 + tipo_conf * 0.3 + indice_conf * 0.15 + dest_conf * 0.15, 2)

    target_type = normalize_type(tipo_choice) if (tipo_choice and tipo_choice != "ninguno") else None

    target_index: int | str | None = None
    if indice_choice == "ultimo":
        target_index = "ultimo"
    elif indice_choice and indice_choice not in ("unico", "ninguno") and str(indice_choice).isdigit():
        target_index = int(indice_choice)

    target_pos = destino_choice if destino_choice in ("inicio", "final", "antes", "despues") else None
    action = accion_choice if accion_choice in ("quitar", "mover", "anadir", "reemplazar") else "ninguna"

    if action != "ninguna" and not target_type and action != "anadir":
        action = "ninguna"

    return action, target_type, target_index, target_pos, overall_conf


class LayaIntentInterpreter(IntentInterpreterPort, ScopeGuardPort):
    def __init__(
        self,
        base_url: str | None = None,
        model_name: str = "multilingual",
        timeout_s: float = 10.0,
        backend_tag: str = "laya",
    ):
        self._url = base_url or os.getenv("LAYA_URL", "http://localhost:8090/v1/systemone")
        self._model = model_name
        self._timeout_s = timeout_s
        self._backend_tag = backend_tag

    def interpret(
        self,
        instruction: str,
        blocks: list[ResourceBlock],
        options: dict[str, Any] | None = None,
    ) -> tuple[Intent, IntentTrace]:
        start_time = time.time()
        url = (options and options.get("laya_url")) or self._url
        questions_payload = _build_questions_payload(blocks)

        try:
            with httpx.Client(timeout=self._timeout_s) as client:
                res = client.post(
                    url,
                    json={
                        "model": self._model,
                        "state": {"text": instruction},
                        "questions": questions_payload,
                    },
                )
                res.raise_for_status()
                data = res.json()
        except Exception as exc:
            elapsed_ms = (time.time() - start_time) * 1000
            logger.warning("laya_call_failed", url=url, error=str(exc))
            intent = Intent(
                accion="ninguna",
                confianza=0.1,
                motivo=f"Fallo en comunicación con Laya ({url}): {exc}",
                razon=str(exc),
            )
            return intent, IntentTrace(
                backend=self._backend_tag,
                elapsed_ms=elapsed_ms,
                message=str(exc),
            )

        elapsed_ms = (time.time() - start_time) * 1000
        answers = data.get("answers", {})
        action, target_type, target_index, target_pos, overall_conf = _parse_laya_answers(answers)

        intent = Intent(
            accion=action,
            bloque=IntentBlockRef(tipo=target_type, indice=target_index) if target_type else None,
            destino=IntentDestino(posicion=target_pos) if target_pos else None,
            contenido=None,
            confianza=overall_conf,
            razon=f"Evaluación System One Laya (acción: {action}, tipo: {target_type or 'n/a'})",
        )
        return intent, IntentTrace(backend=self._backend_tag, elapsed_ms=elapsed_ms, raw_response=data)

    def check_scope(
        self,
        instruction: str,
        options: dict[str, Any] | None = None,
    ) -> GuardCheckResult:
        """Capa 2 de alcance: verifica con Laya (noul) si es una instrucción de edición estructural."""
        core_text = extract_core_request(instruction)
        text_to_check = core_text if len(core_text) >= 4 else instruction
        url = (options and options.get("laya_url")) or self._url

        try:
            with httpx.Client(timeout=3.0) as client:
                res = client.post(
                    url,
                    json={
                        "model": self._model,
                        "state": {"text": text_to_check},
                        "questions": {
                            "es_edicion": {
                                "type": "noul",
                                "instructions": "¿Es una instrucción para editar la estructura del recurso (quitar, mover o añadir bloques)?",
                            }
                        },
                    },
                )
                if not res.is_success:
                    return GuardCheckResult(allowed=True, cleaned_text=text_to_check)
                data = res.json()
                noul_score = data.get("answers", {}).get("es_edicion", {}).get("noul")
                if isinstance(noul_score, (int, float)) and noul_score < 0.20:
                    record_guard_rejection("fuera_de_alcance")
                    return GuardCheckResult(
                        allowed=False,
                        reason="fuera_de_alcance",
                        motivo=OUT_OF_SCOPE_MESSAGE,
                        cleaned_text=text_to_check,
                    )
                return GuardCheckResult(allowed=True, cleaned_text=text_to_check)
        except Exception as exc:
            logger.info("scope_guard_laya_timeout_fail_open", error=str(exc))
            return GuardCheckResult(allowed=True, cleaned_text=text_to_check)
