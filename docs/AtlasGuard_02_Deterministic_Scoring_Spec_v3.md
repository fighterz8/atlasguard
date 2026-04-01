**02 · Deterministic Scoring Spec**

**Purpose:** Define AtlasGuard’s deterministic scoring logic at a level
precise enough to support implementation, explanation grounding, and
verifier design.

**Audience:** Builder, reviewer, verifier logic designer, and future
maintainer.

**Status:** Draft v0.3

**Owner:** Nick

**Last Updated:** 2026-04-01

# 1. Role of This Document

This document defines AtlasGuard’s deterministic scoring layer at a
level precise enough to support implementation, explanation grounding,
and verifier design.

It does not define prompt wording, prose style, or evaluation prompts.
Its job is to establish the inputs, outputs, evidence contract, score
bands, verdict rules, materiality thresholds, caveat triggers, and JSON
shape that the explanation and verifier layers depend on.

# 2. Frozen Decisions

- The product evaluates a current city versus target city scenario.

- The scoring engine is fully deterministic.

- AI is not allowed to create or modify numeric scores.

- Metro benchmark data is curated and stored ahead of time.

- No live data fetching occurs during user evaluation.

- The MVP remains intentionally simpler than a full tax or wealth
  simulator.

# 3. Top-Level Outputs

The engine must output exactly three user-facing summary scores:

- Lifestyle Fit Score (0–100)

- Financial Fit Score (0–100)

- Move Score (0–100)

# 4. Required Internal Evidence Object

The engine shall also emit a structured internal evidence object for
every evaluated scenario. This evidence object is not optional. It
exists to support explanation generation, explanation verification,
trace logging, regression testing, and sensitivity analysis.

# 5. Inputs

## 5.1 Stored Metro Inputs

- Affordability benchmark (0–100)

- Climate tendency classification plus normalized climate score

- Safety benchmark (0–100)

- Lifestyle / amenities benchmark (0–100)

- Family fit benchmark (0–100)

- Mobility benchmark (0–100)

- Opportunity benchmark (0–100)

The system stores the underlying location dimension scores rather than a
pre-personalized lifestyle result. Personalized fit is computed
dynamically from user weights.

## 5.2 User Lifestyle Inputs

- Weight for affordability

- Weight for climate

- Weight for safety

- Weight for amenities

- Weight for family fit

- Weight for mobility

- Weight for opportunity

- Climate preference: warm or cold

- Priority mode: finance-leaning, balanced, or lifestyle-leaning

All lifestyle weights use a 1–5 scale, where 1 is lowest priority and 5
is highest priority.

## 5.3 User Financial Inputs

- Current income

- Target income, or an explicit assumption that income stays constant

- Current housing cost

- Target housing cost

- Current recurring expenses

- Target recurring expenses

- Retained property or rental income assumption if applicable

# 6. Lifestyle Fit Score

## 6.1 Intent

Lifestyle Fit measures how well the target city matches the user’s
stated priorities.

## 6.2 High-Level Logic

Lifestyle Fit is a weighted combination of the seven lifestyle
dimensions. User weights adjust the contribution of each stored metro
dimension. Climate is simplified for MVP: the user selects warm or cold
preference, each metro has a climate tendency classification, and
climate contributes through one of three fixed states rather than a
detailed weather model.

- Climate match = 85

- Climate partial match = 50

- Climate mismatch = 20

## 6.3 Required Evidence Emissions

- dimension

- currentCityScore

- targetCityScore

- delta

- userWeight

- weightedTargetContribution

- rankOfImportance

For climate specifically, the evidence object shall also emit
climatePreference, targetClimateTendency, climateMatchStatus, and
climateAdjustedScore.

## 6.4 Lifestyle Invariants

- Increasing a user’s weight for a weak target-city dimension must not
  improve the target’s overall Lifestyle Fit.

- If current city equals target city and all inputs are identical, the
  score should remain stable and non-dramatic.

- If the target city scores materially better than the current city on a
  heavily weighted dimension, that dimension should be eligible as a
  positive driver.

- If the target city scores materially worse than the current city on a
  heavily weighted dimension, that dimension should be eligible as a
  trade-off.

# 7. Financial Fit Score

## 7.1 Intent

Financial Fit measures whether the move improves, preserves, or worsens
the user’s projected financial position under the stated assumptions.

## 7.2 High-Level Logic

Financial Fit compares projected monthly position in the current city
versus the target city, then normalizes the result into a 0–100 score.
It also includes a housing burden penalty when target housing becomes
too high relative to income. The MVP financial model remains
intentionally simpler than full tax realism, equity simulation, or
advanced wealth modeling.

For implementation, the working normalization structure is fixed even if
the calibration values may later be tuned:

- Base surplus score uses a capped linear scale where a
  monthlySurplusDelta of \$0 maps to 50.

- An initial working cap of +\$1,000 per month maps to 100, and -\$1,000
  per month maps to 0.

- Values beyond the cap are clamped to the 0–100 range.

- A housing burden penalty is applied after base normalization and then
  the final result is clamped again to 0–100.

Initial working housing-burden penalties:

- 0 points when targetHousingBurdenRatio is under 30%

- 5 points when targetHousingBurdenRatio is 30% to 39.9%

- 10 points when targetHousingBurdenRatio is 40% to 49.9%

- 15 points when targetHousingBurdenRatio is 50% or higher

## 7.3 Required Evidence Emissions

- currentMonthlyIncome

- targetMonthlyIncome

- currentHousingCost

- targetHousingCost

- currentOtherExpenses

- targetOtherExpenses

- retainedIncomeAdjustment

- currentMonthlySurplus

- targetMonthlySurplus

- monthlySurplusDelta

- currentHousingBurdenRatio

- targetHousingBurdenRatio

- housingBurdenDelta

- housingPenaltyApplied

- incomeAssumptionType

## 7.4 Financial Invariants

- If target housing increases and all else is held constant, Financial
  Fit must not improve.

- If target recurring expenses increase and all else is held constant,
  Financial Fit must not improve.

- If target income increases enough to offset higher costs, Financial
  Fit may improve.

- A larger negative monthly surplus delta must not produce a better
  Financial Fit.

- A worse housing burden ratio must not be described as an affordability
  strength.

# 8. Move Score

## 8.1 Intent

Move Score is the user-facing composite that blends lifestyle and
finance based on the selected priority mode.

## 8.2 High-Level Logic

Move Score combines Lifestyle Fit and Financial Fit using the selected
priority mode. Working blend assumptions remain: finance-leaning weights
finance more heavily, balanced uses an even blend, and lifestyle-leaning
weights lifestyle more heavily.

- Finance-leaning = 30% Lifestyle Fit / 70% Financial Fit

- Balanced = 50% Lifestyle Fit / 50% Financial Fit

- Lifestyle-leaning = 70% Lifestyle Fit / 30% Financial Fit

## 8.3 Required Evidence Emissions

- lifestyleFitScore

- financialFitScore

- priorityMode

- lifestyleWeightInBlend

- financialWeightInBlend

- moveScore

## 8.4 Move Score Invariants

- Changing priority mode must alter only the blend, not the underlying
  lifestyle or financial sub-scores.

- If Financial Fit is weak and the user chooses finance-leaning mode,
  Move Score should not hide that weakness.

- If Lifestyle Fit is strong and the user chooses lifestyle-leaning
  mode, Move Score should reflect that emphasis without inventing
  financial improvement.

# 9. Score Bands and Verdict Rules

## 9.1 Score Bands

Working interpretation bands for all three scores:

- 80–100 = Strong

- 65–79 = Good / Qualified Yes

- 45–64 = Caution / Mixed

- 0–44 = Weak / Not Recommended

These bands are interpretation helpers for the explanation and verifier
layers. They do not replace raw scores.

## 9.2 Provisional Verdict Band Determination

The scoring layer shall emit a provisional verdict band. Verdict
determination starts with the Move Score band, then applies
deterministic downgrade rules so mixed or financially risky cases are
not overstated. See section 10 for the working materiality thresholds
used by these rules.

- Base verdict = Move Score band.

- If Move Score is in the Strong band but Financial Fit is Weak,
  downgrade the provisional verdict to Caution.

- If Move Score is in the Good / Qualified Yes band but one sub-score is
  Strong and the other is Weak, downgrade the provisional verdict to
  Caution.

- If Move Score is in the Good / Qualified Yes band and Financial Fit is
  Weak with a materially negative monthly surplus delta or materially
  worse housing burden, downgrade to Caution.

- If Move Score is in the Weak band, provisional verdict remains Weak
  regardless of sub-score mix.

- A later explanation layer may restate the verdict but may not
  strengthen it beyond the provisional verdict band.

# 10. Working Materiality Thresholds

The verifier and deterministic driver logic need working thresholds for
terms such as materially better, materially worse, and materially
affects the result. The following thresholds are initial MVP defaults
and may later be recalibrated through regression testing:

- Lifestyle dimension delta is material when the absolute difference
  between currentCityScore and targetCityScore is at least 10 points on
  the 0–100 scale.

- A lifestyle dimension is heavily weighted when the user weight is at
  least 4 on the 1–5 scale.

- Monthly surplus delta is financially material when the absolute
  difference is at least \$150 per month.

- Housing burden delta is material when the absolute change is at least
  5 percentage points.

- An assumption materially affects the result when changing it would
  alter the provisional verdict band or shift projected monthly surplus
  by at least \$150 per month.

- A caveat is material when it applies to one of the top two ranked
  drivers or to a financial assumption that changes projected monthly
  surplus by at least \$150 per month.

# 11. Driver Extraction Rules

## 11.1 Positive Driver Candidates

- A factor may qualify if it is heavily weighted or financially
  material.

- The target must perform materially better than the baseline or improve
  the user’s projected position.

- No caveat may invalidate the claim.

## 11.2 Trade-off Candidates

- A factor may qualify if it is heavily weighted or financially
  material.

- The target must perform materially worse than the baseline or worsen
  the user’s projected position.

- The effect must be large enough to matter to the recommendation.

The explanation layer should not discover these on its own. It should
receive them from deterministic logic.

# 12. Caveat Triggers

- Benchmark freshness exceeds a defined threshold.

- Tax realism is omitted and the origin and destination states use
  different income tax regimes.

- Income is assumed constant rather than user-confirmed.

- Expenses are tier-estimated rather than precise.

- Retained property or rental income assumptions materially affect the
  outcome.

- Missing or simplified data reduces confidence in a specific claim.

The tax-related trigger is intentionally implementable without tax
modeling. It relies on stored city/state metadata and a simple regime
difference check rather than a computed tax delta.

# 13. Sensitivity Flags

The engine should emit sensitivity flags when the recommendation is
especially dependent on a narrow set of assumptions such as target
housing cost, target income, retained rental income, or a single heavily
weighted lifestyle dimension.

# 14. Minimum JSON Shape for the Evidence Contract

{

"scenarioContext": {

"currentCity": "",

"targetCity": "",

"priorityMode": "",

"evaluationTimestamp": "",

"freshness": {

"benchmarkVersion": "",

"staleFlags": \[\]

}

},

"userInputs": {

"income": {

"current": 0,

"target": 0

},

"housing": {

"current": 0,

"target": 0

},

"expenses": {

"current": 0,

"target": 0

},

"retainedIncomeAdjustment": 0,

"weights": {

"affordability": 0,

"climate": 0,

"safety": 0,

"amenities": 0,

"familyFit": 0,

"mobility": 0,

"opportunity": 0

},

"climatePreference": ""

},

"lifestyleEvidence": {

"dimensions": \[

{

"dimension": "",

"currentCityScore": 0,

"targetCityScore": 0,

"delta": 0,

"userWeight": 0,

"weightedTargetContribution": 0,

"rankOfImportance": 0

}

\],

"score": 0

},

"financialEvidence": {

"currentMonthlyIncome": 0,

"targetMonthlyIncome": 0,

"currentHousingCost": 0,

"targetHousingCost": 0,

"currentOtherExpenses": 0,

"targetOtherExpenses": 0,

"retainedIncomeAdjustment": 0,

"currentMonthlySurplus": 0,

"targetMonthlySurplus": 0,

"monthlySurplusDelta": 0,

"currentHousingBurdenRatio": 0,

"targetHousingBurdenRatio": 0,

"housingBurdenDelta": 0,

"housingPenaltyApplied": false,

"incomeAssumptionType": "",

"score": 0

},

"moveEvidence": {

"lifestyleWeightInBlend": 0,

"financialWeightInBlend": 0,

"score": 0

},

"derivedSignals": {

"positiveDrivers": \[

{

"factor": "",

"dimensionOrField": "",

"delta": 0,

"material": true

}

\],

"tradeoffs": \[

{

"factor": "",

"dimensionOrField": "",

"delta": 0,

"material": true

}

\],

"sensitivityFlags": \[

{

"type": "",

"affectedField": "",

"reason": "",

"material": true

}

\],

"caveatFlags": \[

{

"type": "",

"affectedField": "",

"reason": "",

"material": true

}

\],

"verdictBand": ""

}

}

# 15. Non-Goals for This Spec

- Prompt wording.

- Prose style.

- Verifier implementation details.

- Full database schema.

- Tax-aware extension design.

- Large-scale city ingestion workflows.

# 16. Immediate Build Implications

- Refactor the scorer so it returns the evidence object, not just three
  numbers.

- Write the explanation contract against this evidence object.

- Write verifier rules against deterministic fields, not fuzzy prose
  interpretation.

- Keep prompt work blocked until the scorer, explanation contract, and
  verifier rules exist.

# 17. Open Questions to Resolve Later

- Whether the initial \$1,000 linear normalization cap needs
  recalibration after the first 30–40 seeded regression cases.

- Whether the housing-burden penalty bands need recalibration after the
  first regression pass.

- Freshness threshold values by benchmark type.

- Whether free-text preference parsing remains cut.

- Whether target income defaults to same income or must always be
  explicit.
