# MoveWise Deterministic Decision Model 1.0

## Status

Confirmed product direction and completed 24-fixture human calibration on 2026-07-19. Exact score-rule mechanics and runtime changes remain pending.

## Problem Statement

How might MoveWise help a family or individual determine whether a specific move is likely better than staying, explain the material gains and losses, and show what would change the answer without pretending that relocation has one objectively correct outcome?

## Recommended Direction

Build a transparent, versioned deterministic decision model rather than a predictive or AI-generated recommendation. The verified Decision Profile remains canonical; the MoveWise Score remains a compact origin-relative summary.

The model answers three questions in order:

1. **Is the move likely better than staying?** Lead with a relative condition and score grounded in the user's accepted facts and supported evidence.
2. **What improves and gets harder?** Name the strongest supported gains, tradeoffs, blockers, missing factors, and evidence limitations.
3. **What would need to change?** Show exact financial thresholds and explicitly unresolved essential requirements when they can change the result.

Families are the first calibration audience; individuals are the second. Household mode changes which questions and contribution rules apply, but never creates an automatic family bonus or generic “family-friendly city” grade.

### Decision architecture

1. **Applicability layer** — Select family or individual mode and ask only questions with a declared effect on an input, component, blocker, confidence rule, sensitivity range, or insight.
2. **Safety layer** — Exact financial arithmetic and registered hard blockers run before weighted lifestyle contributions. Severe financial deterioration overrides otherwise favorable lifestyle signals and is explained in the final review.
3. **Contribution layer** — Registered Financial Security, Daily-life Fit, Opportunity Context, and Household Fit metrics contribute once through versioned materiality rules. Missing evidence never redistributes weight.
4. **Essential-requirement layer** — An explicitly unmet essential requirement may cap a favorable result. An unresolved requirement produces a conditional result with an explicit unconfirmed branch rather than invented confidence.
5. **Explanation layer** — Emit score, band, range, confidence, stability, strongest lift, strongest tradeoff, active blocker, unavailable components, and closest decision-changing condition from the same verified evaluation.

No new contribution budgets or weights are approved by this charter. All 24 expected fixture behaviors are accepted; score rule `0.2.0` mechanics are designed next under machine-readable regression tests.

## Why this direction

- **User value first:** A move is a high-stakes, infrequent decision. Trust, traceability, and “what would change this?” matter more than novelty.
- **Commercial differentiation second:** The defensible product is the combined decision system—personal inputs, evidence, guardrails, versioning, sensitivity, and explanations—not a secret formula.
- **Portfolio value third:** The work demonstrates product judgment, analytics, data contracts, deterministic modeling, calibration, accessibility, and responsible decision support.

## Key Assumptions to Validate

- [ ] Families find an explained financial override protective rather than paternalistic. Test with financially attractive and lifestyle-attractive conflict fixtures.
- [ ] Users can distinguish an essential requirement from a strong preference. Test must-have wording and whether people overuse it.
- [ ] Family-specific user facts such as support-network continuity or required services can improve decisions without relying on generic city rankings.
- [ ] A prepared user can understand the recommendation, strongest gain, strongest loss, and closest decision change without coaching.
- [ ] The result is useful even when MoveWise honestly returns a mixed or conditional answer instead of forcing a winner.

## MVP Scope

- Family and individual applicability modes in the question contract.
- Exact personal finances with registered negative-cushion and extreme-housing-burden overrides.
- Existing commute and climate preference transformations.
- A small set of user-supplied family/individual continuity facts that do not require unsupported neighborhood claims.
- A small set of user-supplied opportunity-readiness facts, such as confirmed employment or remote-work continuity, before adding regional opportunity metrics.
- Versioned score, blockers, materiality rules, question effects, evidence references, sensitivity ranges, and decision-changing conditions.
- Accepted synthetic calibration corpus converted into machine-readable regression fixtures before runtime behavior changes.

## Not Doing (and Why)

- **Predictive machine learning** — no reliable longitudinal relocation-outcome dataset exists yet.
- **Universal city rankings or “family-friendly” grades** — they erase user context and invite unsupported school, safety, and neighborhood claims.
- **Automatic favorable points for selecting family mode** — household composition is applicability, not evidence of fit.
- **Unverified school, crime, health-care, or childcare scores** — these require separate source, geography, freshness, and interpretation contracts.
- **A single hidden optimization target** — the product explains a decision; it does not claim to maximize human happiness.
- **New runtime weights before fixture-backed mechanics review** — apparent mathematical precision would outrun product validation.
- **AI-authored recommendations** — optional narrative assistance may be reconsidered later, but it cannot own score or condition semantics.

## Open Questions

- Which exact Wizard choices may designate an essential requirement, and how do we prevent users from treating every preference as essential?
- Which score mechanics satisfy all 24 accepted outcomes without overfitting the synthetic corpus?
- Where should caution zones begin before the exact negative-cushion and 50% housing-burden blockers?
- Which user-supplied opportunity facts are defensible before nationally comparable metro opportunity evidence is promoted?
- What comprehension threshold must a task-based human review meet before activating score rule `0.2.0`?
