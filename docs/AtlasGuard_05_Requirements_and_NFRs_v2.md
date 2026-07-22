**AtlasGuard**

**05 · Requirements and NFRs**

> **Historical status (2026-07-17):** Superseded for implementation by
> [MW-CHG-001](movewise/type-b-c-approval-and-requirements-migration.md)
> and ADR-001 through ADR-005. Retained unchanged below as decision history.

| **Purpose**               | Define the detailed functional and non-functional requirements for AtlasGuard MVP in a format that is buildable, testable, and traceable into later implementation and QA work. |
|---------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Owner / Status / Date** | Nick · Draft v0.1 · 2026-04-01                                                                                                                                                  |

**Revision Note**

v0.2: Added verifier traceability requirements for driver/tradeoff
grounding, unsupported-claim detection, and tone overreach; added
climate preference input, explicit rendering constraints, minimum
fallback content, climate-specific regression coverage, and surfaced
material-assumption display requirements.

# 1. Role of This Document

This document translates the approved project thesis, scoring model,
explanation contract, verifier model, and architecture into explicit
system requirements.

It does not redefine scoring formulas or verifier logic in detail.
Instead, it states what the system must do and how it must behave so
those earlier design decisions can be implemented and tested
consistently.

# 2. Requirements Framing

All requirements in this document are written for the MVP only. They
intentionally exclude broader roadmap items such as nationwide
expansion, live city-data syncing during user requests, full tax
realism, OAuth, and autonomous background optimization. Requirements are
written to remain clear, specific, complete, atomic, and testable.

# 3. Functional Requirements

## 3.1 User Evaluation Flow (UI)

UI-01 The system shall present the relocation evaluation as a guided
4-step workflow labeled Step 1: Current City, Step 2: Target City, Step
3: Financial Picture, and Step 4: Lifestyle Priorities.

**UI-02** The system shall require the user to select a current city
from the supported metro dataset before advancing past Step 1.

**UI-03** The system shall require the user to select a target city from
the supported metro dataset before advancing past Step 2.

**UI-04** The system shall prevent submission if current city or target
city is missing.

**UI-05** The system shall collect financial inputs in Step 3, including
income, housing, recurring expenses, and any retained income assumption
relevant to the move scenario.

UI-06 The system shall collect Step 4 inputs under Lifestyle Priorities
using seven weighted dimensions: affordability, climate, safety,
amenities, family fit, mobility, and opportunity.

UI-06.1 The system shall collect the user's climate preference as a
warm/cold toggle within Step 4 and include that value in deterministic
scoring inputs.

**UI-07** The system shall capture priority weights on a 1–5 scale,
where 5 represents the highest priority.

**UI-08** The system shall allow the user to select a priority mode of
finance, balanced, or lifestyle, which will determine the composite Move
Score blend.

**UI-09** The system shall validate required inputs before scoring
begins and display field-level validation errors when inputs are
incomplete or out of range.

**UI-10** The system shall display the final evaluation results only
after deterministic scoring, explanation generation, and verifier
handling complete successfully or fall back deterministically.

UI-10.1 The results view shall surface material assumptions used in the
evaluation as compact badges or an equivalently visible summary linked
to assumptions_used output.

**UI-11** The system shall allow the user to revise assumptions and
rerun an evaluation without rebuilding the scenario from scratch.

## 3.2 Deterministic Scoring (SCR)

**SCR-01** The system shall compute three deterministic top-line scores
for every valid scenario: Lifestyle Fit, Financial Fit, and Move Score.

**SCR-02** The system shall ensure that identical inputs always produce
identical numeric outputs.

**SCR-03** The system shall compute Lifestyle Fit from stored metro
dimension scores and user-supplied priority weights, not from AI
generation.

**SCR-04** The system shall compute Financial Fit from user financial
inputs and deterministic logic, including projected monthly surplus
comparison and housing burden effects.

**SCR-05** The system shall compute Move Score as a deterministic blend
of Lifestyle Fit and Financial Fit using the selected priority mode.

**SCR-06** The scoring engine shall emit a canonical evidence object in
addition to the three top-line scores.

**SCR-07** The evidence object shall include user inputs, scenario
context, lifestyle evidence, financial evidence, move evidence, derived
signals, verdict band, and downgrade metadata.

**SCR-08** The evidence object shall include component-level values and
deltas sufficient to support explanation grounding, verification, trace
logging, and deterministic fallback rendering.

**SCR-09** The system shall derive positive drivers and tradeoffs
deterministically from scoring evidence rather than requiring the
explanation layer to infer them.

**SCR-10** The system shall emit caveat flags and sensitivity flags as
deterministic outputs when scenario conditions meet configured trigger
rules.

**SCR-11** The system shall emit verdictBand, verdictDowngraded, and
downgradeReason as deterministic outputs before any explanation is
generated.

## 3.3 Explanation Generation (EXP)

**EXP-01** The system shall generate explanation output as structured
data before rendering any user-facing prose.

**EXP-02** The structured explanation shall include exactly these
required top-level fields: verdict, score_summary, top_positive_drivers,
top_tradeoffs, assumptions_used, sensitivity_notes,
uncertainty_or_caveats, and recommended_next_step.

**EXP-03** The explanation generator shall consume only the canonical
evidence object and shall not infer missing evidence on its own.

**EXP-04** Each explanation array item that references evidence shall
include an evidenceRef path so the verifier can trace the claim back to
deterministic evidence.

**EXP-05** The explanation generator shall restate the three top-line
scores exactly as received from deterministic evidence.

**EXP-06** The explanation generator shall not invent new city facts,
unsupported statistics, or stronger certainty than the available
evidence permits.

EXP-07 Rendered explanation prose may compress or reorder structured
content for readability, but it shall not introduce new claims, omit
critical tradeoffs or triggered caveats, or bury negative signals behind
positive framing.

## 3.4 Verifier and Repair (VER)

**VER-01** The system shall verify every structured explanation before
it is shown to the user.

**VER-02** The verifier shall evaluate explanations using the ordered
check set V-001 through V-010.

**VER-03** The verifier shall short-circuit further checks if schema
validity check V-001 fails.

**VER-04** The verifier shall return exactly one overall status per
explanation: PASS, PARTIAL, or FAIL.

**VER-05** The system shall allow no more than one repair pass when
verifier status is PARTIAL or FAIL.

**VER-06** The repair request shall include the original structured
explanation, failing or partial check IDs, and instructions to revise
only the flagged fields without inventing new claims.

**VER-07** The verifier shall compare evidence-backed explanation
content against deterministic evidence fields, not against freeform
prose heuristics alone.

**VER-08** The verifier shall enforce exact score fidelity between
explanation.score_summary and deterministic top-line scores.

**VER-09** The verifier shall enforce verdict alignment with
deterministic verdictBand and associated downgrade logic.

**VER-10** The verifier shall enforce caveat coverage when deterministic
caveat flags are triggered.

VER-11 The verifier shall enforce that each top_positive_drivers item
resolves to a deterministic driver entry and does not contradict the
direction or magnitude of the referenced evidence.

VER-12 The verifier shall enforce that each top_tradeoffs item resolves
to a deterministic tradeoff entry and that no material tradeoff is
omitted from the explanation output.

VER-13 The verifier shall detect and fail explanation output containing
unsupported claims not traceable to deterministic evidence, derived
signals, or user inputs.

VER-14 The verifier shall detect and fail tone overreach, including
guarantee language, unsupported financial certainty, unsupported legal
certainty, or command-style next-step language.

## 3.5 Fallback Rendering (RES)

**RES-01** The system shall provide a deterministic fallback explanation
path when repair is exhausted or AI output remains unusable.

**RES-02** The deterministic fallback shall render values directly from
the evidence object with no AI-assisted interpretation.

RES-02.1 The deterministic fallback shall include at minimum the
verdict, three top-line scores, top drivers, top tradeoffs, material
assumptions, triggered caveats, sensitivity items, and a next-step line
derived from the highest-impact uncertainty.

**RES-03** The system shall label the final result mode internally as
one of: explainer, repaired_explainer, or deterministic_fallback.

**RES-04** The user shall never receive raw unverified language from the
generated language layer.

RES-05 The user-facing result shall display rendered prose plus selected
surfaced summary elements, while raw structured explanation JSON remains
internal by default.

## 3.6 Scenario Persistence (SAV)

**SAV-01** The system shall allow evaluated scenarios to be saved for
later retrieval using lightweight persistence.

**SAV-02** The system shall store enough scenario data to reopen the
scenario and reproduce the latest canonical result.

**SAV-03** The system shall store the latest canonical result per saved
scenario.

**SAV-04** The system shall persist final scores, final verdict, final
output mode, and final rendered result for saved scenarios.

## 3.7 Trace Logging and Eval Support (TRC)

**TRC-01** The system shall create a trace record for each evaluation
run.

**TRC-02** The trace record shall capture the scoring evidence snapshot,
raw structured explanation, verifier result, repair output if any, final
mode, and benchmark version metadata.

**TRC-03** The system shall retain enough trace detail to support
regression suite construction, verifier debugging, and portfolio
demonstration.

**TRC-04** The regression suite shall contain at least one seeded
failure case for each verifier check ID V-001 through V-010.

**TRC-05** The MVP regression suite shall contain at least 30–40 seeded
scenarios for verifier evaluation.

TRC-06 The regression suite shall include climate-specific seeded
scenarios covering climate match, partial match, mismatch, and cases
where climate appears as a driver or tradeoff.

## 3.8 Benchmark Data (BEN)

**BEN-01** The system shall store curated metro benchmark data ahead of
user evaluation rather than generating live city truth during requests.

**BEN-02** The metro benchmark record shall include the stored dimension
values needed for deterministic scoring, including climate-related
fields and tax-regime support fields required by caveat logic.

**BEN-03** The system shall store freshness metadata at the metro-record
level for MVP.

**BEN-04** The system shall allow inactive metro records to remain in
storage without being selectable in the user flow.

# 4. Non-Functional Requirements

The targets below are MVP-level prototype targets, not production-grade
SLAs.

## 4.1 Performance (NFR-P)

**NFR-P-01** For a valid scenario under normal prototype conditions, the
system shall return a rendered result within an interactive response
window appropriate for a web prototype.

**NFR-P-02** Deterministic scoring shall complete fast enough that
explanation generation and verifier handling dominate end-user wait time
rather than scoring computation.

**NFR-P-03** Fallback rendering shall complete without requiring any
additional model call.

## 4.2 Modifiability (NFR-M)

**NFR-M-01** The system shall isolate deterministic scoring logic from
explanation generation logic.

**NFR-M-02** The system shall isolate verifier rules from explanation
prompt wording so either can change without rewriting the other.

**NFR-M-03** The system shall support updating metro benchmark data
without requiring frontend workflow redesign.

**NFR-M-04** The system shall support adding new verifier checks or
revising existing ones without changing the user input flow.

## 4.3 Usability (NFR-U)

**NFR-U-01** The wizard flow shall remain understandable to a first-time
user without requiring technical knowledge of scoring formulas.

**NFR-U-02** The system shall communicate negative tradeoffs and caveats
clearly rather than burying them behind positive framing.

**NFR-U-03** The system shall allow users to understand which
assumptions most affect the result.

**NFR-U-04** The final output shall prioritize readability while
preserving faithfulness to the structured explanation or deterministic
fallback.

## 4.4 Testability (NFR-T)

**NFR-T-01** The deterministic scoring engine shall be unit-testable
independently of the frontend and independently of any model provider.

**NFR-T-02** The verifier shall be testable against seeded structured
explanation outputs and stored evidence objects.

**NFR-T-03** Requirements involving score fidelity, verdict alignment,
caveat coverage, and fallback activation shall be verifiable through
automated tests or deterministic fixtures.

**NFR-T-04** The system shall support regression testing of verifier
performance against a seeded scenario suite of at least 30–40 cases.

## 4.5 Availability / Graceful Degradation (NFR-A)

**NFR-A-01** If the explanation generator returns malformed or unusable
output, the system shall still return a user-facing result through
deterministic fallback rather than total evaluation failure.

**NFR-A-02** If benchmark freshness risk is triggered but deterministic
scoring can still run, the system shall continue evaluation and surface
the required caveat instead of blocking the user outright.

**NFR-A-03** If scenario persistence fails after a safe result is
generated, the system shall still return the result and log the failed
save attempt for retry or warning handling.

## 4.6 Security / Trust Integrity (NFR-S)

**NFR-S-01** The system shall never allow AI-generated output to
override deterministic scores.

**NFR-S-02** The system shall not expose raw internal trace artifacts to
end users by default.

**NFR-S-03** The system shall not depend on live scraping during user
evaluation.

**NFR-S-04** The system shall block or repair explanations that contain
unsupported claims, missing critical caveats, or tone overreach before
display, consistent with verifier checks V-001 through V-010.

**NFR-S-05** The system shall keep saved-scenario persistence
lightweight in MVP and shall avoid claiming stronger identity or
security guarantees than are actually implemented.

# 5. Deferred / Explicitly Out of Scope Requirements

The following are intentionally excluded from MVP requirements:

- Nationwide metro support

- Live city-data sync during request execution

- Full tax-aware financial modeling

- OAuth or production-grade account management

- Fully semantic LLM grading for all verifier checks

- Autonomous background improvement agents

# 6. Immediate Build Implications

- Build the scorer and evidence contract before prompt tuning.

- Build the structured explanation schema and verifier in parallel.

- Implement deterministic fallback with the verifier, not later.

- Keep persistence and trace logging lean but real from the start.

- Use these requirement IDs as the basis for later traceability and QA
  mapping.

# 7. Open Questions

## 7.1 Resolved

- MVP stays on the 4-step evaluation flow.

- Scores remain deterministic.

- Explanation remains structured-first.

- Verifier runs before any user-facing explanation.

- Repair is capped at one pass.

- Fallback is deterministic, not AI-assisted.

- UI shows rendered prose plus selected surfaced summary elements,
  including scores, drivers/tradeoffs, caveats, and material
  assumptions; raw structured JSON is not displayed by default.

## 7.2 Remaining

- What exact interactive response-time target should be committed to for
  the prototype?

- Should comparison of multiple saved scenarios be treated as MVP or
  Phase 2, given it appeared in the earlier RDE direction but is not
  central to AtlasGuard’s trust layer?
