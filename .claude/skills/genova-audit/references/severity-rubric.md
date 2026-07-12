# Severity rubric

## Critical

- Any C4 (security) violation: endpoint without rate limiting exposed to
  external input, `str(e)` leaked to the client, secret logged, reset
  token/OTP returned in an HTTP response, server-only key exposed as `VITE_*`.
- Breaking layer direction in a way that introduces real risk (router with
  direct SQL bypassing service validation; page fetching directly without
  going through `apiFetch`/cookies).
- C14 broken in a way that can corrupt data (delete that doesn't cascade and
  leaves orphans, or a cascade that over-deletes).
- A real import cycle that breaks the build or causes non-deterministic behavior.

## High

- A file that exceeds the line limit (250 FE / 200 BE) without a strong
  structural justification.
- Spaghetti: ad-hoc conditionals bolted onto an unrelated flow, domain
  logic leaked into `core/`.
- Significant dead code (an entire function/component with no consumers).
- Missing test for an `R<n>` criterion of a spec (C5).
- Business logic/validation duplicated in ≥2 places (C10).

## Medium

- Wrapper/abstraction that adds no value (identity wrapper, indirection
  layer for no reason).
- Incomplete responsive support (C13) on a secondary, non-critical view.
- Ownerless TODO/FIXME but low risk.
- Folder/file name that doesn't reflect the domain (minor C7 violation).

## Low

- Style nits that ESLint/ruff don't catch but affect readability.
- A simplification opportunity that helps but isn't urgent.
- Outdated documentation that doesn't block development (e.g. already-known
  stale references like `AGENTS.md` mentioning React).

## Reporting rule

Every finding must have: `file:line`, severity, one-line description,
and a **concrete scenario** for why it matters (what breaks, for whom, under
what condition) — "this doesn't follow the convention" isn't enough. If a
concrete failure scenario can't be articulated, lower the severity or don't
report it.
