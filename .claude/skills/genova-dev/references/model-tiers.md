# Model-assignment heuristic per task

Complexity of the task, not the agent's role. An `implementer` can run on a
fast/cheap model for a mechanical task and on a stronger model for an
architectural one — there's no fixed role→model mapping.

## Tier names (logical) vs Cursor model slugs

Logical tiers used in plan-ledgers: **haiku** / **sonnet** / **opus**.

When running inside **Cursor** (Task / subagent `model` parameter), map:

| Logical tier | Cursor preference (2026-07) | Use for |
|---|---|---|
| haiku | `composer-2.5-fast` | Mechanical, 1-file, docs-only, lint |
| sonnet | `cursor-grok-4.5-high-fast` (default) | Standard feature + tests |
| opus | `cursor-grok-4.5-high-fast` or escalate to strongest available listed in the Task tool | Architecture, security, ambiguous planning |

If the user **explicitly** asks for Claude / GPT / Codex tiers, use only slugs
allowed by the current Task tool enum — never invent model ids.

Claude Code / other harnesses may still pass literal `haiku`/`sonnet`/`opus`;
keep ledger labels as logical tiers and map at dispatch time.

## haiku — mechanical / 1 file / low risk

Use when the task is:
- Rename/move code without changing behavior.
- Add a test that follows a pattern already existing in the same file/folder.
- Lint/format fix, import cleanup, remove already-detected dead code.
- Edit 1 `.ts`/`.py` file with unambiguous instructions (you already know the exact diff).
- Update documentation / skill references that only reflect a change already made.
- Docker compose one-liner fixes (e.g. remove `pnpm install` from `command`).

GenOVA examples: adding a missing `@limiter.limit` to an existing endpoint;
extracting a >200-line function in `helpers.py`; renaming a signal in a component;
adding `hlmH1` to a single auth title.

## sonnet — standard feature + tests

Use when the task is:
- A new Angular component + its test (known pattern: standalone, OnPush,
  signals, follows `genova-angular` conventions).
- A new FastAPI endpoint + service + test (known pattern: follows
  `genova-fastapi`, `commit_or_500`, rate limit).
- Refactor within a single domain/feature (doesn't cross layers or modules).
- Bug fix with an already-identified root cause, touching 2-4 files.
- Multi-stage Dockerfile + nginx for frontend when the pattern is already
  documented in `genova-angular/references/docker-and-build.md`.

This is the default for "implement feature X" when X already has a spec or
a clear pattern to follow.

## opus — architecture / cross-domain / security / ambiguous scope

Use when the task:
- Crosses ≥2 domains or layers (frontend+backend, or ≥2 backend packages).
- Touches authentication, JWT, cookies, rate limiting, schema migrations, or
  anything flagged in "Security rules (hard)" in `CLAUDE.md`.
- Introduces or redesigns observability (structlog pipeline, LangSmith wiring,
  secret-handling) — see `genova-fastapi/references/observability.md`.
- Is an architectural migration/refactor (screaming architecture, moving code
  between `core/` and `features/`, changing the router→service→model pattern).
- Has ambiguous scope: the user didn't fully specify the expected result, or there
  are several reasonable ways to solve it and a trade-off needs deciding.
- Is the **planning task itself** (stronger model writes the plan-ledger, even
  though child tasks may drop to sonnet/haiku).
- Is a full `genova-audit` pass (especially security / cross-cutting).

## Escalation rule

If mid-task, on sonnet/haiku, architectural ambiguity or an unforeseen security
risk shows up: stop, escalate the task to opus (new subagent or resume with a
stronger model), document the reason in the task file `T<n>.md`.

## Cost vs. coverage

Don't over-assign opus by default — it adds unnecessary cost on mechanical tasks.
Don't under-assign haiku to ambiguous tasks — it generates rework that's more
expensive than having used sonnet/opus from the start. When torn between two
tiers, go up one.
