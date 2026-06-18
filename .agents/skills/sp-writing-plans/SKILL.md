---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code. Generates a detailed implementation plan with bite-sized TDD tasks, file structure, and interfaces.
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

**Save plans to:** `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`

## Scope Check

If the spec covers multiple independent subsystems, suggest breaking into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. Max 200 lines/file (GenOVA hard rule).

## Task Right-Sizing

A task is the smallest unit that carries its own test cycle and is worth a fresh reviewer's gate. Fold setup, configuration, and scaffolding into the task whose deliverable needs them.

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

## Global Constraints

[The spec's project-wide requirements — one line each, with exact values from the spec.
GenOVA: max 200 lines/file, services→hooks→pages (frontend), router→service→model (backend),
never str(e) to client, rate-limit new endpoints, no tokens in HTTP responses.]

---
```

## Task Structure

```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py`
- Test: `tests/exact/path/to/test.py`

**Interfaces:**
- Consumes: [what this task uses from earlier tasks — exact signatures]
- Produces: [what later tasks rely on — exact function names, parameter and return types]

- [ ] **Step 1: Write the failing test**
[actual test code]

- [ ] **Step 2: Run test to verify it fails**
Run: `./verify.ps1 -Quick`

- [ ] **Step 3: Write minimal implementation**
[actual implementation code]

- [ ] **Step 4: Run test to verify it passes**
Run: `./verify.ps1 -Quick`

- [ ] **Step 5: Commit**
```bash
git add <files>
git commit -m "feat: <description>"
```
```

## No Placeholders

Never write: "TBD", "TODO", "Add appropriate error handling", "Write tests for the above" without actual test code. Every step must contain the actual content.

## Self-Review

After writing the plan, check against the spec:
1. **Spec coverage:** Every requirement maps to a task?
2. **Placeholder scan:** Any red flags from above?
3. **Type consistency:** Method signatures consistent across tasks?

## GenOVA-specific constraints

- Frontend: `services/*.js` → `hooks/use*.js` → `pages/*.jsx`. Max 200 lines/file.
- Backend: `routers/` → `services/` → `models.py`. Max 200 lines/file.
- Tests: BDD (cucumber-js frontend unit, pytest-bdd backend). Run `./verify.ps1 -Quick` to check.
- Security: no `str(e)` to client, rate-limit new endpoints, no tokens in HTTP responses.
