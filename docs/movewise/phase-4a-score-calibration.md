# MoveWise Phase 4A: internal score calibration and insight foundation

## Status

Implemented and verified internally on 2026-07-19. A default-off research Results presentation candidate is now recorded in [Phase 4B](./phase-4b-score-results-activation.md); broader/public activation remains prohibited pending human comprehension review.

## Purpose

This slice turns ADR-006's score semantics into a deterministic, version-bound calculation for the current four-metro research cohort. The verified Decision Profile remains canonical. The score is a compact origin-relative summary, not a probability, percentile, universal city grade, ranking, or directive.

The internal adapter returns one immutable analysis containing:

- the verified point score and optional estimate range;
- the strongest supported improvement;
- the strongest supported tradeoff;
- the strictest active financial blocker;
- every unsupported score component; and
- the nearest exact financial assumption that would change the Decision Profile's condition.

No score or derived insight is rendered in Results in this slice.

## Versioned calibration

`MoveWiseScore.schemaVersion` is `1.0.0`. The initial calibration-only `scoreVersion` is `0.1.0`.

The point calculation begins at the origin-relative baseline of 50:

```text
raw = 50 + Financial Security + Daily-life Fit
value = clamp(raw, 1, 100), then apply the strictest registered blocker cap
```

Version `0.1.0` has four explicit component owners:

| Component           | Maximum contribution | Included metrics                              |
| ------------------- | -------------------: | --------------------------------------------- |
| Financial Security  |                  ±30 | Monthly cushion delta                         |
| Daily-life Fit      |                  ±20 | Commute time ±10; climate heat preference ±10 |
| Opportunity Context |                    0 | Unavailable in this version                   |
| Household Fit       |                    0 | Unavailable in this version                   |

An unavailable, excluded, or uncollected metric contributes zero. Its unused budget is not redistributed.

### Financial Security

One canonical financial materiality threshold equals 10 score points:

```text
roundHalfAwayFromZero(monthlyCushionDeltaCents × 10 / materialityThresholdCents)
```

The result is clamped to ±30. Housing is not separately scored, so affordability cannot be counted both as housing and as cushion.

### Daily-life Fit

Each active commute or climate metric uses the existing preference-transformed weighted contribution:

```text
roundHalfAwayFromZero(
  weightedContribution × 5 /
  (materialityThresholdBps × priorityMaterialityReferenceWeight)
)
```

The result is clamped to ±10 per metric. The calculation does not add a new climate model or use AI judgment.

### Blockers

Both registered severe financial blockers cap the final value at 59, preventing a favorable band:

- `negative_target_cushion`;
- `target_housing_burden_at_or_above_50_percent`.

The score retains every active blocker, its input paths, and evidence references even when multiple blockers share the same cap.

## Score range

The score range is an estimate-sensitivity envelope, not a confidence interval.

For every accepted, non-degenerate plausible range on a score-relevant financial input, the engine evaluates the Cartesian set of range endpoints through the same verified Decision Profile evaluator and score formula. It selects deterministic minimum and maximum scores and binds each to its input fingerprint.

- Fully confirmed inputs produce no range.
- A range that cannot change the score produces no displayed range.
- Missing probability distributions are never invented.
- The point score must fall inside the derived endpoints or evaluation fails closed.

## Personalized insight selection

Insights are selected from verified score contributions and Decision Profile breakpoints, never generated free-form:

1. Strongest improvement: largest positive available metric contribution, then stable metric ID.
2. Strongest tradeoff: most negative available metric contribution, then stable metric ID.
3. Active blocker: lowest score cap, then stable blocker code.
4. Missing components: all components whose score status is `unavailable`, in stable ID order.
5. Decision-changing assumption: an in-range money breakpoint first, then shortest exact-cent distance, input path, and breakpoint ID.

Each insight emits a stable message code plus exact evidence references. UI copy can explain the result later without changing its analytical meaning.

## Verification gates

The implementation tests:

- all score/band boundaries from 1 through 100;
- exact baseline and registered contribution budgets;
- rounding, clamping, missingness, exclusion, and no redistribution;
- blocker precedence;
- immutable input, benchmark, decision-rule, and score-version binding;
- deterministic estimate endpoints;
- income monotonicity and housing/expense anti-monotonicity;
- same-metro rejection;
- deterministic insight selection and evidence linkage; and
- real Austin→San Diego and San Diego→Austin recalculation, including reversed input and benchmark fingerprints.

The synthetic calibration fixture evaluates to 69 with an estimate-sensitivity range of 61–77. That fixture proves repeatability; it is not evidence that 69 is user-comprehensible.

## Deliberate exclusions and next gate

This slice does not add household or opportunity scoring, adaptive questions, a fifth metro, persistence, provider calls, AI-generated conclusions, or runtime/public API score activation.

[Phase 4B](./phase-4b-score-results-activation.md) now exposes the score only inside the default-off research Results experience with the relative meaning, origin comparison, range, evidence confidence, blockers, exact finances, strongest supported effect, unavailable components, and closest decision-changing assumption visible for human review. The closest threshold is fully contextualized in the opening explanation; the complete named-input list remains in What-if. The comprehension gate remains open until that review accepts the presentation. Copy and layout may change within Phase 4B; changing formula semantics requires a new score rule version and recalibration.
