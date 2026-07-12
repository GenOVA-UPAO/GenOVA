# Orchestration protocol: plan-ledger + subagents per model

Extends the pattern already present in `.claude/agents/leader.md` (anti-telephone
rule: subagents write to files and return a one-line receipt) with explicit
model assignment and per-task memory.

## The plan-ledger

A file `sdd/plans/<date>-<slug>.md` (same directory the SDD flow uses,
see `sdd/plans/2026-07-06-plan-maestro-generacion-ova.md` as precedent). It is the
**single source of truth** for plan state — don't rely on chat history.

Structure: see [plan-template.md](plan-template.md).

Alongside the ledger, create `sdd/plans/<slug>/tasks/` — a folder with one `T<n>.md`
file per task. That file is the subagent's memory/scratchpad: decisions made,
files touched, commands run, verification evidence. The subagent **must
write it before returning its receipt** — if it didn't, the task isn't really
closed even if chat says "done".

## Dispatching subagents

1. Read the ledger's task table. Compute topological order by `depends-on`.
2. For each topological "level" (tasks with no pending dependencies among them):
   dispatch **all in parallel** — one reply, multiple calls to the
   `Agent` tool. Don't serialize independent work.
3. Each `Agent` call uses:
   - `model`: the Model column value for that row (explicit override).
   - `prompt`: self-contained context (the task hasn't seen the rest of the
     conversation) — target files, relevant spec/checkpoint, the path of the
     task file `T<n>.md` where it must write its memory, and the instruction
     to end with a one-line receipt.
   - `subagent_type`: `implementer` for code tasks, `explorer` for
     prior read-only exploration, `reviewer` if the task is a review.
4. On receiving the result: update the ledger row (`state: done`/`blocked`),
   NEVER copy the subagent's long detail into chat — the detail lives in `T<n>.md`.
   Report the one-line receipt per task to the user.
5. If a task ends up `blocked`: don't continue with tasks that depend on it. Report
   the block and decide (reassign to a higher model, ask the user for input, or
   replan that branch of the ledger).

## Human gate

The full plan-ledger (table + models + order) is presented to the user **before**
dispatching the first subagent — consistent with the `spec_ready` gate of the SDD
flow in `AGENTS.md`. Don't start executing tasks without that explicit approval.

## Integration with existing SDD

- If the large task corresponds to a feature with an ID (HU/EN/TA) in `feature_list.json`,
  the plan-ledger complements — not replaces — the spec. The spec defines the WHAT (specs in
  `sdd/specs/`), the ledger defines the HOW work is split across subagents.
- For a detailed TDD breakdown of a single task, the already-installed skill
  `sp-writing-plans` can generate the implementation plan for that specific task.
- For ≥3 independent tasks within a single feature, skill `sp-subagent`
  already covers that case — this skill (`genova-dev`) generalizes the same pattern
  to the whole plan-ledger, with explicit model tiers.

## Closing the plan

Once every ledger row is `done`:
1. Run full `./verify.ps1` (not `-Quick`) against the combined result.
2. Mark the ledger `state: closed` with the date.
3. Propose the commit per [commit-rules.md](commit-rules.md) — wait for explicit
   human approval before `git commit`, never `git push`.
