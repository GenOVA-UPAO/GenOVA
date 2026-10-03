"""Servidor local de imágenes (SD-Turbo, 1-4 pasos) para simular proveedores reales."""
import base64, io, threading, torch
from diffusers import AutoPipelineForText2Image
from fastapi import FastAPI
from pydantic import BaseModel

pipe = AutoPipelineForText2Image.from_pretrained("stabilityai/sd-turbo", torch_dtype=torch.float16, variant="fp16").to("cuda")
app = FastAPI()
_lock = threading.Lock()  # el pipeline de diffusers no es thread-safe

class Req(BaseModel):
    prompt: str
    width: int = 512
    height: int = 512
    steps: int = 2

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/generate")
def generate(r: Req):
    w = max(256, min(768, r.width // 64 * 64)); h = max(256, min(768, r.height // 64 * 64))
    with _lock:
        img = pipe(prompt=r.prompt, num_inference_steps=max(1, min(4, r.steps)), guidance_scale=0.0, width=w, height=h).images[0]
    buf = io.BytesIO(); img.save(buf, format="WEBP", quality=82)
    return {"data_uri": "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()}
