---
name: subagent-driven-development
description: Use when executing implementation plans with ≥3 independent tasks. Dispatch a fresh implementer subagent per task, review after each, broad review at end. Only use when tasks are genuinely independent (no tight coupling).
---

# Subagent-Driven Development

Execute plan by dispatching a fresh implementer subagent per task, a task review after each, and a broad whole-branch review at the end.

**Core principle:** Fresh subagent per task + task review (spec + quality) + final review = high quality, fast iteration.

**Continuous execution:** Do not pause between tasks. Execute all tasks from the plan without stopping. Only stop for: BLOCKED status you cannot resolve, genuine ambiguity, or all tasks complete.

## When to Use

- Have implementation plan (from `sp-writing-plans` skill)
- Tasks are mostly independent (not tightly coupled)
- ≥3 tasks in the plan

**vs. Sequential execution (default implementer flow):**
- Use sequential (default) for ≤2 tasks or tightly coupled tasks
- Use this skill for ≥3 independent tasks to preserve context

## The Process

```
Read plan, note global constraints, create todos
    ↓
Per Task:
  Dispatch implementer subagent with task brief
    ↓
  Implementer asks questions? → Answer, provide context
    ↓
  Implementer implements, tests, commits, self-reviews
    ↓
  Dispatch task reviewer subagent (diff)
    ↓
  Reviewer approved? → No → Dispatch fix subagent → Re-review
                     → Yes → Mark task complete → Next task
    ↓
All tasks done → Dispatch final code reviewer
    ↓
Final review approved → Done → tell leader
```

## Subagent Dispatch Template

When dispatching each implementer subagent, provide:
1. Task brief (full task text from plan)
2. Global constraints (architecture rules, 200-line limit, security rules)
3. Context (what prior tasks produced — exact function names, file paths)
4. Verification command: `./verify.ps1 -Quick`

## Task Reviewer Prompt

After each task, dispatch a reviewer subagent with:
1. Task brief (what was requested)
2. Diff (git diff of changes)
3. Implementer report
4. Global constraints

Reviewer checks: spec compliance, code quality, no regressions.

## GenOVA-specific constraints for subagents

- Architecture: services→hooks→pages (frontend), router→service→model (backend)
- Max 200 lines/file (Biome hard error in frontend)
- Security: no `str(e)` to client, no tokens in HTTP responses
- Verification: `./verify.ps1 -Quick` must pass before each commit
- No skipping the spec — implement exactly what the HU/TA/BU spec says
