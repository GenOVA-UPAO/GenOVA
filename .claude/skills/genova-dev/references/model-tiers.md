# Model-assignment heuristic per task

Complexity of the task, not the agent's role. An `implementer` can run on
haiku for a mechanical task and on opus for an architectural one — there's no fixed
role→model mapping.

## haiku — mechanical / 1 file / low risk

Use when the task is:
- Rename/move code without changing behavior.
- Add a test that follows a pattern already existing in the same file/folder.
- Lint/format fix, import cleanup, remove already-detected dead code.
- Edit 1 `.ts`/`.py` file with unambiguous instructions (you already know the exact diff).
- Update documentation that only reflects a change already made.

GenOVA examples: adding a missing `@limiter.limit` to an existing endpoint;
extracting a >200-line function in `helpers.py`; renaming a signal in a component.

## sonnet — standard feature + tests

Use when the task is:
- A new Angular component + its test (known pattern: standalone, OnPush,
  signals, follows `genova-angular` conventions).
- A new FastAPI endpoint + service + test (known pattern: follows
  `genova-fastapi`, `commit_or_500`, rate limit).
- Refactor within a single domain/feature (doesn't cross layers or modules).
- Bug fix with an already-identified root cause, touching 2-4 files.

This is the default for "implement feature X" when X already has a spec or
a clear pattern to follow.

## opus — architecture / cross-domain / security / ambiguous scope

Use when the task:
- Crosses ≥2 domains or layers (frontend+backend, or ≥2 backend packages).
- Touches authentication, JWT, cookies, rate limiting, schema migrations, or
  anything flagged in "Security rules (hard)" in `CLAUDE.md`.
- Is an architectural migration/refactor (screaming architecture, moving code
  between `core/` and `features/`, changing the router→service→model pattern).
- Has ambiguous scope: the user didn't fully specify the expected result, or there
  are several reasonable ways to solve it and a trade-off needs deciding.
- Is the **planning task itself** (opus writes the plan-ledger, even though
  child tasks may drop to sonnet/haiku).

## Escalation rule

If mid-task, on sonnet/haiku, architectural ambiguity or an unforeseen security
risk shows up: stop, escalate the task to opus (new subagent or
resume with `model: opus`), document the reason in the task file `T<n>.md`.

## Cost vs. coverage

Don't over-assign opus by default — it adds unnecessary cost on mechanical tasks.
Don't under-assign haiku to ambiguous tasks — it generates rework that's more
expensive than having used sonnet/opus from the start. When torn between two
tiers, go up one.
