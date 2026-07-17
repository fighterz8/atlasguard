**AtlasGuard**

03 · Explanation Contract and Verifier Rules

> **Historical status (2026-07-17):** Superseded for implementation by
> [MW-CHG-001](movewise/type-b-c-approval-and-requirements-migration.md)
> and ADR-001 through ADR-005. Retained unchanged below as decision history.

|                           |                                                                                                                                                                                                                                                                             |
|---------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Purpose**               | Define the structured explanation output, the rules governing what the AI is allowed to say, and the verifier checks that must run before any explanation is shown to the user.                                                                                             |
| **Owner / Status / Date** | Nick · Draft v0.3 · 2026-04-01                                                                                                                                                                                                                                              |
| **Revision Note**         | v0.3: All field paths aligned to Doc 02 v0.3 actual JSON schema. Climate evidence block confirmed and integrated (no longer pending). Verifier checks V-001–V-010 reference Doc 02 field names. Recommended addition flagged: verdictDowngraded and downgradeReason fields. |

**1. Role of This Document**

This document defines AtlasGuard’s explanation contract and verifier
rules. It exists to prevent the AI layer from drifting away from
deterministic truth.

It follows two frozen decisions from earlier planning: (a) AI may
explain, but AI may not decide; (b) verifier rules must be defined
before prompt optimization begins.

This document does not define final prompt wording. It defines what the
explainer is allowed to output, what it must never output, how the
verifier checks grounding and tone, and what happens if the explanation
fails verification.

**2. Design Principle**

The explanation layer is not a freeform essay generator. It is a
controlled translation layer that converts deterministic evidence into
user-readable language.

The explainer may use only: deterministic scores, deterministic evidence
fields, user inputs and assumptions, benchmark freshness metadata, and
derived deterministic signals (positiveDrivers, tradeoffs,
sensitivityFlags, caveatFlags).

The explainer must not invent new city facts, unsupported score
interpretations, stronger certainty than the data allows, or advice that
sounds like financial, legal, or guaranteed life-direction certainty.

**3. Required Input to the Explainer**

The explainer receives the full deterministic evidence object emitted by
the scoring engine (Doc 02, section 14). The following paths must be
present. All paths are relative to the evidence object root.

> scenarioContext.currentCity
>
> scenarioContext.targetCity
>
> scenarioContext.priorityMode
>
> scenarioContext.freshness.benchmarkVersion
>
> scenarioContext.freshness.staleFlags\[\]
>
> userInputs.income.current / .target
>
> userInputs.housing.current / .target
>
> userInputs.expenses.current / .target
>
> userInputs.retainedIncomeAdjustment
>
> userInputs.weights.{affordability\|climate\|safety\|amenities\|familyFit\|mobility\|opportunity}
>
> userInputs.climatePreference
>
> lifestyleEvidence.dimensions\[\] // 7 dimension objects
>
> .dimension, .currentCityScore, .targetCityScore, .delta,
>
> .userWeight, .weightedTargetContribution, .rankOfImportance
>
> lifestyleEvidence.climateEvidence
>
> .climatePreference, .targetClimateTendency,
>
> .climateMatchStatus, .climateAdjustedScore
>
> lifestyleEvidence.score // 0–100
>
> financialEvidence.currentMonthlyIncome .. .monthlySurplusDelta
>
> financialEvidence.currentHousingBurdenRatio .. .housingBurdenDelta
>
> financialEvidence.housingPenaltyApplied
>
> financialEvidence.incomeAssumptionType
>
> financialEvidence.score // 0–100
>
> moveEvidence.lifestyleFitScore
>
> moveEvidence.financialFitScore
>
> moveEvidence.lifestyleWeightInBlend
>
> moveEvidence.financialWeightInBlend
>
> moveEvidence.score // 0–100
>
> derivedSignals.positiveDrivers\[\]
>
> .factor, .dimensionOrField, .delta, .material
>
> derivedSignals.tradeoffs\[\]
>
> .factor, .dimensionOrField, .delta, .material
>
> derivedSignals.sensitivityFlags\[\]
>
> .type, .affectedField, .reason, .material
>
> derivedSignals.caveatFlags\[\]
>
> .type, .affectedField, .reason, .material
>
> derivedSignals.verdictBand

The explainer shall not be asked to infer missing evidence on its own.
If any required field is absent, the system must halt before the
explainer runs.

**Recommended addition to Doc 02:** The verifier needs explicit
verdictDowngraded (boolean) and downgradeReason (string \| null) fields
in derivedSignals so V-003 can check whether a downgrade occurred and
whether the explanation acknowledges it. Currently Doc 02 section 9.2
defines the downgrade rules but the JSON schema in section 14 does not
carry these as discrete fields.

**4. Explanation Output Contract**

The explanation must first be generated as a structured object.
User-facing prose may be rendered from that object afterward. Every
array item that references evidence must include an evidenceRef path so
the verifier can trace the claim.

**4.1 Required Fields**

verdict, score_summary, top_positive_drivers, top_tradeoffs,
assumptions_used, sensitivity_notes, uncertainty_or_caveats,
recommended_next_step.

**4.2 Explanation Output JSON Schema**

> {
>
> "verdict": "strong_fit" \| "qualified_yes" \| "caution" \| "weak_fit",
>
> "score_summary": {
>
> "lifestyle_fit": \<number, === lifestyleEvidence.score\>,
>
> "financial_fit": \<number, === financialEvidence.score\>,
>
> "move_score": \<number, === moveEvidence.score\>
>
> },
>
> "top_positive_drivers": \[ // 1–3 items
>
> {
>
> "factor": \<string\>,
>
> "evidenceRef": \<string, index into
> derivedSignals.positiveDrivers\[\]\>,
>
> "reason": \<string, grounded explanation\>
>
> }
>
> \],
>
> "top_tradeoffs": \[ // 0–3 items
>
> {
>
> "factor": \<string\>,
>
> "evidenceRef": \<string, index into derivedSignals.tradeoffs\[\]\>,
>
> "reason": \<string, grounded explanation\>
>
> }
>
> \],
>
> "assumptions_used": \[ // 1–5 items
>
> {
>
> "assumption": \<string\>,
>
> "sourceField": \<string, path into userInputs or financialEvidence\>,
>
> "material": \<boolean\>
>
> }
>
> \],
>
> "sensitivity_notes": \[ // 0–3 items
>
> {
>
> "variable": \<string\>,
>
> "evidenceRef": \<string, index into
> derivedSignals.sensitivityFlags\[\]\>,
>
> "note": \<string\>
>
> }
>
> \],
>
> "uncertainty_or_caveats": \[ // 0–4 items
>
> {
>
> "type": \<string\>,
>
> "evidenceRef": \<string, index into derivedSignals.caveatFlags\[\]\>,
>
> "description": \<string\>
>
> }
>
> \],
>
> "recommended_next_step": \<string\>
>
> }

*Array length bounds are MVP defaults. The evidenceRef field on each
array item is the mechanism that makes verifier checks V-004 through
V-008 possible.*

**5. Field-Level Rules**

Each rule below names the evidence source the field must be derived from
and the violation condition the verifier checks. All evidence paths
reference the Doc 02 section 14 JSON schema.

**5.1 verdict**

- **Source:** derivedSignals.verdictBand. If verdictDowngraded and
  downgradeReason are added per the section 3 recommendation:
  derivedSignals.verdictDowngraded, derivedSignals.downgradeReason.

- **Rule:** Must exactly match derivedSignals.verdictBand. The explainer
  must not output a verdict stronger than the deterministic band. If a
  downgrade occurred, the explanation must reference the reason.

- **Violation:** verdict != derivedSignals.verdictBand, or verdict is a
  stronger band than the evidence supports.

**5.2 score_summary**

- **Source:** lifestyleEvidence.score, financialEvidence.score,
  moveEvidence.score.

- **Rule:** Restate the three top-line scores exactly as received. No
  rounding drift, inversion, or reinterpretation.

- **Violation:** Any score_summary value differs from the corresponding
  evidence .score field.

**5.3 top_positive_drivers**

- **Source:** derivedSignals.positiveDrivers\[\]. Each entry has factor,
  dimensionOrField, delta, and material.

- **Rule:** Each item must have an evidenceRef pointing to a valid index
  in positiveDrivers\[\]. The reason string must describe something that
  genuinely helped the target scenario per the referenced driver’s
  dimensionOrField and delta. Climate-related drivers must be traceable
  to lifestyleEvidence.climateEvidence fields.

- **Violation:** evidenceRef does not resolve to a valid
  positiveDrivers\[\] entry, or reason contradicts the delta direction
  of the referenced driver.

**5.4 top_tradeoffs**

- **Source:** derivedSignals.tradeoffs\[\]. Each entry has factor,
  dimensionOrField, delta, and material.

- **Rule:** Each item must have an evidenceRef pointing to a valid index
  in tradeoffs\[\]. If evidence contains a tradeoff with material=true,
  it must not be omitted. Climate-related tradeoffs (e.g., climate
  mismatch on a heavily weighted climate dimension) must be traceable to
  lifestyleEvidence.climateEvidence.climateMatchStatus.

- **Violation:** evidenceRef does not resolve to a valid tradeoffs\[\]
  entry, reason contradicts the referenced tradeoff’s delta, or a
  material tradeoff is missing entirely.

**5.5 assumptions_used**

- **Source:** userInputs (income.target, expenses.target,
  retainedIncomeAdjustment, climatePreference, weights),
  financialEvidence.incomeAssumptionType.

- **Rule:** List only assumptions that materially affected the result.
  Each item must include a sourceField path into userInputs or
  financialEvidence. Must not present a modeled assumption as a
  confirmed fact. If incomeAssumptionType is "assumed_constant", that
  must appear as an assumption.

- **Violation:** A material assumption is omitted, sourceField does not
  map to a real field, or wording treats an estimate as confirmed.

**5.6 sensitivity_notes**

- **Source:** derivedSignals.sensitivityFlags\[\]. Each entry has type,
  affectedField, reason, and material.

- **Rule:** Each item must reference a valid sensitivity flag via
  evidenceRef. Focus on flags where material=true rather than generic
  filler.

- **Violation:** evidenceRef does not match any sensitivityFlags\[\]
  entry, or sensitivity_notes is empty when sensitivityFlags\[\]
  contains material entries.

**5.7 uncertainty_or_caveats**

- **Source:** derivedSignals.caveatFlags\[\]. Each entry has type,
  affectedField, reason, and material.

- **Rule:** Every caveat flag with material=true must have a
  corresponding entry. If no material flags exist, the array may be
  empty. The tax caveat (type: tax regime difference) fires when
  origin/destination states have different income tax regimes (Doc 02,
  section 12).

- **Violation:** A material caveat flag has no corresponding entry, or
  the explanation suppresses a caveat that materially affects
  interpretation.

**5.8 recommended_next_step**

- **Source:** derivedSignals.sensitivityFlags\[\] (highest-impact
  material flag), derivedSignals.caveatFlags\[\].

- **Rule:** Must be practical and specific. Should address the most
  actionable uncertainty from sensitivityFlags or caveatFlags. Must not
  sound like a guarantee or command.

- **Violation:** Next step is generic filler, does not address the
  highest-impact uncertainty, or uses guarantee language.

**6. Rendering Rules for User-Facing Prose**

The final user-facing explanation should read naturally, but its content
must remain isomorphic to the structured object.

- Prose may compress wording.

- Prose may reorder points for readability.

- Prose may not introduce new claims.

- Prose may not omit a critical tradeoff when one is present.

- Prose may not suppress caveats that the structured object contains.

- Prose must not reorder verdict or score information in a way that
  buries a negative signal behind positive framing.

**7. Verifier-First Policy**

No prompt optimization or tone-polish work begins until: (a) the scoring
evidence contract exists, (b) the explanation schema is stable enough to
test, and (c) the verifier rule set below is implemented at least in
baseline form.

This policy is absolute because the project’s main trust risk is a
persuasive explanation that is not faithful to the deterministic layer.

**8. Verifier Responsibilities**

The verifier is a gatekeeper, not a style critic. Its job is to check
whether the explanation is faithful, complete enough, and appropriately
caveated.

The verifier must output one of three states: PASS, PARTIAL, or FAIL.
PARTIAL means the explanation is mostly grounded but requires repair
before display.

**9. Core Verifier Checks**

Each check below is defined as a field-level specification against the
Doc 02 evidence object and the explanation output schema from section
4.2. Check IDs are stable references for the regression suite.

**9.1 V-001 Schema Validity**

|                        |                                                                                                                                                                        |
|------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Check**              | **V-001 — Schema Validity**                                                                                                                                            |
| **Severity**           | FAIL                                                                                                                                                                   |
| **Evidence inputs**    | n/a (structural check on explanation output only)                                                                                                                      |
| **Explanation fields** | All 8 required fields: verdict, score_summary, top_positive_drivers, top_tradeoffs, assumptions_used, sensitivity_notes, uncertainty_or_caveats, recommended_next_step |
| **Conditions**         | FAIL if output is not valid JSON.                                                                                                                                      |
|                        | FAIL if any of the 8 required fields is missing.                                                                                                                       |
|                        | FAIL if verdict is not one of the four enum values.                                                                                                                    |
|                        | FAIL if score_summary does not contain lifestyle_fit, financial_fit, move_score as numbers.                                                                            |
|                        | FAIL if any array field contains items missing their required keys (e.g., a driver without evidenceRef).                                                               |
| ***Notes***            | *First check to run. If it fails, no other checks execute.*                                                                                                            |

**9.2 V-002 Score Fidelity**

|                        |                                                                                 |
|------------------------|---------------------------------------------------------------------------------|
| **Check**              | **V-002 — Score Fidelity**                                                      |
| **Severity**           | FAIL                                                                            |
| **Evidence inputs**    | lifestyleEvidence.score, financialEvidence.score, moveEvidence.score            |
| **Explanation fields** | explanation.score_summary.lifestyle_fit, .financial_fit, .move_score            |
| **Conditions**         | FAIL if explanation.score_summary.lifestyle_fit != lifestyleEvidence.score.     |
|                        | FAIL if explanation.score_summary.financial_fit != financialEvidence.score.     |
|                        | FAIL if explanation.score_summary.move_score != moveEvidence.score.             |
| ***Notes***            | *Exact numeric equality. No tolerance band — these are deterministic integers.* |

**9.3 V-003 Verdict Band Alignment**

|                        |                                                                                                                                                                                                                                                |
|------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Check**              | **V-003 — Verdict Band Alignment**                                                                                                                                                                                                             |
| **Severity**           | FAIL                                                                                                                                                                                                                                           |
| **Evidence inputs**    | derivedSignals.verdictBand. If added: derivedSignals.verdictDowngraded, derivedSignals.downgradeReason                                                                                                                                         |
| **Explanation fields** | explanation.verdict                                                                                                                                                                                                                            |
| **Conditions**         | FAIL if explanation.verdict != derivedSignals.verdictBand.                                                                                                                                                                                     |
|                        | FAIL if explanation.verdict is a stronger band than derivedSignals.verdictBand (ordering: strong_fit \> qualified_yes \> caution \> weak_fit).                                                                                                 |
|                        | PARTIAL if a verdict downgrade occurred (detectable from score bands + Doc 02 section 9.2 rules, or from explicit verdictDowngraded field if added) and the explanation does not acknowledge the downgrade reason anywhere in its text fields. |
| ***Notes***            | *Until verdictDowngraded/downgradeReason are added to the evidence schema, the verifier must re-derive downgrade status from the sub-scores and Doc 02 section 9.2 rules.*                                                                     |

**9.4 V-004 Driver Grounding**

|                        |                                                                                                                                                                                   |
|------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Check**              | **V-004 — Driver Grounding**                                                                                                                                                      |
| **Severity**           | FAIL for fabrication, PARTIAL for omission                                                                                                                                        |
| **Evidence inputs**    | derivedSignals.positiveDrivers\[\] — each entry: { factor, dimensionOrField, delta, material }                                                                                    |
| **Explanation fields** | explanation.top_positive_drivers\[\].evidenceRef, .factor, .reason                                                                                                                |
| **Conditions**         | FAIL if any item’s evidenceRef does not resolve to a valid index in derivedSignals.positiveDrivers\[\].                                                                           |
|                        | FAIL if any item’s reason contradicts the delta direction of the referenced driver (e.g., claims improvement when delta is negative).                                             |
|                        | PARTIAL if explanation.top_positive_drivers is empty and derivedSignals.positiveDrivers\[\] contains one or more entries.                                                         |
|                        | Climate-specific: if a positiveDriver references climate (dimensionOrField = "climate"), the reason must be consistent with lifestyleEvidence.climateEvidence.climateMatchStatus. |

**9.5 V-005 Tradeoff Grounding**

|                        |                                                                                                                                                                                                                                          |
|------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Check**              | **V-005 — Tradeoff Grounding**                                                                                                                                                                                                           |
| **Severity**           | FAIL                                                                                                                                                                                                                                     |
| **Evidence inputs**    | derivedSignals.tradeoffs\[\] — each entry: { factor, dimensionOrField, delta, material }                                                                                                                                                 |
| **Explanation fields** | explanation.top_tradeoffs\[\].evidenceRef, .factor, .reason                                                                                                                                                                              |
| **Conditions**         | FAIL if any item’s evidenceRef does not resolve to a valid index in derivedSignals.tradeoffs\[\].                                                                                                                                        |
|                        | FAIL if any item’s reason contradicts the delta direction of the referenced tradeoff.                                                                                                                                                    |
|                        | FAIL if derivedSignals.tradeoffs\[\] contains an entry with material=true and explanation.top_tradeoffs omits it entirely.                                                                                                               |
|                        | Climate-specific: if a tradeoff references climate (dimensionOrField = "climate"), the reason must be consistent with lifestyleEvidence.climateEvidence.climateMatchStatus (e.g., must not claim partial match when status is mismatch). |
| ***Notes***            | *Materiality thresholds per Doc 02 section 10: 10-point lifestyle delta, \$150/month surplus delta, or 5pp housing burden delta.*                                                                                                        |

**9.6 V-006 Unsupported Claim Detection**

|                        |                                                                                                                                                                                                                                                                       |
|------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Check**              | **V-006 — Unsupported Claim Detection**                                                                                                                                                                                                                               |
| **Severity**           | FAIL                                                                                                                                                                                                                                                                  |
| **Evidence inputs**    | Full evidence object — all fields available as grounding source                                                                                                                                                                                                       |
| **Explanation fields** | All string-valued fields: reason, note, description, recommended_next_step                                                                                                                                                                                            |
| **Conditions**         | FAIL if any reason, note, or description references a city characteristic, statistic, or factual claim not traceable to lifestyleEvidence, financialEvidence, derivedSignals, userInputs, or scenarioContext.                                                         |
|                        | FAIL if any field makes a causal claim that cannot be grounded in available evidence fields.                                                                                                                                                                          |
|                        | FAIL if climate-related claims reference specific weather data beyond what lifestyleEvidence.climateEvidence provides (the MVP uses match/partial/mismatch, not detailed weather).                                                                                    |
| ***Notes***            | *MVP implementation: keyword/pattern scan for common fabrication patterns (specific dollar amounts not in evidence, named neighborhoods, commute times, school ratings, specific temperatures or weather stats). Full implementation may require an LLM grader pass.* |

**9.7 V-007 Assumption Integrity**

|                        |                                                                                                                                                                                                          |
|------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Check**              | **V-007 — Assumption Integrity**                                                                                                                                                                         |
| **Severity**           | FAIL for misrepresentation, PARTIAL for omission                                                                                                                                                         |
| **Evidence inputs**    | userInputs (income, housing, expenses, retainedIncomeAdjustment, climatePreference, weights), financialEvidence.incomeAssumptionType                                                                     |
| **Explanation fields** | explanation.assumptions_used\[\].sourceField, .assumption, .material                                                                                                                                     |
| **Conditions**         | FAIL if any assumption is presented as confirmed fact when the corresponding field is a modeled estimate (incomeAssumptionType = "assumed_constant", tier-estimated expenses, retainedIncomeAdjustment). |
|                        | PARTIAL if a material assumption (one where changing it would alter the verdict band or shift surplus by ≥\$150/month per Doc 02 section 10) is absent from assumptions_used.                            |
|                        | PARTIAL if sourceField does not resolve to a valid path in userInputs or financialEvidence.                                                                                                              |

**9.8 V-008 Caveat Coverage**

|                        |                                                                                                                                                                                                |
|------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Check**              | **V-008 — Caveat Coverage**                                                                                                                                                                    |
| **Severity**           | FAIL for omission, PARTIAL for weak coverage                                                                                                                                                   |
| **Evidence inputs**    | derivedSignals.caveatFlags\[\] — each entry: { type, affectedField, reason, material }                                                                                                         |
| **Explanation fields** | explanation.uncertainty_or_caveats\[\].evidenceRef, .type, .description                                                                                                                        |
| **Conditions**         | FAIL if any caveatFlag with material=true has no matching entry (by evidenceRef) in uncertainty_or_caveats.                                                                                    |
|                        | PARTIAL if a material caveat is mentioned but its description underweights the severity (e.g., the tax caveat is present but described as minor when income tax regimes differ significantly). |
| ***Notes***            | *Tax caveat trigger per Doc 02 section 12: fires when origin/destination states have different income tax regimes. Uses stored city/state metadata, not computed tax delta.*                   |

**9.9 V-009 Tone Overreach**

|                        |                                                                                                                                  |
|------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| **Check**              | **V-009 — Tone Overreach**                                                                                                       |
| **Severity**           | FAIL                                                                                                                             |
| **Evidence inputs**    | n/a (language analysis on explanation output)                                                                                    |
| **Explanation fields** | All string-valued fields: reason, note, description, recommended_next_step                                                       |
| **Conditions**         | FAIL if any field contains guarantee language: ‘you will’, ‘definitely’, ‘guaranteed’, ‘certain to’, ‘without question’.         |
|                        | FAIL if any field crosses into financial certainty: ‘you should invest’, ‘this is the right move financially’, ‘you can afford’. |
|                        | FAIL if any field crosses into legal certainty: ‘you are entitled’, ‘the law requires’.                                          |
|                        | FAIL if recommended_next_step reads as a command rather than a suggestion.                                                       |
| ***Notes***            | *MVP implementation: regex/keyword blocklist. Full implementation: LLM grader with tone calibration rubric.*                     |

**9.10 V-010 Sensitivity Coverage**

|                        |                                                                                                                                                                      |
|------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Check**              | **V-010 — Sensitivity Coverage**                                                                                                                                     |
| **Severity**           | PARTIAL                                                                                                                                                              |
| **Evidence inputs**    | derivedSignals.sensitivityFlags\[\] — each entry: { type, affectedField, reason, material }                                                                          |
| **Explanation fields** | explanation.sensitivity_notes\[\].evidenceRef, explanation.recommended_next_step                                                                                     |
| **Conditions**         | PARTIAL if derivedSignals.sensitivityFlags\[\] contains entries with material=true and explanation.sensitivity_notes is empty.                                       |
|                        | PARTIAL if the highest-impact material sensitivity flag is not addressed in recommended_next_step.                                                                   |
| ***Notes***            | *Sensitivity coverage failures never produce FAIL on their own — the explanation is not wrong, just incomplete. However, they contribute to overall PARTIAL status.* |

**10. Verifier Severity Model**

|             |                                                                                                                                  |                                                                       |
|-------------|----------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|
| **State**   | **Meaning**                                                                                                                      | **Aggregation Rule**                                                  |
| **PASS**    | No contradictions, no unsupported claims, all required caveats present, tone within bounds.                                      | All 10 checks return PASS.                                            |
| **PARTIAL** | Mostly grounded, but one or two repairable issues. Safe to repair automatically before display.                                  | All checks return PASS or PARTIAL, and at least one returned PARTIAL. |
| **FAIL**    | Contradiction with deterministic truth, unsupported claim, missing critical caveat, serious tone overreach, or malformed schema. | Any single check returns FAIL.                                        |

*Aggregation is strict: a single FAIL-severity check triggers overall
FAIL regardless of how many checks passed. PARTIAL is only possible when
every check returns PASS or PARTIAL.*

**11. Repair Loop**

If the verifier returns PARTIAL or FAIL, the system may attempt one
repair pass. The repair prompt must include: the original structured
explanation, the specific verifier failures (by check ID), an
instruction to revise only the flagged fields, and an instruction not to
invent new claims.

Only one repair pass is allowed in MVP. If the repaired output still
fails verification, the system falls back to the deterministic template
defined in section 11.1.

**11.1 Deterministic Fallback Template**

When the repair loop is exhausted, the system must display a
template-only explanation with zero AI-generated prose. Every slot is
filled directly from the evidence object using Doc 02 field paths.

> VERDICT: {derivedSignals.verdictBand}
>
> SCORES
>
> Lifestyle Fit: {lifestyleEvidence.score}
>
> Financial Fit: {financialEvidence.score}
>
> Move Score: {moveEvidence.score} ({scenarioContext.priorityMode} mode)
>
> CLIMATE
>
> Preference: {lifestyleEvidence.climateEvidence.climatePreference}
>
> Target tendency:
> {lifestyleEvidence.climateEvidence.targetClimateTendency}
>
> Match status: {lifestyleEvidence.climateEvidence.climateMatchStatus}
>
> Adjusted score:
> {lifestyleEvidence.climateEvidence.climateAdjustedScore}
>
> TOP DRIVERS
>
> {for each derivedSignals.positiveDrivers\[\]:}
>
> \- {factor} ({dimensionOrField}): delta {delta}, material={material}
>
> TOP TRADEOFFS
>
> {for each derivedSignals.tradeoffs\[\]:}
>
> \- {factor} ({dimensionOrField}): delta {delta}, material={material}
>
> ASSUMPTIONS
>
> Income assumption: {financialEvidence.incomeAssumptionType}
>
> Climate preference: {userInputs.climatePreference}
>
> {for each userInputs field where material:}
>
> \- {field}: {value}
>
> CAVEATS
>
> {for each derivedSignals.caveatFlags\[\] where material=true:}
>
> \- {type} ({affectedField}): {reason}
>
> SENSITIVITY
>
> {for each derivedSignals.sensitivityFlags\[\] where material=true:}
>
> \- {type} ({affectedField}): {reason}
>
> NEXT STEP
>
> Review the highest-impact sensitivity flag before acting.

This template is intentionally plain. It sacrifices readability for
guaranteed fidelity. The verifier does not need to re-check fallback
output because every value is a direct slot-fill from the evidence
object with no interpretation layer.

**12. Minimum Verifier Metrics for MVP**

To keep the project falsifiable and portfolio-credible, the verifier
should be evaluated against a seeded regression suite of 30–40
scenarios.

- Flag at least 85% of seeded grounding-failure cases.

- Maintain 100% schema-valid output on the regression suite after
  repair.

- Block or repair at least 9 out of 10 known contradiction cases before
  user-facing display.

These are minimum demonstration targets rather than final production
metrics.

**13. Non-Goals for This Document**

- Final prose style or tone calibration.

- Exact prompt text for the explainer or repair pass.

- Full eval harness architecture (belongs in Doc 05 or a dedicated eval
  spec).

- Advanced LLM grader design for V-006 and V-009 full implementations.

- Broader roadmap items such as tax-aware expansion or metro scaling.

**14. Immediate Build Implications**

- The explainer must be implemented against the Doc 02 evidence object,
  not against loose narrative inputs.

- The verifier runs checks V-001 through V-010 in order; V-001 failure
  short-circuits the rest.

- The deterministic fallback template (section 11.1) must be implemented
  alongside the verifier, not deferred.

- Prompt work stays constrained to this schema and rule set.

- Regression suite must include at least one seeded failure case per
  check ID (V-001 through V-010).

- Climate driver and tradeoff scenarios must be included in the
  regression suite to exercise the climateEvidence-specific conditions
  in V-004, V-005, and V-006.

**15. Open Questions**

**15.1 Resolved**

- **Verdict mapping —** resolved in Doc 02 section 9.2. Score-band based
  with explicit downgrade rules. Verdict enum and mapping are locked.

- **Fallback explanation approach —** resolved in this document (section
  11.1). Fully deterministic slot-fill template, no AI-assisted rewrite.

- **Climate evidence schema —** resolved in Doc 02 v0.3 section 6.3.
  Four fields confirmed: climatePreference, targetClimateTendency,
  climateMatchStatus, climateAdjustedScore. Climate-specific conditions
  added to V-004, V-005, and V-006.

**15.2 Remaining**

- **FAIL vs PARTIAL boundary for V-006 (Unsupported Claim):** MVP
  implementation uses keyword scan (always FAIL). When the LLM grader is
  added, should borderline unsupported claims produce PARTIAL instead?

- **Caveat text volume:** How many caveats should be surfaced in prose
  before readability suffers? Current default: max 2 in rendered prose,
  full list in structured output. Needs user testing to confirm.

- **verdictDowngraded / downgradeReason fields:** Recommended addition
  to Doc 02 section 14 JSON. Without these, V-003 must re-derive
  downgrade status from sub-scores and section 9.2 rules. Adding them
  simplifies the verifier and makes the evidence object self-contained.
