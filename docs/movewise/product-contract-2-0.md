# MoveWise Product Contract 2.0

**Status:** Approved product direction; runtime implementation pending

**Approval date:** 2026-07-18

**Approver:** Nick, project owner

**Change record:** `MW-CHG-002`

## 1. Product promise

MoveWise helps an individual, couple, or family determine whether a specific destination is likely to provide a better quality of life than their current city under their finances, household situation, priorities, and the evidence available.

The primary user is evaluating a known destination with at least some concrete information. A secondary path supports users who are still estimating destination costs through visible, optional benchmark assistance.

MoveWise is not a city recommender, universal quality-of-life index, probability of happiness, or directive to move. It compares one user's origin and destination and explains the strongest improvements, tradeoffs, blockers, uncertainties, and decision-changing assumptions.

## 2. Canonical result

The canonical result remains an evidence-rich deterministic Decision Profile. Product Contract 2.0 adds a compact `MoveWiseScore` summary derived from the same verified inputs, benchmark versions, transformations, financial rules, and priority contributions.

The score does not replace Financial Position, Priority Changes, Decision Condition, Evidence Confidence, Decision Stability, exact thresholds, or evidence. A result is trusted only when the complete bundle remains semantically verified.

### 2.1 Score meaning

`MoveWiseScore.value` is an integer from 1 through 100.

- `50` is the origin-relative neutral baseline: the destination is broadly equivalent to the user's current situation under the included dimensions.
- Values below 50 mean the destination fits worse than the origin.
- Values above 50 mean the destination fits better than the origin.
- The value is not a percentage, probability, percentile, or absolute city grade.
- The same destination may produce different values for different users, origins, finances, household modes, priorities, assumptions, or benchmark versions.

The initial user-facing bands are:

| Value  | Band                       | Meaning                                                                                            |
| ------ | -------------------------- | -------------------------------------------------------------------------------------------------- |
| 1–39   | `worse_fit`                | The destination is materially worse under the included facts and priorities.                       |
| 40–59  | `mixed_or_similar`         | The comparison is mixed or broadly similar; the exact value shows direction within the band.       |
| 60–79  | `better_fit`               | The destination provides a meaningful overall improvement under the included facts and priorities. |
| 80–100 | `substantially_better_fit` | The included evidence supports a broad, substantial improvement.                                   |

These labels describe the comparison, not a command. User-facing copy may say “better fit under your assumptions,” never “you should move.”

### 2.2 Score structure

The future canonical score object must include at least:

```text
MoveWiseScore
  value                     integer 1..100
  band                      worse_fit | mixed_or_similar | better_fit | substantially_better_fit
  baseline                  50
  range                     { min, max } | null
  componentContributions[]  versioned, evidence-backed relative contributions
  activeBlockers[]          stable IDs plus affected component/input references
  scoreVersion              immutable scoring-rule version
  inputFingerprint          canonical accepted-input fingerprint
  benchmarkVersion          promoted metro-snapshot bundle version
```

`range` communicates sensitivity to accepted estimates or plausible ranges. It is not a statistical confidence interval unless a future source contract provides a defensible distribution and a new decision record approves probabilistic semantics.

Evidence Confidence remains a separate assessment of source quality, geography, freshness, uncertainty, and completeness. It must never increase because the score is favorable or decrease merely because it is unfavorable.

### 2.3 Contribution model

The score is centered on 50 and moves only through registered origin-to-destination contributions.

Required component families are:

1. **Financial security** — mandatory and never removable by preference settings. It owns personal cash flow, housing burden when gross income is known, retained-property impact, and registered financial blockers.
2. **Daily-life fit** — supported commute, mobility, climate, and other repeat-experience dimensions with explicit user preferences.
3. **Opportunity context** — employment or economic context only after a nationally consistent source and user-specific interpretation contract exist.
4. **Household fit** — family or household-specific dimensions only when the question, geography, evidence, and transformation are defensible. Household mode alone never creates a generic family score.

The metric registry must give every metric exactly one owning component so housing or affordability cannot be counted twice. User answers may adjust priority contribution weights, but Financial Security retains a non-zero minimum contribution budget. The exact contribution budget, transformations, materiality thresholds, and blocker caps are versioned scoring rules and require approved calibration fixtures before runtime activation.

Missing evidence never causes silent redistribution. An unavailable weighted dimension contributes no invented gain or loss, lowers completeness/confidence as policy requires, and remains visible in the score explanation. Neutral treatment for missing evidence must not be described as observed similarity.

### 2.4 Financial guardrails

The overall number cannot average away a registered severe financial blocker.

- A negative destination monthly cushion prevents the score from entering a favorable band.
- Other caps, including extreme housing burden when gross income is known, must be registered, versioned, explained, and boundary-tested before activation.
- A blocker always appears beside the score and in the financial section with the contributing inputs and evidence IDs.
- Improving destination income cannot worsen the score when every other input is held constant.
- Increasing destination housing or recurring expenses cannot improve the score when every other input is held constant.

The score implementation must preserve the existing exact-cent financial arithmetic and deterministic sensitivity behavior.

### 2.5 Calibration and activation gate

Product approval does not authorize an uncalibrated runtime score. Activation requires:

- an ADR-approved scoring-rule version;
- mutually exclusive band boundaries and blocker precedence;
- fixtures at 1, 39, 40, 49, 50, 59, 60, 79, 80, and 100 plus every registered cap;
- monotonicity, determinism, missingness, and no-double-counting tests;
- reversed-origin/destination and same-metro boundary tests;
- score-range tests for confirmed and estimated inputs;
- task-based comprehension checks proving users interpret the score as relative rather than absolute or probabilistic.

Until this gate passes, the existing Decision Profile remains the only runtime result.

## 3. Adaptive question contract

MoveWise may ask as many questions as materially improve the analysis, but each question must earn its place.

Every question definition must declare:

- a stable question ID and version;
- its applicable household/move states;
- its answer type and validation;
- which canonical input, score component, confidence/range rule, or rendered insight it affects;
- whether the answer is required to calculate, required only for a branch, or optional refinement;
- how “not sure” behaves;
- whether MoveWise can offer a benchmark estimate and which source/version supports it.

A question that affects none of those outputs is not permitted.

### 3.1 Experience stages

The user experience is adaptive rather than locked to a fixed number of pages:

1. **Move** — exact origin and destination with visible metro resolution.
2. **Household** — individual, couple, or family plus only the composition details required by active dimensions.
3. **Situation** — move stage, employment/work arrangement, housing situation, transportation pattern, and other branching facts.
4. **Money** — personal numeric facts and clearly labeled destination estimates.
5. **Priorities** — choice-based preference questions and importance where a supported transformation exists.
6. **Confirm and refine** — review benchmark-assisted values, replace estimates, and answer optional questions that materially narrow the score range or improve insight.

This sequence may be combined or split in the interface. A mandatory standalone review page is not required if every estimate and material assumption is confirmed in context before calculation.

### 3.2 Input burden rules

- Personal facts that benchmarks cannot know remain user-supplied.
- Financial amounts remain numeric; non-financial preferences should use accessible choices when possible.
- “Estimate for me” and “Not sure” are valid only when their effect on confidence/range is explicit.
- Benchmark values never silently become personal facts.
- The product may provide an initial result once every required field is either user-supplied or explicitly accepted as an estimate.
- Optional refinement follows the initial value path rather than blocking it without demonstrated need.

## 4. Metro profile contract

The future data architecture owns independent metro profiles rather than hand-authored directed pairs.

```text
VerifiedMetroProfile(origin) + VerifiedMetroProfile(destination)
  -> generated version-bound comparison
  -> user-specific transformations
  -> verified Decision Profile and MoveWise Score
```

Each profile must preserve:

- stable metro slug;
- exact selected city/state mapping;
- CBSA code, label, and delineation vintage;
- immutable metric observations and source artifacts;
- metric definition, units, observation/release/verification dates, geography, uncertainty/coverage, freshness, and missingness;
- transformation and materiality versions;
- profile checksum and promotion status.

Any active origin may be compared with any different active destination when both profiles contain the required critical metrics. Reverse comparisons are generated, not separately authored. Same-metro input remains an explicit neutral/validation boundary and is never fabricated as a relocation improvement.

### 4.1 Rollout

The required first cohort is:

1. Los Angeles
2. Seattle
3. Austin
4. San Diego

Los Angeles and Seattle must migrate without changing their verified evidence. Austin and San Diego must pass the same source, geography, checksum, transformation, freshness, uncertainty, and mutation gates before becoming selectable.

The next promotion target is 8–12 total metros selected for major-market relevance and complete comparable evidence—not dropdown breadth alone. Broader major-metro coverage remains directional scope, not a promise until the promotion pipeline is repeatable.

## 5. Lightweight save/reopen contract

Saving is an explicit action after a successful verified result. Evaluation and browser editing do not create a server record implicitly.

The first persistence model uses:

- no account and no email;
- a private opaque access token with at least 128 bits of entropy;
- only a token hash stored server-side;
- a 30-day default expiry;
- explicit deletion/revocation;
- `noindex` saved-result pages;
- non-enumerable access with no global scenario list;
- minimized canonical input, accepted estimate provenance, verified result, and exact schema/score/benchmark/transformation versions;
- transactional writes that cannot leave a misleading partial record.

Reopening first reproduces the saved result from its bound versions. A comparison against newer data, when later supported, is an explicit separate action and never silently rewrites the saved analysis.

Save failure does not remove or downgrade a completed local result. Operational logs never contain the opaque token, full financial payload, or rejected values.

Persistence activation requires replacement of the legacy database sketches, migrations from a clean database, expiry/deletion tests, token enumeration resistance, injected transaction-failure tests, and exact reproduction tests.

## 6. Results information architecture

Results should read as an editorial decision report rather than a grid of interchangeable cards.

Required hierarchy:

1. **Conclusion** — route, MoveWise Score, band, score range when present, one-sentence relative reading, confidence, and any active blocker.
2. **At a glance** — a current-versus-destination comparison table for the most decision-relevant facts.
3. **What improves / what gets harder** — ranked evidence-backed drivers and tradeoffs.
4. **Financial reality** — cash-flow comparison, burden when available, provenance, and exact thresholds.
5. **Priority fit** — compact ranked rows or restrained charts showing direction, importance, and contribution.
6. **What could change the result** — sensitivity controls and exact breakpoints.
7. **Evidence and method** — source geography, dates, uncertainty, missingness, versions, and limitations in a subordinate appendix.
8. **Save** — an explicit post-result action with expiry and privacy terms.

Typography, tables, ranked rows, whitespace, and a small number of purposeful visualizations should carry the page. Bordered cards are reserved for true alerts, interactive controls, or self-contained callouts. The interface does not advertise AI or expose internal implementation language.

All existing accessibility requirements remain: semantic heading order, keyboard operation, visible focus, non-color communication, reduced motion, reflow/zoom, touch targets, and screen-reader comprehension.

## 7. Compatibility and sequencing

Product Contract 2.0 is a behavioral and scope amendment. It does not mutate the current runtime in place.

Implementation proceeds in bounded slices:

1. Freeze this contract and its decision/requirements records.
2. Generalize metro profiles and add Austin/San Diego evidence.
3. Implement and calibrate the MoveWise Score as an additive verified contract.
4. Implement adaptive questions and benchmark-assisted estimates.
5. Redesign Results around the editorial hierarchy.
6. Replace legacy persistence sketches and enable lightweight save/reopen under its own default-off capability.
7. Promote the remaining metros toward the 8–12 cohort.

The verified LA→Seattle path remains available throughout migration. No later slice may combine metro expansion, score activation, UI redesign, and persistence activation in one commit.

## 8. Not Doing

- Universal city scores, rankings, or “best place” claims.
- Score-as-probability language or probabilistic simulation without defensible distributions.
- Silent benchmark defaults or salary prediction.
- Generic metro-level school, safety, amenities, or family-friendly grades.
- Neighborhood/property claims, maps, listings, movers, or relocation marketplaces.
- Accounts, email lookup, public scenario browsing, or guessable IDs for initial persistence.
- Request-time truth calls, scraping, multiple providers, agents, or mandatory AI.
- A card-dominant dashboard or implementation-model language in the product surface.
