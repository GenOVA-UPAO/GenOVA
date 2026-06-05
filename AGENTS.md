# AGENTS.md — Mapa de navegación para agentes de IA

> Punto de entrada para cualquier agente que trabaje en este repositorio.
> Es un **mapa**, no una biblia. Lee solo lo que necesites cuando lo necesites.

---

## 1. Antes de empezar (obligatorio)

1. Lee `sdd/progress/current.md` — entiende en qué estado quedó la última sesión.
2. Lee `feature_list.json` — identifica features pendientes y su estado.
3. Ejecuta `./verify.ps1` — verifica que el entorno está verde antes de tocar código.
4. Lee `CLAUDE.md` (o `docs/labs.md` para la feature Labs) si necesitas contexto técnico.

## 2. Mapa del repositorio

| Archivo / carpeta | Qué contiene | Cuándo leerlo |
|---|---|---|
| `feature_list.json` | Lista de features con estado (`pending/spec_ready/in_progress/done/blocked`) | Siempre, al empezar |
| `skills-catalog.json` | Registro de skills disponibles/instaladas con triggers, sources y estado de seguridad | Al buscar o recomendar skills |
| `sdd/progress/current.md` | Estado de la sesión activa | Siempre, al empezar |
| `sdd/progress/history.md` | Bitácora append-only de sesiones anteriores | Si necesitas contexto histórico |
| `sdd/specs/<CODIGO>_<nombre>.md` | Specs de HU, EP, EN, RN | Antes de implementar |
| `sdd/tasks/<CODIGO>_<nombre>.md` | Specs de TA (tareas técnicas) | Antes de implementar TA |
| `sdd/bugs/<CODIGO>_<nombre>.md` | Specs de BU (defectos) | Antes de corregir bugs |
| `CLAUDE.md` | Comandos de arranque, contexto de arquitectura | Contexto general al inicio |
| `CHECKPOINTS.md` | Criterios objetivos de "estado final correcto" | Antes de declarar `done` |
| `docs/<tema>.md` | Documentación funcional/técnica por tema (la genera `doc_author`) | Al usar/entender una feature |
| `docs/README.md` | Índice de documentación (doc · tema · feature · fecha) | Para navegar las docs |
| `.claude/agents/` | Definiciones de subagentes (leader, explorer, spec_author, implementer, reviewer, skill-advisor, spec-sync, doc_author) | Si orquestas trabajo |
| `frontend/src/` | React 19 + Vite + Tailwind | Para implementar frontend |
| `backend/` | FastAPI + SQLAlchemy | Para implementar backend |
| `tests/` | BDD (cucumber-js E2E, pytest-bdd backend) | Para verificar |

## 3. Reglas duras (no negociables)

- **Una sola feature a la vez** (ejecución secuencial): no mezcles diffs de varias features en el mismo paso. En **modo batch** (ver `leader.md` Caso I) se implementan varias `spec_ready` de corrido, pero igual **una tras otra** (implementer → reviewer → verify por feature), nunca en paralelo ni en un diff mezclado.
- **No declares `done` sin tests verdes.** Ejecuta `./verify.ps1` antes de cerrar (también por cada feature del lote).
- **No saltes la fase de spec.** Toda feature `"sdd": true` pasa por `spec_author` con aprobación humana antes de tocar código.
- **No saltes la puerta humana.** El leader para en `spec_ready` y espera confirmación. En modo batch la puerta es **única al inicio del lote** (aprobación del plan ordenado); el `reviewer` y `verify.ps1` por feature siguen siendo obligatorios.
- **Documenta en tiempo real** en `sdd/progress/current.md`, no al final.
- **Si no sabes algo, busca en `CLAUDE.md`** antes de inventarlo.
- **Arquitectura GenOVA**: services → hooks → pages (frontend) · router → service → model (backend). No saltarse capas.

## 4. Flujo de trabajo (SDD)

```
[MENSAJE USUARIO]
       │
       ▼
  leader detecta tipo
       │
       ├─ Task con ID (HU-XXX, TA-XXX…) ─→ pregunta confirmación → spec_author
       ├─ Task sin ID ──────────────────→ sugiere TIPO-N → usuario confirma → spec_author
       ├─ Error/bug crítico ─────────────→ sugiere BU-N → usuario confirma → spec_author
       ├─ Skill request ────────────────→ skill-advisor → presenta resultado → [instala si humano aprueba]
       └─ Pregunta conceptual ───────────→ responde leader directamente

[SPEC]
  pending → [spec_author] → spec_ready → ⏸ HUMANO → in_progress
         → [implementer T1..Tn] → [reviewer] → done → ⏸ HUMANO → [doc_author] → docs/
```

### Flujo interno de spec_author (4 pasos estrictos)
1. **Asunciones** — lista todas las asunciones, pregunta cuáles rechazar
2. **Refinamiento** — una pregunta a la vez por asunción rechazada (barra de progreso)
3. **Confirmación** — espera "Ok" o "Adelante" antes de escribir
4. **Generación** — escribe el archivo en disco

## 5. Escalado de esfuerzo

| Complejidad | Subagentes |
|---|---|
| Trivial (1 archivo) | 1 spec_author → ⏸ → 1 implementer |
| Media (2-3 archivos) | 1 spec_author → ⏸ → 1 implementer → 1 reviewer |
| Compleja (refactor) | explorer → 1 spec_author → ⏸ → 1 implementer → 1 reviewer |
| Muy compleja | Divide en sub-features y aplica la tabla de nuevo |

**Lanza `explorer` automáticamente** cuando la feature cumpla ≥1 de:
- Toca más de 2 dominios (ej. auth + ova + scorm)
- Menciona refactor, migración, pipeline o cambio de arquitectura
- Involucra un servicio externo nuevo (LLM, storage, email)
- Descripción ambigua en scope o el usuario expresa incertidumbre
- Complejidad estimada ≥ 3 según criterios de `explorer.md`

## 6. Cierre de sesión

Antes de terminar:

1. Ejecuta `./verify.ps1` — todo verde.
2. Si la feature acabó: cambia `status: "done"` en `feature_list.json` y añade `"merge_commit": "<sha>"` con el hash del commit de cierre (trazabilidad git ↔ feature).
3. Si una feature llegó a `done`: ofrece generar/actualizar su doc en `docs/` con `doc_author` (no fuerza, pregunta). Si cambió interfaz pública ya documentada, `doc_author` actualiza la doc en vez de duplicar.
4. Mueve el resumen de `sdd/progress/current.md` al final de `sdd/progress/history.md`.
5. Vacía `sdd/progress/current.md` dejando solo la plantilla.
6. Propone commit al humano (conventional commits). Espera aprobación explícita.
7. No dejes `print()` de debug, archivos temporales ni TODOs sin contexto.

## 7. Si te bloqueas

- Relee la sección relevante de `CLAUDE.md`.
- Si una herramienta falla inesperadamente, **no improvises workaround**: documenta en `sdd/progress/current.md` con estado `blocked` y termina la sesión.

## 8. Compatibilidad multi-herramienta

Este repositorio soporta múltiples AI coding tools. `AGENTS.md` es la fuente de reglas compartida.

| Tool | Lee rules | Lee agents | Config |
|---|---|---|---|
| Claude Code | `CLAUDE.md` + `AGENTS.md` | `.claude/agents/` | Herramienta primaria |
| Codex CLI | `AGENTS.md` | — | Nativo |
| Opencode | `AGENTS.md` | `.opencode/agents/` (symlink) | `.opencode/opencode.json` |
| GitHub Copilot | `AGENTS.md` + `.github/copilot-instructions.md` | `.github/agents/sdd-leader.agent.md` | Workspace instructions |
| Antigravity | `GEMINI.md` → `AGENTS.md` | — | `GEMINI.md` |

### Symlink map

| Symlink | Apunta a | Creado por |
|---|---|---|
| `.claude/skills/<name>/` | `.agents/skills/<name>/` | `npx skills add` |
| `.opencode/agents/` | `.claude/agents/` | `scripts/setup-harness.ps1` |

**Post-clone en Windows**: ejecuta `scripts/setup-harness.ps1` para recrear symlinks.
Para verificar sin crear: `scripts/setup-harness.ps1 -Check`.
