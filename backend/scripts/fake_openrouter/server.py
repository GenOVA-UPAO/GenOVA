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
"""

from __future__ import annotations

import base64
import json
import os
import re
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


def _audio_events(body: dict):
    text = _last_user_text(body)
    match = re.search(r"<leer>(.*?)</leer>", text, re.S)
    pcm = media.speech_pcm16_24k((match.group(1) if match else text).strip())
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


@app.get("/api/v1/{path:path}")
async def passthrough(path: str, request: Request):
    """Catálogo y clave: la API real (gratis). Se guarda 10 min para no repetir."""
    url = f"{UPSTREAM}/{path}" + (f"?{request.url.query}" if request.url.query else "")
    auth = request.headers.get("authorization", "")
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


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=int(os.getenv("FAKE_OR_PORT", "8300")))
