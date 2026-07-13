# Plan-ledger — Migración logging stdlib → structlog kv-style + wiring Logfire

Origen: `C:\Users\JeffryRU\.claude\plans\playful-fluttering-teapot.md` (plan mode).
72 archivos backend, 207 call-sites de logging, todos migrados a `structlog.get_logger`
con kv-pairs. Batch F cablea `logfire.StructlogProcessor()` para que las líneas
kv lleguen a Logfire como campos SQL-queryables.

## Tareas

| # | Batch | Dominio | Archivos | Modelo | Estado | depends-on |
|---|---|---|---|---|---|---|
| T1 | A | Prometheus | 16 archivos | sonnet | done | — |
| T2 | B | LLM | 22 archivos | sonnet | done | — |
| T3 | C | Generation | 11 archivos | sonnet | done | — |
| T4 | D | OVA+Users+Roles | 17 archivos | sonnet | done | — |
| T5 | E | Auth+RAG+Core+misc | 17 archivos | sonnet | done | — |
| T6 | F | Observabilidad Logfire | logging_setup.py, observability.py, main.py | sonnet | done | T1,T2,T3,T4,T5 |

83 archivos migrados (T1-T5) + observability.py (T6) = 84 archivos totales,
logging stdlib → structlog kv-style. `logging.getLogger` solo queda en
`logging_setup.py` (infra + fallback pre-pipeline) y `tests/test_logging_setup.py`
(test deliberado de integración stdlib), como diseñado.

Fix post-T6 (leader): `observability.py:34,49-53` quedó con `%s` posicional pese
al swap de logger — corregido a kv (`environment=`, `project=`). Fix post-batches
(leader): 9 archivos con drift de formato introducido por la migración
(`llm/phases/*_router.py` x5, `ova/router.py`, `prometheus/engine/refine.py`,
`rag/pipeline.py`, `rag/retriever.py`) — `ruff format` aplicado solo a esos,
sin tocar el drift preexistente (34 archivos, fuera de alcance de este plan).

Reglas de conversión, archivos excluidos (`logging_setup.py`/`log_redaction.py`),
y detalle completo de cada batch: ver plan original arriba.

## Verificación final (tras T6)

1. `ruff check backend/` + `ruff format --check backend/`
2. `pytest backend/tests/test_log_redaction.py -v`
3. Grep cierre: `logging.getLogger(__name__)` solo en logging_setup.py/log_redaction.py
4. Backend arriba + `/health` + confirmar kv en consola
5. `./verify.ps1 -Quick`

## Commit (tras aprobación explícita, al cierre)

1. `refactor(logging): migrar backend de stdlib logging a structlog kv-style`
2. `feat(observability): enviar logs kv a Logfire vía StructlogProcessor`
