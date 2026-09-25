"""Imagen, video y voz generados en local para el OpenRouter simulado.

- Imagen: por defecto una ilustración sencilla dibujada con Pillow a partir del
  prompt (colores estables por prompt). Con FAKE_OR_IMAGE_BACKEND=sdturbo usa
  Stable Diffusion Turbo en la GPU (hay que tener diffusers y torch).
- Video: fotogramas con Pillow codificados a MP4 (H.264) con el ffmpeg que
  trae imageio-ffmpeg; respeta duración, resolución y relación de aspecto.
- Voz: Piper con una voz en español, remuestreada a PCM16 24 kHz mono, que es
  lo que OpenRouter devuelve en streaming.
"""

from __future__ import annotations

import base64
import hashlib
import io
import os
import tempfile
import textwrap
from functools import lru_cache
from pathlib import Path

VOICE = Path(
    os.getenv(
        "FAKE_OR_VOICE",
        str(Path.home() / ".cache/genova-fake-or/voices/es_MX-claude-high.onnx"),
    )
)
_RATIOS = {"1:1": (1, 1), "16:9": (16, 9), "9:16": (9, 16), "4:3": (4, 3), "3:4": (3, 4)}
_RES = {"480p": 480, "720p": 720, "1080p": 1080}


def _colors(prompt: str) -> tuple[tuple[int, int, int], tuple[int, int, int]]:
    digest = hashlib.sha256(prompt.encode()).digest()
    return (digest[0] // 2, digest[1] // 2, 90 + digest[2] // 3), (
        150 + digest[3] // 3,
        110 + digest[4] // 3,
        digest[5] // 2,
    )


def _frame(prompt: str, width: int, height: int, t: float = 0.0):
    from PIL import Image, ImageDraw

    top, bottom = _colors(prompt)
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)
    for y in range(height):
        k = y / max(1, height - 1)
        draw.line(
            [(0, y), (width, y)],
            fill=tuple(int(a + (b - a) * k) for a, b in zip(top, bottom, strict=True)),
        )
    radius = min(width, height) // 6
    cx = int(width * (0.2 + 0.6 * t))
    draw.ellipse([cx - radius, height // 2 - radius, cx + radius, height // 2 + radius], outline="white", width=4)
    lines = textwrap.wrap(prompt, width=max(20, width // 14))[:6]
    for i, line in enumerate(lines):
        draw.text((24, 24 + i * 18), line, fill="white")
    draw.text((24, height - 30), "Generado en local (OpenRouter simulado)", fill="white")
    return img


def _png(img) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@lru_cache(maxsize=1)
def _sdturbo():
    import torch
    from diffusers import AutoPipelineForText2Image

    pipe = AutoPipelineForText2Image.from_pretrained(
        "stabilityai/sd-turbo", torch_dtype=torch.float16, variant="fp16"
    )
    return pipe.to("cuda")


def image_png(prompt: str, aspect_ratio: str | None = None) -> bytes:
    rw, rh = _RATIOS.get(aspect_ratio or "1:1", (1, 1))
    width, height = (768, 768 * rh // rw) if rw >= rh else (768 * rw // rh, 768)
    if os.getenv("FAKE_OR_IMAGE_BACKEND") == "sdturbo":
        pipe = _sdturbo()
        img = pipe(prompt=prompt, num_inference_steps=2, guidance_scale=0.0, width=512, height=512).images[0]
        return _png(img)
    return _png(_frame(prompt, width, height))


def image_data_uri(prompt: str, aspect_ratio: str | None = None) -> str:
    return "data:image/png;base64," + base64.b64encode(image_png(prompt, aspect_ratio)).decode()


def video_mp4(prompt: str, duration: int = 4, resolution: str = "480p", aspect_ratio: str = "16:9") -> bytes:
    import imageio_ffmpeg

    height = _RES.get(resolution, 480)
    rw, rh = _RATIOS.get(aspect_ratio, (16, 9))
    width = int(height * rw / rh) // 2 * 2
    fps = 12
    frames = max(1, int(duration * fps))
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "video.mp4"
        writer = imageio_ffmpeg.write_frames(
            str(out), (width, height), fps=fps, codec="libx264", pix_fmt_out="yuv420p", macro_block_size=2
        )
        writer.send(None)
        for i in range(frames):
            writer.send(_frame(prompt, width, height, i / frames).tobytes())
        writer.close()
        return out.read_bytes()


@lru_cache(maxsize=1)
def _voice():
    from piper import PiperVoice

    return PiperVoice.load(str(VOICE))


def speech_pcm16_24k(text: str) -> bytes:
    """Voz en español como PCM16 mono a 24 kHz (el formato de OpenRouter)."""
    import numpy as np

    chunks = list(_voice().synthesize(text))
    if not chunks:
        return b""
    rate = chunks[0].sample_rate
    pcm = np.frombuffer(b"".join(c.audio_int16_bytes for c in chunks), dtype=np.int16).astype(np.float32)
    target = int(len(pcm) * 24_000 / rate)
    resampled = np.interp(np.linspace(0, len(pcm) - 1, target), np.arange(len(pcm)), pcm)
    return resampled.astype(np.int16).tobytes()
