# Harsh lens — adapted from thermo-nuclear-code-quality-review

Based on the user's personal skill (`thermo-nuclear-code-quality-review`),
adapted to a full-repo audit context (not just a diff/PR) in GenOVA. Use it for
**structural** audit findings, not for the purely mechanical checkpoints
(those go in `audit-checklist.md`).

## Posture

Be ambitious. Don't settle for "this could be a bit cleaner" — look for
"code judo": a restructuring that preserves behavior and makes the
implementation dramatically simpler, smaller, more direct, and more elegant. If
there's a clear path involving restructuring part of the code, report it with
conviction, not as a tentative suggestion.

## Guiding questions per area of the repo

**Frontend (`features/*`, `core/*`)**
- Is there a component/service that could disappear if state were reframed?
- Is there domain logic living in `core/` that should live in its own
  `features/<domain>/` (see `docs/arquitectura-frontend-deuda.md` — debt
  already documented, don't repeat it in new code)?
- Are there `gn-*` wrappers that are just a pass-through of a `libs/ui/`
  primitive adding nothing?

**Backend (`router.py`/`service.py`/`models.py` per domain)**
- Is there business logic leaked into the router that should be in the service?
- Is there a `helpers.py`/`utils.py` that became a kitchen-sink of ≥2
  unrelated concepts?
- Is there sequential orchestration of independent calls that could be
  parallelized (e.g. several external API calls in an LLM pipeline)?

**Both layers**
- Did the file cross the line limit (250/200) through organic growth with
  nobody splitting it? Ask explicitly whether it should be decomposed.
- Are there special-case conditionals bolted into the middle of an
  already-busy function, instead of a dedicated function/state machine?
- Are there casts, TS `any`/`unknown`, or weak Python types hiding an
  invariant that should be explicit?
- Are there partial updates that leave state half-applied (non-atomic)
  when they could be atomic?

## What NOT to do

- Don't report a structural finding without proposing at least one concrete
  remedy direction (remove a layer, merge modules, change the state model) —
  "code judo" means proposing the move, not just pointing at the pain.
- Don't inflate style nits to "high" severity just to apply this lens
  harshly — the harshness is about structure, not personal style taste.
- Don't propose a full rewrite of a large module when a surgical remedy
  (extract 2-3 functions) solves the real problem — ambitious doesn't mean
  "rewrite everything".

## Preferred remedies (inherited from the original skill)

- Delete a whole indirection layer instead of polishing it.
- Reframe the state model so conditionals disappear instead of being
  centralized.
- Change the ownership boundary so the feature becomes a natural extension
  of an existing abstraction.
- Turn special-case logic into a simpler default flow.
- Extract a reusable helper or pure function.
- Split a large file into smaller, focused modules.
