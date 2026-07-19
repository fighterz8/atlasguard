# ADR-006: Add a relative MoveWise quality-of-life score

## Status

Accepted; amends ADR-001

## Date

2026-07-18

## Context

ADR-001 retired the legacy Lifestyle Fit, Financial Fit, and blended Move Score because they combined unlike constructs, double-counted affordability, and presented uncalibrated precision. It deliberately left a revisit condition: add a summary representation only when the Decision Profile alone proved insufficient and a replacement had defensible semantics.

Hands-on review of the functional research Wizard and Results experience showed that the verified Decision Profile is technically strong but asks the user to assemble too much of the conclusion. It lacks one immediate answer to the product's main question: whether this destination is likely to provide a better quality of life than the user's current city under their situation and priorities.

Nick approved Product Contract 2.0 on 2026-07-18 with the following direction:

- serve individuals and families evaluating a known destination, while also helping earlier-stage users estimate destination conditions;
- provide a personalized overall score, initially on a 1–100 scale;
- combine personal financial facts with adaptive choice-based questions and defensible metro context;
- expand beyond Los Angeles and Seattle, with Austin and San Diego required early metros;
- use lightweight save/reopen rather than accounts;
- replace the card-dominant Results presentation with an editorial decision report.

The existing Decision Profile, evidence verification, exact thresholds, and confidence/stability separation remain valuable and must not be discarded to make the interface simpler.

## Decision

Add a deterministic `MoveWiseScore` as a compact summary derived from the semantically verified Decision Profile and its exact input, benchmark, transformation, and scoring-rule versions.

The score has these semantics:

- integer range 1–100;
- origin-relative baseline 50;
- 1–39 `worse_fit`;
- 40–59 `mixed_or_similar`;
- 60–79 `better_fit`;
- 80–100 `substantially_better_fit`.

The score belongs to one origin, destination, user/household, and set of assumptions. It is not a probability, percentile, universal city grade, or ranking. Reversing origin and destination creates a new comparison; it does not reuse the original score.

The Decision Profile remains canonical. The score summarizes but does not replace:

- Financial Position and exact-cent arithmetic;
- registered financial blockers;
- origin-to-destination Priority Changes;
- Decision Condition;
- Evidence Confidence;
- Decision Stability and exact breakpoints;
- evidence references, versions, missingness, and limitations.

The score is centered at 50 and changes only through registered versioned contributions. Financial Security is mandatory and retains a non-zero minimum contribution budget. Other contributions depend on active supported priorities and evidence. Every metric has one owning component so affordability, housing, or another construct cannot be counted twice.

Missing evidence produces no invented gain or loss and never triggers silent weight redistribution. Confidence and score range communicate evidence quality and estimate sensitivity separately from the score value. A severe registered financial blocker prevents a favorable score band even when lifestyle evidence improves.

Runtime activation is prohibited until one versioned formula passes calibration, boundary, monotonicity, determinism, missingness, blocker-precedence, reversed-comparison, and comprehension gates specified in Product Contract 2.0.

## Alternatives Considered

### Keep the Decision Profile without a score

This preserves maximum analytical purity, but current product review shows that users must synthesize too many separate signals before they receive a clear answer. The result is trustworthy but insufficiently useful as a product.

### Restore the legacy three scores

This would be quick because stale database sketches still contain those fields. It is rejected because the old semantics remain incoherent, affordability would again be double-counted, and old fields would become accidental architecture.

### Give every city an absolute quality-of-life grade

This would simplify rankings and browsing but changes the product into a generic “best places” system. It ignores origin, personal circumstances, and household priorities and invites false comparisons between users.

### Show only categorical conditions

Bands avoid precision risk but make it harder to see relative movement, compare revisions, or understand whether a changed assumption materially improved the scenario.

### Use an AI-generated score

This is rejected. AI may never determine the score, facts, weights, evidence, blockers, or conclusion.

## Consequences

- Canonical contracts will later add a versioned score object without removing the existing verified Decision Profile.
- The scoring transformation needs explicit calibration; product approval alone does not make a numeric formula valid.
- Results will lead with the score and comparison meaning while keeping confidence, range, blockers, and evidence visible.
- Adaptive questions and benchmark-assisted estimates must preserve provenance because score interpretation depends on which facts were confirmed versus estimated.
- Saved analyses must bind the score version and every evidence/transformation version required for exact reproduction.
- Metro data must move from authored directed pairs to independent promoted profiles before broad comparison coverage.
- Existing legacy persistence sketches are not migration-ready and may not be activated as compatibility storage.

## Revisit When

- task-based testing shows that users still interpret the score as an absolute city grade or probability;
- calibration cannot produce stable, monotonic, understandable behavior across the supported metro cohort;
- users consistently make better decisions with separate component scores and no overall value;
- a proposed probabilistic model has defensible distributions, validation data, and an independently approved contract.
