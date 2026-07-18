# Sesión actual

**Fecha:** 2026-07-18
**Agente:** leader (Cursor)
**Sprint:** 2

## Resumen

1) OpenRouter cableado como proveedor de imágenes.
2) (prev) HF 410 / CF 401; selects Modelos.

## Hecho

### OpenRouter imágenes — 2026-07-18
- `image_openrouter.py`: POST `/api/v1/images` → data URI.
- Registrado en `IMAGE_PROVIDERS` + catálogo curado/live.
- Jobs/regen usan `image_settings_resolve` (cadena tarea `imagen`).
- Default modelo: `openai/gpt-image-1-mini` (`OPENROUTER_IMAGE_MODEL`).
- Tests: openrouter + catalog + hu035 + hf (25) OK.

### Imágenes OVA (HF / Cloudflare) — prev
- HF → fal-ai router; CF/HF env keys 401; cupo HF $0.10/$0.10 agotado.

## Próximo paso

- En Modelos → Imagen: elegir OpenRouter + p.ej. GPT Image 1 Mini.
- Regenerar OVA; verificar logs `provider=openrouter`.
- Commit pendiente de aprobación.
