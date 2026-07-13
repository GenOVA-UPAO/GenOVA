---
name: genova-audit
description: Full, harsh audit of the GenOVA repo — walks CHECKPOINTS.md C1-C14, screaming architecture, dead code, security, and applies a thermo-nuclear-style "code judo" lens (ambitious structural simplification, not just nits). Produces a severity-ranked report with file:line in sdd/audits/. Manual invocation only (disable-model-invocation).
disable-model-invocation: true
metadata:
  author: GenOVA local
  version: '1.2'
  source: local/genova
---

# GenOVA Full Audit

**Language:** Reason and write instructions in English. Produce all user-facing output
in Spanish — chat replies, the audit report (`sdd/audits/`), progress notes. Never
translate literal protocol tokens. See `AGENTS.md` §Language policy.

A full-repo audit, not a review of a single diff. Combines the objective
checklist in `CHECKPOINTS.md` with an ambitious quality lens (in the style of
`thermo-nuclear-code-quality-review`, the user's personal skill) — passing the
checkpoint isn't enough, you must also ask whether the structure could be
dramatically simpler.

## Protocol

1. **Scope**: by default, the whole repo (`frontend/src/`, `backend/`, excluding
   `node_modules`, `.venv`, `dist`, `archive/`). If the user asked for a specific
   scope (one feature, one domain), honor it.
2. **Executable checklist**: walk C1–C14 with concrete commands, not just
   reading. Read [audit-checklist.md](references/audit-checklist.md).
3. **For structural findings** (growing files, spaghetti, useless wrappers,
   broken layers): apply the ambitious lens. Read [thermo-nuclear-lens.md](references/thermo-nuclear-lens.md).
4. **Classify each finding** by severity before reporting it. Read
   [severity-rubric.md](references/severity-rubric.md).
5. **If auditing Docker / logs / LangSmith / design tokens**, also apply
   [observability-docker-checks.md](references/observability-docker-checks.md).
6. **If auditing frontend data layers / auth cookies / forms**, also apply
   [frontend-server-state-checks.md](references/frontend-server-state-checks.md).
7. **If the repo is large**, dispatch read-only subagents per domain
   (frontend / backend / security / architecture) in parallel, using the
   model heuristic from the `genova-dev` skill (see its
   `.claude/skills/genova-dev/references/model-tiers.md` —
   code-analysis auditing is generally sonnet/Grok; escalate to opus-tier
   if the domain is security or cross-cutting architecture). Each subagent
   returns findings with `file:line`, not long prose.
8. **Consolidate** into a single report following the template. Read
   [report-template.md](references/report-template.md). Save to
   `sdd/audits/<date>-audit.md` (same directory as `sdd/audits/2026-07-06-ova-recursos-audit.md`).

## Principles of the harsh lens (summary)

- Don't stop at "this could be a bit cleaner" — look for a move that
  **eliminates** a whole layer/conditional/wrapper.
- A file that crosses the limit (250 FE / 200 BE) without a strong reason is a
  smell, not a detail — ask whether it should be split before accepting it.
- Ad-hoc conditionals bolted onto code that didn't have them = a design
  problem, not a style nit.
- Prefer eliminating complexity over rearranging it.
- Every finding carries `file:line` and a concrete failure scenario — no
  vague "could be improved" observations.

## Expected output

An actionable, severity-prioritized report, with quick wins separated from
deep structural debt. It's not a style list — it's an audit the user can
turn directly into tasks (potentially via `genova-dev` if the remediation is large).
