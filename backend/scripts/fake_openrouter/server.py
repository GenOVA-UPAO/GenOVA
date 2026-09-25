# /// script
# requires-python = ">=3.11"
# dependencies = ["fastapi", "uvicorn", "httpx", "pillow", "numpy", "imageio-ffmpeg", "piper-tts"]
# ///
"""OpenRouter simulado en local, para probar GenOVA sin gastar crédito.

    uv run backend/scripts/fake_openrouter/server.py        # escucha en :8300

y el backend con OPENROUTER_API_BASE=http://localhost:8300/api/v1. Emula:

- POST /chat/completions: texto con un modelo local de Ollama (ollama_proxy);
  imagen si `modalities` pide imagen; voz en streaming PCM16 si pide audio.
- POST /images: imagen generada en local.
- POST /videos → GET /videos/{id} (sondeo) → GET /videos/{id}/content (MP4).
- Cualquier otro GET (catálogo, /key) se reenvía a la API real, que no cobra.

FAKE_OR_FAIL_MODELS="a/b,c/d" responde 402 a esos modelos, para probar respaldos.
POST /v1beta/models/{m}:batchEmbedContents responde como Gemini (embeddings del RAG).
"""

from __future__ import annotations

import base64
import json
import os
import sys
import time
import uuid
from pathlib import Path

import httpx
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response, StreamingResponse

sys.path.insert(0, str(Path(__file__).parent))

import media  # noqa: E402
import ollama_proxy  # noqa: E402

UPSTREAM = os.getenv("FAKE_OR_UPSTREAM", "https://openrouter.ai/api/v1").rstrip("/")
FAIL = {m.strip() for m in os.getenv("FAKE_OR_FAIL_MODELS", "").split(",") if m.strip()}
VIDEO_POLLS = int(os.getenv("FAKE_OR_VIDEO_POLLS", "2"))

app = FastAPI(title="OpenRouter simulado")
_videos: dict[str, dict] = {}
_cache: dict[str, tuple[float, int, bytes, str]] = {}


def _no_credit(model: str) -> JSONResponse:
    return JSONResponse({"error": {"code": 402, "message": f"Insufficient credits ({model}, simulado)"}}, 402)


def _last_user_text(body: dict) -> str:
    for msg in reversed(body.get("messages") or []):
        if msg.get("role") == "user":
            content = msg.get("content")
            if isinstance(content, list):
                return " ".join(p.get("text", "") for p in content if isinstance(p, dict))
            return str(content or "")
    return ""


def _image_reply(body: dict) -> dict:
    ratio = (body.get("image_config") or {}).get("aspect_ratio")
    url = media.image_data_uri(_last_user_text(body), ratio)
    message = {"role": "assistant", "content": "", "images": [{"type": "image_url", "image_url": {"url": url}}]}
    return {
        "id": f"gen-{uuid.uuid4().hex[:12]}",
        "model": body.get("model"),
        "choices": [{"index": 0, "message": message, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": 0, "completion_tokens": 1290, "cost": 0},
    }


def _text_to_read(text: str) -> str:
    """Lo que va entre <leer> y </leer> (el formato de tts_openrouter), o todo."""
    start = text.find("<leer>")
    end = text.find("</leer>", start + 6) if start != -1 else -1
    return (text[start + 6 : end] if end != -1 else text).strip()


def _audio_events(body: dict):
    text = _last_user_text(body)
    pcm = media.speech_pcm16_24k(_text_to_read(text))
    step = 24_000 * 2  # un segundo por evento
    for i in range(0, len(pcm), step):
        delta = {"audio": {"data": base64.b64encode(pcm[i : i + step]).decode()}}
        yield f"data: {json.dumps({'choices': [{'index': 0, 'delta': delta}]})}\n\n"
    yield "data: [DONE]\n\n"


@app.post("/api/v1/chat/completions")
async def chat(request: Request):
    body = await request.json()
    model = body.get("model") or ""
    if model in FAIL:
        return _no_credit(model)
    modalities = body.get("modalities") or []
    if "image" in modalities:
        return _image_reply(body)
    if "audio" in modalities:
        return StreamingResponse(_audio_events(body), media_type="text/event-stream")
    if body.get("stream"):
        return StreamingResponse(ollama_proxy.stream(body), media_type="text/event-stream")
    return await ollama_proxy.complete(body)


@app.post("/api/v1/images")
async def images(request: Request):
    body = await request.json()
    if body.get("model") in FAIL:
        return _no_credit(body["model"])
    png = media.image_png(body.get("prompt") or "", body.get("aspect_ratio"))
    return {"data": [{"b64_json": base64.b64encode(png).decode(), "media_type": "image/png"}]}


@app.post("/api/v1/videos", status_code=202)
async def submit_video(request: Request):
    body = await request.json()
    if body.get("model") in FAIL:
        return _no_credit(body["model"])
    job_id = f"vid-{uuid.uuid4().hex[:12]}"
    _videos[job_id] = {**body, "polls": 0}
    return {"id": job_id, "polling_url": f"/api/v1/videos/{job_id}", "status": "pending"}


@app.get("/api/v1/videos/models")
async def video_models(request: Request):
    # Antes que /videos/{job_id}: si no, «models» se tomaría por un trabajo.
    return await passthrough("videos/models", request)


@app.get("/api/v1/videos/{job_id}")
async def poll_video(job_id: str, request: Request):
    job = _videos.get(job_id)
    if job is None:
        return JSONResponse({"error": {"message": "no existe"}}, 404)
    job["polls"] += 1
    if job["polls"] <= VIDEO_POLLS:
        return {"id": job_id, "status": "in_progress"}
    origin = str(request.base_url).rstrip("/")
    return {
        "id": job_id,
        "status": "completed",
        "unsigned_urls": [f"{origin}/api/v1/videos/{job_id}/content?index=0"],
        "usage": {"cost": 0},
    }


@app.get("/api/v1/videos/{job_id}/content")
async def video_content(job_id: str):
    job = _videos.get(job_id)
    if job is None:
        return JSONResponse({"error": {"message": "no existe"}}, 404)
    mp4 = media.video_mp4(
        job.get("prompt") or "",
        int(job.get("duration") or 4),
        job.get("resolution") or "480p",
        job.get("aspect_ratio") or "16:9",
    )
    return Response(mp4, media_type="video/mp4")


# FAKE_OR_FAIL_EMBED=<código HTTP> hace fallar los embeddings (1 = 500), para
# probar reintentos y errores; con FAKE_OR_FAIL_EMBED_TIMES=N solo fallan las N
# primeras peticiones. FAKE_OR_EMBED_DIM fuerza la dimensión de la respuesta
# (simula un proveedor que ignora `outputDimensionality`).
_FAIL_EMBED = os.getenv("FAKE_OR_FAIL_EMBED", "").strip()
_FAIL_EMBED_TIMES = int(os.getenv("FAKE_OR_FAIL_EMBED_TIMES", "0") or 0)
_EMBED_DIM = int(os.getenv("FAKE_OR_EMBED_DIM", "0") or 0)
_GOOGLE_STATUS = {
    400: "INVALID_ARGUMENT",
    403: "PERMISSION_DENIED",
    404: "NOT_FOUND",
    429: "RESOURCE_EXHAUSTED",
    500: "INTERNAL",
    503: "UNAVAILABLE",
}
_embed_failures = 0


def _embed_error() -> JSONResponse | None:
    global _embed_failures
    if not _FAIL_EMBED or (_FAIL_EMBED_TIMES and _embed_failures >= _FAIL_EMBED_TIMES):
        return None
    _embed_failures += 1
    code = 500 if _FAIL_EMBED == "1" else int(_FAIL_EMBED)
    status = _GOOGLE_STATUS.get(code, "UNKNOWN")
    error = {"code": code, "message": f"fallo simulado ({status})", "status": status}
    return JSONResponse({"error": error}, code)


def _embed_text(request: dict) -> str:
    """El texto de una petición de Gemini; los archivos se representan por su tipo.

    El SDK de Python manda `inline_data`/`mime_type` y el REST documentado
    `inlineData`/`mimeType`: la API real acepta los dos.
    """
    parts = (request.get("content") or {}).get("parts") or []
    texts = []
    for p in parts:
        blob = p.get("inlineData") or p.get("inline_data") or {}
        mime = blob.get("mimeType") or blob.get("mime_type") or "?"
        texts.append(p.get("text") or f"[archivo {mime}]")
    prefix = "search_query: " if request.get("taskType") == "RETRIEVAL_QUERY" else "search_document: "
    return prefix + "\n".join(texts)


def _dimension(vector: list[float], request: dict) -> list[float]:
    """Recorta a `outputDimensionality` (Matryoshka, como Gemini) o fuerza _EMBED_DIM."""
    want = _EMBED_DIM or int(request.get("outputDimensionality") or 0)
    if not want:
        return vector
    return (vector + [0.0] * want)[:want]


@app.post("/v1beta/models/{spec}")
async def gemini_embed(spec: str, request: Request):
    """Embeddings de Gemini (batchEmbedContents / embedContent) con nomic-embed-text.

    Como gemini-embedding-2: una petición con varias partes da UN vector.
    """
    if (error := _embed_error()) is not None:
        return error
    body = await request.json()
    requests = body.get("requests") or [body]
    vectors = await ollama_proxy.embed([_embed_text(r) for r in requests])
    vectors = [_dimension(v, r) for v, r in zip(vectors, requests, strict=True)]
    if spec.endswith(":embedContent"):
        return {"embedding": {"values": vectors[0]}}
    return {"embeddings": [{"values": v} for v in vectors]}


# Solo estas rutas del catálogo van a la API real; la ruta pedida nunca forma la URL.
_FIXED = {"models": "models", "key": "key", "images/models": "images/models", "videos/models": "videos/models"}


async def _upstream(url: str, auth: str) -> Response:
    """GET a la API real (gratis). Se guarda 10 min para no repetir."""
    key = f"{url}|{auth}"
    hit = _cache.get(key)
    if hit and hit[0] > time.monotonic():
        return Response(hit[2], hit[1], media_type=hit[3])
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(url, headers={"Authorization": auth} if auth else None)
    kind = resp.headers.get("content-type", "application/json")
    if resp.status_code == 200:
        _cache[key] = (time.monotonic() + 600, 200, resp.content, kind)
    return Response(resp.content, resp.status_code, media_type=kind)


async def _endpoints_url(model_id: str, auth: str) -> str | None:
    """La ruta de endpoints de un modelo de imagen, tal como la da el listado real."""
    listing = json.loads((await _upstream(f"{UPSTREAM}/images/models", auth)).body)
    for entry in listing.get("data") or []:
        if entry.get("id") == model_id:
            return f"{UPSTREAM}/images/models/{entry['id']}/endpoints"
    return None


@app.get("/api/v1/{path:path}")
async def passthrough(path: str, request: Request):
    """Catálogo y clave: se reenvían a la API real, que no cobra."""
    auth = request.headers.get("authorization", "")
    fixed = _FIXED.get(path)
    if fixed:
        return await _upstream(f"{UPSTREAM}/{fixed}", auth)
    if path.startswith("images/models/") and path.endswith("/endpoints"):
        url = await _endpoints_url(path[len("images/models/") : -len("/endpoints")], auth)
        if url:
            return await _upstream(url, auth)
    return JSONResponse({"error": {"message": f"ruta no simulada: {path}"}}, 404)


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=int(os.getenv("FAKE_OR_PORT", "8300")))
