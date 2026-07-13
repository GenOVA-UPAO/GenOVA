---
name: genova-dev
description: GenOVA master development workflow. Sizes the task (trivial/medium/large), activates plan mode for large tasks, generates a Markdown plan-ledger with a subtask table and assigned model (haiku/sonnet/opus), dispatches subagents with their own per-task memory, and applies the project's commit rules. Use when implementing features, refactors, or any non-trivial change in GenOVA.
metadata:
  author: GenOVA local
  version: '1.1'
  source: local/genova
---

# GenOVA Dev Workflow

**Language:** Reason and write instructions in English. Produce all user-facing output
in Spanish — chat replies, specs (`sdd/specs/`), docs (`docs/`), progress notes, backlog,
commit messages. Never translate literal protocol tokens. See `AGENTS.md` §Language policy.

This skill is GenOVA's own **dev orchestration layer**. It does not replace the SDD
agents (`leader`, `implementer`, `reviewer` in `.claude/agents/`) — it gives them a
concrete protocol for sizing, planning, and dispatching subagents per model.

For layer-specific code conventions, delegate to:
- Angular frontend → skill `genova-angular`
- FastAPI backend → skill `genova-fastapi`
- Full repo audit → skill `genova-audit` (manual, `/genova-audit`)

Infra / compose / verify details: Read
[docker-compose-workflow.md](references/docker-compose-workflow.md).
Model mapping (including Cursor Composer / Grok): Read
[model-tiers.md](references/model-tiers.md).

## 1. Size the task

Before touching code, classify the request:

| Size | Signals | Action |
|---|---|---|
| **Trivial** | 1 file, mechanical change, no ambiguity (typo, rename, 1 line) | Execute directly, no plan |
| **Medium** | 2-4 files, one domain, known pattern (1 component + test, 1 endpoint + test) | Short inline plan (step list in the reply), no plan-ledger `.md` |
| **Large** | ≥5 files, ≥2 domains/layers, new architecture, ambiguous scope, or touches security/auth/DB | **Activate plan mode** (step 2) |

When in doubt, go up a level — over-planning a medium task is cheaper than
under-planning a large one.

## 2. Large task → plan mode + plan-ledger

1. Enter plan mode (`EnterPlanMode` if available, or whatever plan-mode mechanism
   is active in the session).
2. Explore before planning: use the `explorer` agent (`.claude/agents/explorer.md`) or
   parallel Explore-agents to map files/dependencies/risks.
3. Write the **plan-ledger** as a `.md` file at `sdd/plans/<date>-<slug>.md`
   (same directory the existing SDD flow uses, e.g. `sdd/plans/2026-07-06-plan-maestro-generacion-ova.md`).
   Full template: Read [plan-template.md](references/plan-template.md).
4. The ledger includes a **task table** with an **assigned model** column
   (logical `haiku`/`sonnet`/`opus`; map to Cursor Composer/Grok per
   [model-tiers.md](references/model-tiers.md)) per task.
5. Human gate: present the plan-ledger and wait for approval before executing
   (consistent with the `spec_ready` gate of the SDD flow).

## 3. Execution: subagents per model + own memory

Once the plan is approved:

- Dispatch **one subagent per independent task** from the ledger, passing the `model`
  column value as an override (`model` parameter of the `Agent` tool).
- Each subagent gets its own task file `sdd/plans/<slug>/tasks/T<n>.md`
  as memory/scratchpad (decisions, files touched, evidence). The subagent
  **must write there before finishing**, not just return text in chat.
- Tasks with no dependencies between them → dispatch **in parallel** (one reply,
  multiple `Agent` calls). Tasks with `depends-on` → topological order.
- When each subagent finishes, update the ledger row (state `done`/`blocked`)
  and require a **one-line receipt** (`done -> …` / `blocked -> …`) — never let
  a subagent narrate at length in chat; the detail lives in its task file.
- Full protocol: Read [orchestration.md](references/orchestration.md).

## 4. Verification and close-out

- Each task self-verifies with `./verify.ps1` (or `-Quick` if the backend isn't up)
  before being marked `done` in the ledger.
- When all plan tasks are closed: run full `verify.ps1`, update
  `sdd/progress/current.md` if applicable, and **propose the commit — never
  run it without explicit approval**.
- GenOVA commit rules (Conventional Commits, no push, no `Co-Authored-By`,
  secret-scan hook): Read [commit-rules.md](references/commit-rules.md).

## When NOT to use plan mode

- Trivial changes (step 1).
- The user already gave you an explicit, approved plan.
- You're already inside a plan-ledger executing a child task (don't nest plans).
