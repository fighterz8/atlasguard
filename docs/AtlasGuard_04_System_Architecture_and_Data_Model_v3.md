**AtlasGuard**

**04 · System Architecture and Data Model**

| **Purpose**               | Define AtlasGuard’s MVP runtime architecture, component boundaries, request lifecycle, persistence model, and canonical data contracts connecting the scorer, explainer, verifier, fallback renderer, and trace logger. |
|---------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Owner / Status / Date** | Nick · Draft v0.2 · 2026-04-01                                                                                                                                                                                          |

Revision Note: v0.2 incorporates architecture decisions from post-review
edits: corrected runtime step ordering, added climateScore to metro
storage, standardized result mode naming, locked downgrade fields as
part of the ScoringEvidence contract, clarified ScenarioInput →
userInputs mapping, and resolved selected Doc 04 open questions.

# 1. Role of This Document

This document translates the product thesis and verification model into
a buildable system structure. It defines where each responsibility
lives, how data moves through the system, what gets persisted, and which
objects are treated as canonical runtime contracts.

This document does not redefine scoring formulas or verifier checks.
Those remain in prior docs. Doc 04 defines the system that hosts them.

# 2. Architectural Thesis

AtlasGuard MVP uses a modular monolith architecture in which
deterministic scoring produces the canonical evidence object, AI
generates a structured explanation from that evidence, a verifier gates
the result before display, and a deterministic fallback guarantees
output fidelity when AI generation fails.

The MVP deliberately avoids microservices, queues, autonomous background
agents, and live request-time data ingestion. Trust comes from clean
contracts and controllable runtime flow, not from infrastructure
complexity.

# 3. Architectural Principles

## 3.1 Deterministic Truth Is Primary

- The scoring engine is the only component allowed to generate numeric
  truth.

- It owns the three top-line scores, verdict band, downgrade fields, and
  the evidence object used by explanation, verification, traceability,
  and fallback rendering.

## 3.2 AI Is a Translation Layer, Not a Decision Engine

- The explainer may translate deterministic evidence into structured
  language.

- It may not invent facts, alter scores, or override verdict logic.

## 3.3 Verification Is a Runtime Gate

- No AI explanation reaches the user without passing through the
  verifier.

- Repair is limited to one pass.

- After that, the system falls back to deterministic slot-fill output
  rather than continuing to iterate.

## 3.4 Persistence Supports Both Utility and Evaluation

- The system stores enough data to reopen scenarios, inspect outputs,
  debug failures, and build regression coverage.

- It does not become a full research platform in MVP.

## 3.5 No Live External Data During Evaluation

- All metro benchmarks and risk flags used during scoring must already
  exist in the database.

- User evaluations must not depend on scraping or live third-party API
  lookups.

# 4. MVP Component Map

AtlasGuard MVP consists of the following logical modules inside one
deployable application.

| **Module**                          | **Primary Responsibilities**                                                                            |
|-------------------------------------|---------------------------------------------------------------------------------------------------------|
| **Frontend Wizard UI**              | Collect inputs, display results, support what-if edits, save/reopen flows.                              |
| **API / Application Layer**         | Validate payloads, orchestrate scorer → explainer → verifier → repair/fallback, and handle persistence. |
| **Deterministic Scoring Engine**    | Compute scores, derived signals, verdict band, downgrade fields, and emit ScoringEvidence.              |
| **Explanation Generator**           | Generate StructuredExplanation JSON from ScoringEvidence only.                                          |
| **Verifier Engine**                 | Run checks V-001 through V-010 and return PASS / PARTIAL / FAIL plus check-level output.                |
| **Repair Handler**                  | Package verifier failures and request one constrained repair pass.                                      |
| **Deterministic Fallback Renderer** | Render slot-fill fallback output directly from ScoringEvidence.                                         |
| **Scenario Persistence Service**    | Save scenarios, latest result, and reopen metadata.                                                     |
| **Trace Logger**                    | Save run artifacts for debugging, eval coverage, and portfolio evidence.                                |
| **Benchmark Data Store**            | Store metro benchmarks, freshness metadata, and static risk flags such as tax-regime differences.       |

# 5. Runtime Request Lifecycle

The evaluation flow is synchronous and linear in MVP.

## Step 1: User Submission

The user completes the wizard and submits current city, target city,
financial inputs, priority mode, lifestyle weights, and relevant
assumptions.

## Step 2: Input Validation

The API validates required fields, supported city selection, numeric
ranges, weight scale, and logical combinations of assumptions. If
validation fails, the request stops here.

## Step 3: Deterministic Scoring

The scoring engine loads the stored benchmark records, computes
component values and final scores, computes derived signals, and emits
the canonical ScoringEvidence object.

## Step 4: Structured Explanation Generation

The explainer receives ScoringEvidence and returns a
StructuredExplanation object only. It must not return freeform prose
first.

## Step 5: Verifier Pass

The verifier runs checks V-001 through V-010 against the explanation and
evidence object. V-001 runs first and short-circuits the remaining
checks if it fails.

## Step 6: Conditional Repair

If verifier status is PARTIAL or FAIL, the system may request one repair
pass using the original explanation plus verifier failures by check ID.

## Step 7: Final Output Selection

The application selects exactly one final output mode: explainer,
repaired_explainer, or deterministic_fallback. This selection is made
before any persistence write so the stored scenario result and rendered
response always point to the same final mode.

## Step 8: Persistence and Trace Logging

The system writes the scenario result, scoring evidence snapshot,
explanation snapshot, verifier result, optional repair snapshot, final
output mode, and benchmark version metadata.

## Step 9: Result Display

The frontend displays top-line scores, verdict, final explanation
content, caveats, assumptions, and next-step guidance.

# 6. Canonical Runtime Contracts

Doc 04 is the place where contract names should stop drifting. The
following objects are canonical for MVP.

## 6.1 ScenarioInput

ScenarioInput represents the validated request submitted by the
frontend.

It contains currentCity, targetCity, priorityMode, weights,
climatePreference, income inputs, housing inputs, expense inputs,
retained income inputs, and assumption flags.

Mapping note: ScenarioInput is the inbound request contract. The scoring
engine normalizes it into evidence.userInputs inside ScoringEvidence.
The verifier never reads ScenarioInput directly; it reads the normalized
userInputs snapshot embedded in ScoringEvidence.

## 6.2 ScoringEvidence

ScoringEvidence is the canonical deterministic output from the scoring
engine and the single grounding source for explanation, verification,
fallback rendering, and trace logging.

It contains scenario context, normalized userInputs, and a
scenario-scoped metro benchmark snapshot of the fields actually used in
scoring. For MVP, that snapshot includes the seven stored dimension
scores, climateTendency, climateScore, and incomeTaxRegime for both
cities as they existed at evaluation time.

Doc 04 decision: verdictDowngraded and downgradeReason are locked as
part of ScoringEvidence rather than being recomputed elsewhere. This
prevents drift between scorer and verifier.

## 6.3 StructuredExplanation

StructuredExplanation is the AI-generated output defined in Doc 03.

It contains verdict, score_summary, top_positive_drivers, top_tradeoffs,
assumptions_used, sensitivity_notes, uncertainty_or_caveats, and
recommended_next_step.

Evidence-backed array items must include evidenceRef.

## 6.4 VerifierResult

VerifierResult is introduced in Doc 04 as the wrapper contract that
carries verifier status and check-level output back to the application
layer.

Doc 03 defines the checks themselves; Doc 04 defines the runtime object
that stores their results.

Fields: status, checkResults\[\], failingCheckIds\[\],
partialCheckIds\[\], messages\[\], repairRecommended, timestamp.

## 6.5 RenderedResult

RenderedResult is the final user-facing result after verification and
fallback handling.

It contains top-line scores, final verdict, final explanation content,
and resultMode.

Locked resultMode enum: explainer \| repaired_explainer \|
deterministic_fallback. These names must be used consistently in
persistence and trace logging.

## 6.6 ScenarioRecord

ScenarioRecord represents a saved user scenario.

It contains scenario metadata, saved user inputs, latest result pointer,
and user access key or email association.

## 6.7 TraceRecord

TraceRecord represents one evaluation run.

It contains request metadata, scoring evidence snapshot, explanation
snapshot, verifier snapshot, repair snapshot if any, final output mode,
timing metadata, and benchmark version metadata.

# 7. Module Ownership and Boundaries

## Scoring Engine Owns

Score generation, evidence generation, derived deterministic signals,
verdict band, and downgrade logic.

## Explainer Owns

Structured narration only, always linked back to evidence.

## Verifier Owns

PASS / PARTIAL / FAIL decision, check-by-check validation, and repair
eligibility.

## Fallback Renderer Owns

Deterministic slot-fill output with no interpretive generation.

## Persistence Layer Owns

Durable storage of scenarios and run artifacts.

## Frontend Owns

User interaction and visual presentation, with no business-rule
ownership.

Diagnostic heuristic: if a number is wrong, the scorer is suspect. If a
sentence is misleading, the explainer or verifier is suspect. If a saved
result cannot be reopened, persistence is suspect.

# 8. Persistence Model

The database stays lean in MVP. The tables below are the intended
persistence boundary, not a commitment to an analytics platform.

| **Table**                         | **Purpose**                                                            | **Key Fields / Notes**                                                                                                                                                                                                                                                                                                                                                                                                                                       |
|-----------------------------------|------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **metros**                        | Stores metro benchmark truth and metadata.                             | city, state, slug, affordabilityScore, climateScore, climateTendency, safetyScore, amenitiesScore, familyFitScore, mobilityScore, opportunityScore, incomeTaxRegime, benchmarkVersion, lastVerifiedAt, staleRiskFlag Note: climateTendency is the categorical classification used for climate match logic; climateScore is the normalized 0–100 lifestyle-dimension value that the scorer adjusts based on match status versus userInputs.climatePreference. |
| **scenarios**                     | Stores saved scenario submissions.                                     | email or lightweight user key, title, currentCity, targetCity, requestPayload, createdAt, updatedAt                                                                                                                                                                                                                                                                                                                                                          |
| **scenario_results**              | Stores the latest canonical user-facing result for each scenario.      | scenarioId, lifestyleFit, financialFit, moveScore, verdictBand, resultMode, structuredExplanation, renderedOutput, createdAt. Doc 04 decision: latest canonical result only; prior runs remain in trace_runs.                                                                                                                                                                                                                                                |
| **trace_runs**                    | Stores immutable evaluation-run artifacts for debugging and eval work. | scenarioId nullable, scoringEvidence, rawExplanation, verifierResult, repairExplanation nullable, finalMode, benchmarkVersion, createdAt                                                                                                                                                                                                                                                                                                                     |
| **benchmark_versions (optional)** | Stores reference metadata for benchmark refresh cycles if needed.      | Add only if version lookup becomes awkward inside metros.                                                                                                                                                                                                                                                                                                                                                                                                    |

# 9. Data Flow and Trust Boundaries

There are three trust layers in AtlasGuard.

Stored truth layer: database plus scoring engine. This includes
benchmark snapshots, normalized userInputs, formulas, and derived
deterministic signals.

Generated language layer: explainer output. This layer may fail or
overstate if ungated.

Bright-line rule: the user should never receive raw unverified language
from the generated language layer.

Verification and recovery layer: verifier plus fallback renderer. This
layer protects the user from bad generated output.

# 10. Failure Modes and Recovery

Invalid user input: stop before scoring and return validation errors.

Scoring failure: stop evaluation, log a technical error, return generic
failure state.

Missing caveat coverage: verifier returns PARTIAL or FAIL when a
triggered caveat is omitted or materially underweighted; repair once,
then fall back if unresolved.

Malformed explanation output: V-001 triggers FAIL, one repair attempt
allowed, then deterministic fallback if still malformed.

Grounding failure: verifier returns FAIL or PARTIAL, repair once, then
fall back if unresolved.

Persistence failure after successful render: return the safe result if
already selected, log failed write, surface save/retry warning in UI.

Stale benchmark risk: continue if scoring is still possible, but surface
triggered caveat flags through explanation or fallback output.

# 11. MVP Security and Trust Notes

Scores are deterministic.

AI does not generate scores.

AI is not given permission to invent missing evidence.

The verifier gates AI output before display.

Fallback guarantees a faithful output path.

No live scraping occurs during evaluation.

Internal trace details are stored for debugging and evaluation, not
exposed by default in the user UI.

# 12. Non-Functional Architecture Targets

Correctness: identical inputs produce identical scores.

Modifiability: scoring logic, explanation schema, and verifier checks
can evolve independently.

Testability: scorer and verifier can be unit-tested without the
frontend.

Availability: the system should degrade to deterministic fallback rather
than total failure when AI output is unusable.

Performance: one evaluation should complete within a reasonable
interactive response window for a prototype.

Traceability: every evidence-backed explanation claim should be
traceable through evidenceRef or direct slot-fill.

# 13. Deferred Architecture

- Microservices.

- Async queue workers.

- Autonomous background evaluators.

- Live city-data sync during request handling.

- Full tax computation service.

- Production auth service.

- Full semantic LLM grading infrastructure.

# 14. Immediate Build Implications

1.  Build the scoring engine as a pure module first.

2.  Build the explainer against ScoringEvidence, not against ad hoc
    prompt inputs.

3.  Build the verifier as an ordered rule engine matching Doc 03.

4.  Implement deterministic fallback at the same time as verifier
    integration.

5.  Persist trace runs from the start so evaluation debt does not pile
    up.

6.  Keep the initial database schema lean and versionable.

# 15. Open Questions

## 15.1 Resolved

7.  Scenario results storage — resolved: scenario_results stores the
    latest canonical result only; historical runs live in trace_runs.

8.  Structured explanation visibility — resolved: the UI shows rendered
    prose plus selected surfaced fields (scores, top drivers, tradeoffs,
    caveats, next step), but not raw explanation JSON by default.

9.  Benchmark freshness granularity — resolved for MVP: freshness is
    stored at the metro-record level, not per individual benchmark
    field.

## 15.2 Remaining

10. Should trace_runs be pruned in MVP, or retained fully for
    portfolio/demo value?

11. Should saved-scenario access remain email-based only, or move to
    lightweight token links?
