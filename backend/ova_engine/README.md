# ova_engine — motor de OVAs por plantillas

```
decide (motor de decisión: reglas | Laya local | Jev/OpenRouter)  → params de ESTRUCTURA
  → texto JSON (LLM, SOLO texto, validado contra schema, 1 reintento con errores)
  → imágenes (opcional, elementos con `prompt_imagen`)
  → render determinista (componentes UPAO) → runtime UPAO
```

El LLM ya no escribe HTML/JS: diseño, accesibilidad e interactividad salen de la
plantilla, siempre iguales y probados. Fallo del texto → respaldo al plan clásico
(`plan_map.degraded_plan`).

## Variables de entorno

| Variable | Valores | Uso |
|---|---|---|
| `OVA_ENGINE_TEMPLATES` | `1` (def.) / `0` | activa el motor para recursos con plantilla |
| `OVA_DECISION_BACKEND` | `rules` (def.) / `laya` / `jev` | quién decide la estructura |
| `OVA_DECISION_URL` | `http://localhost:8090` | servidor Laya (o endpoint Jev) |
| `OVA_DECISION_MIN_CONFIDENCE` | `0.35` | por debajo → se queda la regla |
| `OVA_TEXT_BACKEND` | `router` (def.) / `local` | `local` = Ollama con salida estructurada |
| `OVA_LOCAL_LLM_URL` / `OVA_LOCAL_LLM_MODEL` | `http://localhost:11435` / `qwen3:8b` | simulación local |

## Escribir una plantilla (`templates/<fase>_<NN>.py`)

Copia `templates/engage_01.py` (referencia). Exporta `SPEC = TemplateSpec(...)` con:

- `params`: `Param`s de ESTRUCTURA que decide el motor (cantidades con `min`/`max`,
  variantes con `choices`). Nada de texto aquí.
- `schema(params)`: JSON Schema con los helpers de `ova_engine.schema`
  (`obj`, `arr`, `s(max_len)`, `i()`, `b()`). Cantidades exactas con `min_items=max_items`.
  Pon `maxLength` realistas: el texto se muestra en componentes con espacio fijo.
- `prompt(concept, contexto, params)`: SOLO contenido pedagógico. Formato
  `[ROL] [CONCEPTO] [TAREA] [RESTRICCIONES]` + `[MATERIAL DEL DOCENTE]` si hay contexto.
  Describe cada campo del schema. Nunca pidas HTML/CSS/JS ni describas el JSON
  Schema (el motor lo añade). Recupera la intención pedagógica del prompt existente en
  `prometheus/prompts/data/<fase>.toml` (`[texto.N]` / `[codigo.N]`).
- `render(data, ctx)`: HTML del `<main>` usando componentes de
  `llm/ova_components/component_catalog.md`. Reglas:
  1. TODO texto del LLM pasa por `esc()` (contenido y atributos). Para el JS usa
     `json_data(...)` y léelo con `JSON.parse(document.getElementById('ova-data').textContent)`.
  2. Un solo h1: `upao-header` (o `upao-card title`).
  3. Termina con `<upao-complete ... locked>` y desbloquéalo cuando el estudiante
     complete la interacción (`script(PROGRESS_JS)` + `window.ovaMark(clave)` con
     `<upao-progress id="prog" total=N>`).
  4. JS siempre con `script(...)` (se difiere a DOMContentLoaded). Sin librerías externas,
     sin `innerHTML` con texto del LLM (usa `textContent`).
  5. Accesible: botones reales, `aria-live` para feedback, alt en imágenes, operable con teclado.
  6. Móvil primero: nada de anchos fijos > 320px.
- `sample(concept, params)`: datos válidos y realistas que cumplan el schema para
  CUALQUIER params (se usan en tests, en `LLM_FAKE=1` y como demo).
- `uses_images=True` solo si hay elementos con `prompt_imagen`; en `render`, si el
  elemento trae `image_placeholder` úsalo como `src`, si no dibuja un SVG/emoji.

## Casos especiales
- **Video** (engage 2, explore 4, explain 1): el schema DEBE tener `prompt_video` (inglés,
  ≤90 palabras) en la raíz; el pipeline encarga el video y lo inserta solo. El render
  muestra el guion/storyboard (el video llega aparte).
- **Podcast** (engage 3): NO tiene plantilla (ya usa un reproductor fijo, plan `podcast`).
- **Agente socrático** (explore 2): render con diálogo guionizado (ramas pregunta→respuesta
  precalculadas en el JSON), sin llamadas a LLM en tiempo de ejecución.

## Verificar

```bash
cd backend
LLM_FAKE=0 .venv/bin/python -m pytest -q tests/test_ova_engine_templates.py
.venv/bin/python scripts/ova_engine_render.py /tmp/ova-out engage:1
# servir /tmp/ova-out y revisar con playwright-cli: consola sin errores, completar
# la interacción y comprobar que upao-complete se desbloquea.
OVA_TEXT_BACKEND=local .venv/bin/python -c "from ova_engine.registry import get_spec; from ova_engine.pipeline import generate_with_template as g; print(g(get_spec('engage',1),'Índices B-tree')[1])"
```
