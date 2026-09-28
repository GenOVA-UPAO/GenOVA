"""Caso de uso: re-embeber los fragmentos generados con otro embedder.

Los vectores de modelos o formatos de entrada distintos no son comparables
(p. ej. gemini-embedding-001 y gemini-embedding-2 tienen espacios incompatibles,
y en v2 los prefijos de tarea cambian el vector). Tras cambiar de embedder, los
fragmentos cuyo `embedding_model` no es la `fingerprint` del activo se vuelven
a embeber a partir de su texto guardado.

- Idempotente: solo toca los desfasados; repetirlo cuando ya no queda ninguno
  no hace nada, y si se corta, lo confirmado por lotes queda hecho.
- `dry_run` no llama al embedder ni escribe: solo cuenta.
- Límite conocido: un archivo que se embebió como binario (PDF, imagen, audio)
  no se guarda; se re-embebe su texto guardado (el extraído o la descripción).
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

import structlog

from rag.application.errors import EmbedderError
from rag.application.ports import EmbedderPort, ReindexStorePort

logger = structlog.get_logger(__name__)


@dataclass(slots=True)
class ReindexReport:
    fingerprint: str
    dry_run: bool
    by_model: dict[str | None, int] = field(default_factory=dict)
    stale: int = 0
    reindexed: int = 0
    batches: int = 0
    error: str | None = None

    @property
    def total(self) -> int:
        return sum(self.by_model.values())


@dataclass(frozen=True, slots=True)
class ReindexChunks:
    embedder: EmbedderPort
    store: ReindexStorePort

    def execute(
        self,
        *,
        dry_run: bool = True,
        batch_size: int = 32,
        limit: int | None = None,
        upload_id: str | None = None,
    ) -> ReindexReport:
        fingerprint = getattr(self.embedder, "fingerprint", None)
        if not fingerprint:
            raise EmbedderError("El embedder activo no declara `fingerprint`")
        by_model = self.store.count_by_embedding_model(upload_id=upload_id)
        stale = sum(n for model, n in by_model.items() if model != fingerprint)
        report = ReindexReport(fingerprint, dry_run, by_model, stale)
        if dry_run or not stale:
            report.batches = math.ceil(min(stale, limit or stale) / batch_size) if stale else 0
            return report
        self._run(report, batch_size, limit, upload_id)
        return report

    def _run(
        self, report: ReindexReport, batch_size: int, limit: int | None, upload_id: str | None
    ) -> None:
        after: str | None = None
        while limit is None or report.reindexed < limit:
            size = batch_size if limit is None else min(batch_size, limit - report.reindexed)
            rows = self.store.stale_chunks(
                report.fingerprint, after_id=after, limit=size, upload_id=upload_id
            )
            if not rows:
                return
            after = rows[-1]["id"]
            try:
                vectors = self.embedder.embed_batch([r["content"] for r in rows])
            except EmbedderError as exc:
                # Se para en el primer lote que falla: seguir solo gastaría cuota.
                report.error = str(exc)
                logger.warning("Reindexado detenido", reindexed=report.reindexed, error=str(exc))
                return
            ids = [r["id"] for r in rows]
            report.reindexed += self.store.update_embeddings(
                list(zip(ids, vectors, strict=True)), report.fingerprint
            )
            report.batches += 1
            logger.info("Lote reindexado", batch=report.batches, total=report.reindexed)
