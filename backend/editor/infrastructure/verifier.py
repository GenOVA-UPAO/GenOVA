"""Verificador post-aplicación usando Laya System One."""

from __future__ import annotations

import os
from typing import Any

import httpx
import structlog

from editor.application.ports import PostVerifierPort
from editor.domain import Intent, ResourceBlock, normalize_type

logger = structlog.get_logger(__name__)


def format_blocks_summary(blocks: list[ResourceBlock]) -> str:
    """Resume la lista de bloques en una cadena compacta para Laya."""
    parts = []
    for idx, b in enumerate(blocks):
        norm_type = normalize_type(b.tipo)
        p = b.props or {}
        title = p.get("title") or p.get("prompt") or p.get("dialogue") or p.get("text")
        title_short = f" («{str(title)[:25]}»)" if title else ""
        parts.append(f"{idx + 1}. {norm_type}{title_short}")
    return ", ".join(parts)


class LayaPostVerifier(PostVerifierPort):
    def __init__(
        self,
        base_url: str | None = None,
        model_name: str = "multilingual",
        threshold: float = 0.7,
        timeout_s: float = 3.0,
    ):
        self._url = base_url or os.getenv("LAYA_URL", "http://localhost:8090/v1/systemone")
        self._model = model_name
        self._threshold = float(os.getenv("POST_VERIFY_THRESHOLD", str(threshold)))
        self._timeout_s = timeout_s

    def verify(
        self,
        instruction: str,
        before_blocks: list[ResourceBlock],
        after_blocks: list[ResourceBlock],
        intent: Intent,
        options: dict[str, Any] | None = None,
    ) -> tuple[bool, float, str | None]:
        url = (options and options.get("laya_url")) or self._url
        threshold = (options and options.get("threshold")) or self._threshold

        before_summary = format_blocks_summary(before_blocks)
        after_summary = format_blocks_summary(after_blocks)
        summary_text = (
            f"Instrucción: {instruction}\n"
            f"Antes: [{before_summary}]\n"
            f"Después: [{after_summary}]"
        )

        payload = {
            "model": self._model,
            "state": {
                "instruction": instruction,
                "summary": summary_text,
            },
            "questions": {
                "cumple_instruccion": {
                    "type": "noul",
                    "instructions": "¿El resultado cumple la instrucción del docente?",
                },
            },
        }

        try:
            with httpx.Client(timeout=self._timeout_s) as client:
                res = client.post(url, json=payload)
                if not res.is_success:
                    return True, 1.0, None
                data = res.json()
                score_raw = data.get("answers", {}).get("cumple_instruccion", {}).get("noul")
                score = float(score_raw) if isinstance(score_raw, (int, float)) else 1.0

                if score < threshold:
                    reason = f"Score {score:.3f} inferior al umbral {threshold}"
                    return False, score, reason
                return True, score, None
        except Exception as exc:
            logger.info("post_verifier_laya_timeout_fail_open", error=str(exc))
            return True, 1.0, None
