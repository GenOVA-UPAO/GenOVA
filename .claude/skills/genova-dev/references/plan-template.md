# Plan-ledger template

Save at `sdd/plans/<YYYY-MM-DD>-<slug>.md`.

```markdown
# Plan — <short title>

## Context

<Why this change is being made, what prompted it, expected outcome. 2-5 sentences.>

## Scope

- In: <list>
- Out: <list>

## Task table

| ID | Description | Target files | Model | Role | Depends on | State | Task file |
|----|-------------|--------------------|--------|-----|------------|--------|-------------------|
| T1 | ... | `frontend/src/features/x/...` | sonnet | implementer | — | pending | `tasks/T1.md` |
| T2 | ... | `backend/x/router.py` | haiku | implementer | — | pending | `tasks/T2.md` |
| T3 | ... | cross-cutting | opus | implementer | T1, T2 | pending | `tasks/T3.md` |

Valid states: `pending` → `in_progress` → `done` | `blocked`.

## Execution order

- Level 0 (parallel): T1, T2
- Level 1 (after T1+T2): T3

## Verification

- Each task runs `./verify.ps1` (or `-Quick`) before being marked `done`.
- Plan close-out: full `./verify.ps1` + review of the relevant `CHECKPOINTS.md` items.

## Close-out

- [ ] All tasks `done`
- [ ] Full `verify.ps1` green
- [ ] Commit proposed to the user (not executed without approval)
```

## Task-file template (`tasks/T<n>.md`)

```markdown
# T<n> — <short description>

**Model**: <haiku|sonnet|opus>
**State**: pending

## Instructions received

<summary of what the subagent was supposed to do>

## Decisions made

- <decision 1 and why>

## Files touched

- `path/to/file.ts` — <what changed>

## Verification evidence

```
<relevant output from verify.ps1, pytest, ng test, etc.>
```

## Final receipt

`done -> <one line>` / `blocked -> <one line with the reason>`
```
