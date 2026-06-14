"""Paso RAG/upload del harness: sube un documento y verifica la ingesta.

``POST /api/uploads/temp`` (multipart) ingiere a pgvector vía Gemini al subir y
devuelve ``upload_id`` + ``rag_status``. Confirmamos los chunks con
``GET /api/rag/chunks/by-upload/{id}``.
"""

from scripts.ova_e2e.client import ApiClient


def ingest(
    client: ApiClient, file_bytes: bytes, filename: str, mime: str, log_cb=print
) -> tuple[list[str], dict]:
    """Sube el archivo, devuelve ``(upload_ids, summary)``.

    ``summary`` = {filename, upload_ids, rag_status, chunks, chunk_preview}.
    """
    resp = client.post_files(
        "/api/uploads/temp",
        files=[("files", (filename, file_bytes, mime))],
    )
    items = resp.get("items", [])
    errors = resp.get("errors", [])
    if errors:
        log_cb(f"[rag] WARN errores de upload: {errors}")
    if not items:
        raise SystemExit(f"[rag] upload sin items (errores={errors})")

    upload_ids: list[str] = []
    rag_status: dict = {}
    chunks_total = 0
    preview: list[str] = []
    for it in items:
        uid = it["upload_id"]
        upload_ids.append(uid)
        rag_status = it.get("rag_status") or {}
        # Confirmación independiente de los chunks persistidos.
        chunks = client.get(f"/api/rag/chunks/by-upload/{uid}").get("items", [])
        chunks_total += len(chunks)
        if chunks and not preview:
            preview = [(c.get("content") or c.get("text") or "")[:120] for c in chunks[:2]]
        log_cb(
            f"[rag] upload {filename} → upload_id={uid[:8]}.. "
            f"rag_status={rag_status.get('status')} chunks={len(chunks)}"
        )

    summary = {
        "filename": filename,
        "upload_ids": upload_ids,
        "rag_status": rag_status,
        "chunks": chunks_total,
        "chunk_preview": preview,
    }
    return upload_ids, summary
