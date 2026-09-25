# OpenRouter simulado en local

Servidor compatible con la API de OpenRouter para probar GenOVA de punta a
punta (texto, imágenes, voz y video) sin gastar crédito. El texto lo genera un
modelo local de Ollama; imágenes, video y voz se crean en la máquina.

## Qué hace cada endpoint

| Endpoint | Respuesta |
|---|---|
| `POST /api/v1/chat/completions` | Texto con el modelo de Ollama, sea cual sea el id pedido. Si `modalities` pide imagen, un PNG; si pide audio, voz en español (Piper) en streaming PCM16 24 kHz |
| `POST /api/v1/images` | PNG generado en local |
| `POST /api/v1/videos` → `GET /videos/{id}` → `GET /videos/{id}/content` | El ciclo real: envío, sondeo (2 veces «in_progress») y un MP4 H.264 con la duración, resolución y relación de aspecto pedidas |
| `POST /v1beta/models/{modelo}:batchEmbedContents` y `:embedContent` | Embeddings con el formato de Gemini, calculados con `nomic-embed-text` (768 d, recortados a `outputDimensionality`). Como `gemini-embedding-2`, cada petición da un vector (varias partes se juntan en uno); un archivo (`inline_data`) se representa por su tipo MIME. Para usarlo: `RAG_EMBEDDER=gemini` (o `gemini-001`), `GEMINI_API_KEY` cualquiera y `GEMINI_API_BASE=http://localhost:8300` |
| `GET` de catálogo (`/models`, `/images/models`, `/videos/models`, endpoints de imagen, `/key`) | Se reenvían a la API real, que no cobra, y se guardan 10 min |

## Puesta en marcha

1. Ollama con GPU y un modelo de texto (unos 60 tokens/s en una RTX 3060):

   ```bash
   docker run -d --gpus all --name genova-ollama-gpu -e OLLAMA_CONTEXT_LENGTH=16384 \
     -v genova-ollama-models:/root/.ollama -p 11435:11434 ollama/ollama
   docker exec genova-ollama-gpu ollama pull qwen2.5-coder:7b
   docker exec genova-ollama-gpu ollama pull nomic-embed-text   # para el RAG
   ```

2. La voz en español de Piper (63 MB):

   ```bash
   mkdir -p ~/.cache/genova-fake-or/voices && cd ~/.cache/genova-fake-or/voices
   for f in es_MX-claude-high.onnx es_MX-claude-high.onnx.json; do
     curl -sSLfO "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_MX/claude/high/$f"
   done
   ```

3. El servidor (uv instala sus dependencias aparte, no toca el entorno del backend):

   ```bash
   uv run --no-project backend/scripts/fake_openrouter/server.py   # :8300
   ```

4. El backend apuntando a él:

   ```bash
   OPENROUTER_API_BASE=http://localhost:8300/api/v1 uvicorn main:app --port 8000
   ```

   La clave de OpenRouter guardada en la plataforma se sigue usando para el
   catálogo real; las llamadas de pago nunca salen de la máquina.

## Variables

| Variable | Por defecto | Para qué |
|---|---|---|
| `FAKE_OR_PORT` | `8300` | Puerto |
| `FAKE_OR_OLLAMA` | `http://localhost:11435` | Ollama |
| `FAKE_OR_TEXT_MODEL` | `qwen2.5-coder:7b` | Modelo que atiende todo el texto |
| `FAKE_OR_MAX_TOKENS` | `10000` | Tope de salida (cabe en el contexto de Ollama) |
| `FAKE_OR_VOICE` | `~/.cache/genova-fake-or/voices/es_MX-claude-high.onnx` | Voz de Piper |
| `FAKE_OR_IMAGE_BACKEND` | `pillow` | `sdturbo` genera con Stable Diffusion Turbo en la GPU (requiere `diffusers` y `torch`) |
| `FAKE_OR_VIDEO_POLLS` | `2` | Sondeos en «in_progress» antes de completar (un número alto prueba el tope de espera) |
| `FAKE_OR_VIDEO_NOISE` | vacío | `1` genera el video con ruido, que no se comprime: prueba el tope de 8 MB |
| `FAKE_OR_FAIL_MODELS` | vacío | Ids separados por comas que responden 402, para probar los respaldos |
| `FAKE_OR_EMBED_MODEL` | `nomic-embed-text` | Modelo de Ollama para los embeddings (tiene que dar 768 d) |
| `FAKE_OR_FAIL_EMBED` | vacío | Código HTTP con el que fallan los embeddings, con el cuerpo de error de Google (`429`, `400`, `503`…; `1` = 500): prueba reintentos y errores |
| `FAKE_OR_FAIL_EMBED_TIMES` | `0` | Con `FAKE_OR_FAIL_EMBED`, solo fallan las N primeras peticiones (0 = todas): prueba que un reintento se recupera |
| `FAKE_OR_EMBED_DIM` | vacío | Fuerza la dimensión de los vectores (p. ej. `3072`), como un proveedor que ignora `outputDimensionality` |
| `FAKE_OR_UPSTREAM` | `https://openrouter.ai/api/v1` | API real para el catálogo |
