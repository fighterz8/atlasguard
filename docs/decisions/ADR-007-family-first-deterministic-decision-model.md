# ADR-007: Evolve MoveWise as a family-first deterministic decision model

## Status

Accepted — product direction and all 24 calibration outcomes confirmed; exact rule `0.2.0` mechanics remain pending.

## Date

2026-07-19

## Context

MoveWise already evaluates exact finances, supported daily-life comparisons, user preferences, evidence confidence, decision stability, financial blockers, and exact decision thresholds. Score rule `0.1.0` proves deterministic origin-relative scoring, but Household Fit and Opportunity Context remain unavailable and the current question flow does not distinguish family and individual applicability.

Nick confirmed these priorities:

1. Primarily answer whether a move is likely better and what improves or gets harder; decision-changing conditions are a secondary explanation.
2. Calibrate families first and individuals second, with mode-specific Wizard applicability.
3. Let severe financial deterioration override lifestyle upside, with a sufficient final explanation.
4. Use synthetic fixtures proposed by Dawn and reviewed by Nick before changing the runtime rule.
5. Optimize first for user value, second for commercial differentiation, and third for portfolio value.

## Decision

MoveWise will evolve through a transparent, versioned deterministic model rather than a predictive model.

- The verified Decision Profile remains canonical; the MoveWise Score remains secondary.
- Family and individual modes control applicability, not automatic favorability.
- Exact financial safety gates run before weighted contributions.
- Registered severe financial blockers prevent a favorable result even when lifestyle signals improve.
- Explicitly unmet essential requirements may cap favorability. Unresolved essential requirements produce a conditional result that clearly states what happens if confirmation is not supplied.
- All scored metrics have one owning component and versioned materiality rules.
- Missing evidence does not redistribute contribution budgets or masquerade as similarity.
- Every material result remains traceable to accepted inputs, evidence, transformations, rules, and versions.
- The strongest favorable condition is `Likely a better move`, qualified by `under these assumptions` in the final review.
- No score rule `0.2.0` implementation begins until accepted outcomes are translated into machine-readable fixtures and exact mechanics pass a separate design gate.

## Alternatives Considered

### Pure weighted score

- **Pros:** Simple implementation and easy aggregation.
- **Cons:** Allows serious financial or family constraints to be averaged away; invites false precision.
- **Rejected:** High-stakes constraints need explicit precedence rather than larger weights.

### Predictive machine-learning model

- **Pros:** Could eventually learn complex relationships from real outcomes.
- **Cons:** No adequate longitudinal outcome corpus; difficult to explain; high bias and leakage risk.
- **Rejected for now:** Data and validation maturity do not support the claim.

### Universal city recommender

- **Pros:** Broader discovery experience and potentially larger acquisition funnel.
- **Cons:** Different product, much larger evidence surface, ranking incentives, and loss of origin/user specificity.
- **Rejected:** MoveWise remains a known-destination pre-commitment validator.

### Family-only product

- **Pros:** Sharper initial audience and simpler calibration.
- **Cons:** Unnecessarily excludes individuals while most financial and daily-life contracts are shared.
- **Rejected:** Families are first, but individual mode remains a supported applicability branch.

## Consequences

- Calibration fixtures and human outcome judgments become a required design input, not merely tests written after implementation.
- Question definitions must declare whether they affect an input, component, blocker, confidence/range rule, or insight.
- Family factors should begin with user-supplied continuity and essential-requirement facts; unsupported external “family quality” metrics remain prohibited.
- The model may return mixed, conditional, or incomplete results more often than a conventional recommendation engine.
- New weights, caps, and contribution rules require a new score version, boundary corpus, monotonicity checks, reversed-route checks, comprehension review, and an accepted amendment to this ADR.
