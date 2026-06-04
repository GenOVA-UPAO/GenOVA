# Labs — Iteración de Prompts

Interfaz de administrador para probar, comparar y mejorar los prompts que generan recursos educativos HTML5.

---

## Acceso

- **URL**: `/admin/labs`
- **Rol requerido**: `administrador`
- **API base**: `GET|POST /api/labs/*`

---

## Arquitectura

```
Admin selects phase + resource_type
  → edits prompt (base hardcoded or saved version)
  → picks 1–2 models (Model A / Model B)
  → enters concept
  → [Generate] → backend spawns 1 thread per model
  → frontend polls every 2s → results shown side-by-side
  → admin selects winner
  → [Save Version] → saves prompt + model to prompt_versions table
  → [Activate] → marks version is_active=True
    → engage_router.py / explore_router.py use DB version in production
  → [AI Improve] → sends winner HTML to orchestrator LLM → suggests better prompt
  → [Export SCORM] → downloads .zip of selected result
```

---

## Backend file layout

```
backend/labs/
  __init__.py            — empty module init
  catalog.py             — AVAILABLE_MODELS list + quality_check_html()
  prompt_utils.py        — get_base_prompt, get_active_prompt, build_improve_prompt
  generation.py          — thread workers, _lab_jobs store, start_lab_job, get_job_results
  service.py             — thin shim re-exporting all public symbols above
  router.py              — prompt CRUD endpoints (GET /models, /prompts, POST /prompts, activate)
  generation_routes.py   — generation + improvement + SCORM + results endpoints

backend/migrations/
  008_labs.sql           — prompt_versions + lab_results tables
```

---

## Database tables

### `prompt_versions`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| phase | VARCHAR(20) | `'engage'` or `'explore'` |
| resource_type | INTEGER | 1–10 |
| version_number | INTEGER | auto-incremented per (phase, resource_type) |
| prompt_text | TEXT | contains `{concept}` placeholder |
| model_id | VARCHAR | e.g. `llama-3.3-70b-versatile` |
| provider | VARCHAR | `groq` or `openrouter` |
| notes | TEXT | optional admin notes |
| is_active | BOOLEAN | at most one active per (phase, resource_type) — enforced by partial unique index |
| created_by | UUID FK → users | |

### `lab_results`
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| phase / resource_type / concept | — | generation context |
| prompt_text | TEXT | prompt used (with `{concept}` already substituted) |
| model_id / provider | — | model used |
| html_content | TEXT | generated HTML |
| raw_json | JSONB | intermediate JSON from 2-step resources |
| quality_checks | JSONB | `{cdn_ok, scorm_ok, min_length_ok, char_count}` |
| was_selected | BOOLEAN | marked when admin picks as winner |
| generation_ms | INTEGER | wall-clock generation time |
| error_message | TEXT | non-null when generation failed |

---

## API reference

All endpoints require Bearer token of an `administrador` user.

### Catalog & prompts

| Method | Path | Description |
|---|---|---|
| GET | `/api/labs/models` | List curated models (Groq + OpenRouter) |
| GET | `/api/labs/prompts/{phase}/{type}` | Base prompt + saved versions for a resource type |
| POST | `/api/labs/prompts` | Save new prompt version (`is_active=false`) |
| PUT | `/api/labs/prompts/{id}/activate` | Activate version (deactivates others for same phase+type) |
| DELETE | `/api/labs/prompts/{id}/activate` | Deactivate version |

### Generation

| Method | Path | Description |
|---|---|---|
| POST | `/api/labs/generate` | Start parallel generation; returns `{job_id, count}` |
| GET | `/api/labs/generate/{job_id}/results` | Poll: `{finished, done, total, results[]}` |
| POST | `/api/labs/improve-prompt` | AI-assisted prompt improvement (needs `result_id` of winner) |
| GET | `/api/labs/results/{id}/scorm` | Download result as SCORM 1.2 `.zip` |
| GET | `/api/labs/results` | List recent results (optional `?phase=&resource_type=&limit=`) |
| PATCH | `/api/labs/results/{id}/select` | Mark result as selected |

### POST `/api/labs/generate` payload
```json
{
  "phase": "engage",
  "resource_type": 1,
  "concept": "Redes Neuronales",
  "model_configs": [
    { "model_id": "llama-3.3-70b-versatile", "provider": "groq", "prompt_text": "..." },
    { "model_id": "deepseek/deepseek-r1:free", "provider": "openrouter", "prompt_text": "..." }
  ]
}
```

---

## Prompt template format

All prompts use `{concept}` as a literal placeholder:

```
Genera un cómic interactivo HTML5 sobre el concepto: {concept}
```

At generation time, `{concept}` is replaced with the actual concept entered by the user.
The DB stores the template with the placeholder; never the substituted text.

---

## Production override

When an active version exists in `prompt_versions`, **it overrides the hardcoded Python prompt**:

```python
# engage_router.py (simplified)
active = get_active_prompt("engage", resource_type, db)
prompt = active or hardcoded_prompt_function(resource_type, concept)
```

Activating a version in Labs immediately affects all new OVA generations — no deployment needed.

---

## Available models

| Label | Model ID | Provider |
|---|---|---|
| Llama 3.3 70B Versatile | `llama-3.3-70b-versatile` | groq |
| Llama 3.1 8B Instant | `llama-3.1-8b-instant` | groq |
| Gemma 2 9B | `gemma2-9b-it` | groq |
| Qwen QwQ 32B | `qwen-qwq-32b` | groq |
| GPT-OSS 120B | `openai/gpt-oss-120b` | groq |
| Qwen3 Coder (free) | `qwen/qwen3-coder:free` | openrouter |
| Gemma 3 27B (free) | `google/gemma-3-27b-it:free` | openrouter |
| Llama 3.3 70B OR (free) | `meta-llama/llama-3.3-70b-instruct:free` | openrouter |
| DeepSeek R1 (free) | `deepseek/deepseek-r1:free` | openrouter |

---

## Quality checks

Each generated HTML is evaluated on three criteria:

| Check | Pass condition |
|---|---|
| `cdn_ok` | No `jsdelivr`, `cdnjs`, `unpkg.com`, `jquery.min.js`, `bootstrap.min`, `googleapis.com/ajax`, or `maxcdn` found |
| `scorm_ok` | Contains `_scormInit`, `_scormComplete`, and `cmi.core.lesson_status` |
| `min_length_ok` | `len(html) >= 1000` |

Checks run both server-side (stored in `lab_results.quality_checks`) and client-side (live badges in UI via `frontend/src/lib/labQuality.js`).

---

## Frontend file layout

```
frontend/src/
  lib/labQuality.js                    — checkHtmlQuality(html) → {cdn_ok, scorm_ok, ...}
  services/labsService.js              — all HTTP calls to /api/labs/*
  hooks/
    useLabVersions.js                  — prompt text state, versions CRUD
    useLabGeneration.js                — composes useLabVersions; models, generation, winner
  components/labs/
    PhaseResourceSelector.jsx          — ENGAGE/EXPLORE resource type grid
    PromptEditor.jsx                   — textarea + version history list
    ModelSelector.jsx                  — two <select> grouped by provider
    ResultCard.jsx                     — sandboxed iframe + quality badges + actions
    ResultsPanel.jsx                   — two-column grid + AI improve panel
  pages/LabsPage.jsx                   — three-column layout composing all components
```

---

## Resource type classification

Generation logic differs by resource type:

| Set | Types | Behavior |
|---|---|---|
| `ENGAGE_CODE` | {10} | Direct HTML output (simulator) |
| `ENGAGE_PODCAST` | {3} | Monologue generation → wrapped in podcast card HTML |
| All other engage | 1,2,4–9 | 2-step: JSON content → HTML via code agent |
| `EXPLORE_CODE` | {1, 6, 10} | Direct HTML output |
| All other explore | 2–5, 7–9 | 2-step: JSON content → HTML via code agent |
