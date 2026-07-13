# LangGraph / Prometheus — GenOVA conventions

**Language:** English (skill reference). Sources: LangGraph docs (checkpointers,
`thread_id`, PostgresSaver) + GenOVA `prometheus/engine/*`.

## Role in GenOVA

Prometheus orchestrates OVA generation as a LangGraph graph:

- Entry: `prometheus.engine.graph.invoke_ova_generation`
- Engines: legacy **phases** graph (`build_ova_graph`) or **workpool**
  (`build_workpool_graph`) selected via `settings.ova_engine`
- Fake path: `LLM_FAKE=1` → `fake_invoke_ova_generation` (no provider calls)

## Invoke config (required pieces)

LangGraph persistence requires `thread_id` in config:

```python
config = {
  "configurable": {"thread_id": thread_id},
  "max_concurrency": N,  # caps parallel Send/fan-out workers
  "tags": [...],         # GenOVA: prometheus / ova-generation / env
  "metadata": {...},     # non-PII only
}
```

GenOVA builds this via `core.logging_setup.build_invoke_config` so LangSmith
(opt-in) receives useful tags without emails/prompts/keys.

## Checkpointers

- Dev / fallback: `MemorySaver`
- Prod-capable: `PostgresSaver` from `langgraph-checkpoint-postgres`
  (see `prometheus/engine/checkpointer.py`)

Docs pattern:

```python
graph = builder.compile(checkpointer=checkpointer)
graph.invoke(state, {"configurable": {"thread_id": "…"}})
```

Resume = re-invoke with the same `thread_id`; nodes skip work already marked
done in GenOVA's job/result bookkeeping.

## Workpool vs phases (product knowledge)

| Engine | Idea |
|---|---|
| phases | Concierge → phase nodes → critic per phase → repair → editor → assemble |
| workpool | Concierge fans out `Send("resource_worker", …)` then collect → one critic → repair → editor → assemble |

Default concurrency: `settings.ova_gen_concurrency`. Do not hardcode thread
pool sizes in nodes when `max_concurrency` already limits the graph.

## Observability overlap

| Concern | Tool |
|---|---|
| Graph traces | LangSmith (`init_langsmith`, env `LANGSMITH_*`) |
| HTTP/SQL/OpenAI spans | Logfire |
| Stdout structured logs | structlog |
| Exceptions | Sentry |

Details: [observability.md](observability.md).

## Security / R8 on graph code

- Never log full prompts with PII, API keys, or cookies.
- Metadata/tags: `thread_id`, `env`, component name — not user email.
- Nodes call LLM helpers that already respect enabled-model / fallback config.

## Testing

- Prefer unit tests on pure helpers / workpool builders (`tests/test_workpool.py`).
- Integration with real Postgres checkpointer only when `TEST_DATABASE_URL` is set.
- With `LLM_FAKE=1`, asserts should not require LangSmith or provider keys.

## Anti-patterns

- Compiling without a `thread_id` when a checkpointer is attached.
- Putting secrets in LangGraph `metadata`.
- Reintroducing per-phase ThreadPools that ignore `max_concurrency`.
- Calling providers directly from routers (must stay in prometheus/generation).
