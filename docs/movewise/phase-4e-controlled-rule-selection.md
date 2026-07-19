# MoveWise Phase 4E: controlled rule selection

## Status

Complete as an internal runtime boundary. Nick accepted rule `0.2.0`'s exact budgets, caps, and caution thresholds on 2026-07-19. This slice makes the accepted rule deliberately selectable inside `@workspace/decision-core` without making it the product default.

No Wizard question, public API request, preview route, saved analysis, or production behavior selects `0.2.0`. Research Results now traverse the selector's omitted-version path, which is contractually fixed to `0.1.0` and produces the same verified analysis as before.

## Selection contract

`evaluateMoveWiseRule` has two typed and disjoint request shapes:

```ts
evaluateMoveWiseRule({ evaluation });
evaluateMoveWiseRule({ ruleVersion: "0.1.0", evaluation });

evaluateMoveWiseRule({
  ruleVersion: "0.2.0",
  input: completeDeterministicModelInput,
});
```

- Omitting `ruleVersion` is allowed only with a verified current evaluation and selects `0.1.0`.
- Selecting `0.2.0` requires the version literal and a complete `DeterministicModelInput`.
- Unknown versions, missing payloads, cross-version payloads, extra selection keys, and mixed `evaluation` plus `input` requests fail closed.
- The result is discriminated by the selected rule version and deeply immutable through its selected analysis.

The accepted rule now has canonical `DeterministicModelInput`, `DeterministicModelResult`, and `evaluateDeterministicModel` names. The calibration corpus retains `ruleCandidateVersion` as historical fixture metadata so previously accepted judgments remain reproducible.

## Why `0.2.0` is not the default

The current verified `ScenarioInput` contains exact finances and supported commute/climate priorities, but it does not yet contain the user-declared household-continuity signals or essential-requirement confirmations required by rule `0.2.0`. Defaulting those fields, inferring them from city data, or treating absence as neutral would change the accepted model.

The controlled selector therefore accepts only already-normalized `0.2.0` input. It does not invent household facts, silently convert missing values, or reinterpret the existing Wizard. This keeps the accepted evaluator executable while leaving product activation behind a separate adapter and comprehension gate.

## Current consumer behavior

`createResearchResultsViewModel` now calls the selector with `{ evaluation: result }`. Because no version is supplied, the selector returns rule `0.1.0`. Existing score values, ranges, insights, copy, evidence references, and Results rendering remain unchanged.

The research HTTP evaluator still returns the verified Decision Profile only. It does not accept a score-rule version or expose `0.2.0`.

## Verification

The focused gate covers:

- omitted-version and explicit `0.1.0` equivalence;
- exact equality with the pre-selector `evaluateMoveWiseAnalysis` result;
- explicit accepted-fixture `0.2.0` execution;
- unknown, incomplete, mixed, and cross-version request rejection;
- malformed `0.2.0` input rejection at the Zod contract boundary;
- all accepted `0.2.0` calibration and invariant tests;
- existing `0.1.0` score, insight, and Results view-model regression tests;
- library and Results application type-checking.

## Remaining product-activation gates

Before the Wizard or Results can deliberately select `0.2.0`:

1. Add explicit family/individual applicability plus normalized household and essential-requirement questions.
2. Build a verified adapter that derives financial fields from the canonical Decision Profile, including the accepted low-cushion threshold `max($500/month, 10% of destination take-home pay)`.
3. Re-evaluate all accepted plausible financial ranges through the full adapter rather than collapsing them into an average.
4. Bind the `0.2.0` result to input, benchmark, decision-rule, and scoring-rule versions needed for exact reproduction.
5. Add Results explanations for cautions, unmet/unconfirmed essentials, caps, missing/excluded signals, and conditional ranges.
6. Pass responsive browser comprehension review before changing the selected product rule.

This slice does not authorize public API version selection, persistence, preview publication, push, merge, production deployment, provider work, adaptive city research, or AI-generated inputs or conclusions.
