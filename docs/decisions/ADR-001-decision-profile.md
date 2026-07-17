# ADR-001: Replace the three-score MVP with a Decision Profile

## Status

Accepted

## Date

2026-07-17

## Context

The legacy MVP contract produces Lifestyle Fit, Financial Fit, and a blended Move Score, then requires an AI-generated explanation to pass a verifier before any result is shown. Review found that the composite combines unlike constructs: Lifestyle Fit is primarily an absolute target score, while Financial Fit is primarily an origin-to-target change. Affordability is also counted in both. A deterministic calculation can therefore be repeatable while still communicating false confidence.

Nick authorized implementation after receiving a roadmap that identified this redesign as an explicit Type B behavioral and Type C scope decision. The migration record is [MoveWise Type B/C Approval and Requirements Migration](../movewise/type-b-c-approval-and-requirements-migration.md).

## Decision

MoveWise will make a deterministic `DecisionProfile` its canonical user-facing result. It contains five independent parts:

1. `FinancialPosition`: current and target monthly cushion, change, housing burden when gross income is supplied, assumption status, and absolute blocker/risk flags.
2. `PriorityChange[]`: origin-to-destination changes for supported dimensions, including raw evidence, transformation, user weight from 0–5, contribution, and availability.
3. `DecisionCondition`: exactly one of `worth_a_closer_look`, `promising_if`, `meaningful_tradeoff`, or `high_financial_risk_under_assumptions`.
4. `ConfidenceAssessment`: `high`, `moderate`, or `limited`, based on evidence quality rather than outcome favorability.
5. `StabilityAssessment`: `stable` or `assumption_sensitive`, with exact decision-changing breakpoints when a valid breakpoint exists.

The legacy three 0–100 scores, blend modes, score bands, and financial downgrade rules are retired from the active MVP contract. They will not be retained as hidden compatibility outputs.

A complete deterministic rendering is a first-class, non-degraded result. AI is optional and may only paraphrase facts already selected by deterministic logic. If AI is enabled, the result-mode enum is:

- `deterministic`
- `explainer`
- `repaired_explainer`
- `deterministic_fallback`

AI may not calculate values, select evidence, decide the condition, change confidence or stability, or add local facts. No raw unverified output reaches the user.

## Alternatives Considered

### Keep the three scores and add stronger caveats

This preserves previous work but leaves the composite's semantics incoherent and asks caveats to correct a misleading headline.

### Keep only separate Lifestyle and Financial scores

This avoids the blend but still compresses cash-flow safety and uncertain regional evidence into uncalibrated 0–100 values.

### Remove AI permanently

A deterministic-only product is viable, but a verified optional paraphrase remains useful portfolio evidence and can improve readability without owning truth.

## Consequences

- The decision table, confidence policy, stability policy, materiality rules, missingness rules, and breakpoint behavior must be specified and fixture-tested before broad UI implementation.
- The Wizard and Results contracts change; the legacy requirements remain historical evidence, not implementation authority.
- Verifier checks are adapted from three-score fidelity to complete Decision Profile fidelity.
- The 30–40-scenario regression suite remains required before the optional AI path is complete.
- Any future scientific or universal Move Score requires a new ADR plus calibration evidence.

## Revisit When

Task-based user research shows that people cannot understand or compare Decision Profiles without an additional summary representation, and a proposed representation has defensible semantics and calibration.
