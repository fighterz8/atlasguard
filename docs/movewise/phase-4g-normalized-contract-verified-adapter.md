# MoveWise Phase 4G: normalized contract and verified adapter

## Status

Complete as an internal engine boundary on 2026-07-19. Nick accepted Phase 4F policies P01–P10 and scenarios A01–A14 before implementation.

This slice adds the versioned household-answer contract and the verified rule `0.2.0` adapter. It does not change the current Wizard, Results rule selection, research HTTP response, saved state, preview route, or production behavior. The product path still defaults to rule `0.1.0`.

## Household-answer trust boundary

`VerifiedMoveWiseHouseholdAnswers` binds schema version `1.0.0`, question version `1.0.0`, mode, canonical factor order, every applicable answer, and a canonical SHA-256 checksum.

- Family mode requires all six accepted factors.
- Individual mode requires only `space_fit`, `support_network`, `required_services_continuity`, and `car_free_access`.
- Missing, duplicate, reordered, unknown, extra, and mode-inapplicable factors fail closed.
- `not_applicable` maps only to `excluded` with no essential status.
- `important` requires a non-excluded impact and no essential status.
- `essential` requires a non-excluded impact and an explicit `confirmed_met`, `confirmed_unmet`, or `unconfirmed` status.
- `unavailable`, `neutral`, and `excluded` remain different states.

The verified object and nested factors are deeply immutable. Changing a bound answer without recomputing the checksum is rejected.

## Runtime input and result semantics

Production-shaped `DeterministicModelInput` is now separate from the historical calibration-fixture input. It requires `householdMode` plus every mode-applicable signal exactly once in canonical order. The accepted calibration corpus retains its historical evaluator so all 24 human-approved outcomes and exact point values remain reproducible.

Household Fit exposes each factor's status and contribution:

- available impacts retain the accepted `-15` through `+15` contributions;
- excluded and unavailable factors contribute zero without budget redistribution;
- a component containing available and unavailable factors reports `partial`;
- an all-excluded component reports `excluded`;
- an all-unavailable or historically empty component reports `unavailable`.

Essential status changes precedence and explanation, not the factor's point contribution.

## Verified point adapter

`adaptVerifiedEvaluationToDeterministicModelInput` accepts only a verified user-facing or research evaluation plus verified household answers. It derives, rather than accepts, every financial field:

- metro slugs, monthly cushion delta, destination cushion, materiality threshold, and housing burden come from the verified Decision Profile;
- unknown destination gross income preserves a `null` housing burden;
- the low-cushion caution threshold is `max(50_000 cents, roundHalfAwayFromZero(destination take-home / 10))`;
- commute and climate use the verified priority change, mapping exclusion, unavailable evidence, classification, and materiality exactly as accepted;
- all household factors become signals, while only essential factors become essential requirements.

Missing registered `commute_time` or `climate_heat` priorities fail closed. Extra benchmark priorities do not enter rule `0.2.0`.

## Full endpoint reevaluation

`evaluateMoveWiseDeterministicModel` discovers every non-degenerate plausible range on score-relevant finances, including destination gross income. It enumerates the Cartesian low/high endpoint set without mutating the source, rebuilds and verifies the complete Decision Profile at each endpoint, independently derives the low-cushion threshold, and reruns the complete `0.2.0` point evaluator.

The immutable range envelope returns:

- deterministic minimum and maximum values;
- every varied input path;
- every endpoint value and input fingerprint;
- the union of endpoint blocker codes;
- the union of endpoint caution codes.

Endpoint ordering is value first, then input fingerprint. A point outside its plausible endpoint span fails closed. If any endpoint crosses a hard financial blocker while the point does not, the point result is capped at 59 and becomes `promising_if`; an active point blocker remains the stricter `high_financial_risk` result. Endpoint-only cautions stay visible without making an otherwise safe point conditional.

## Reproducibility envelope

The analysis binds:

- point input fingerprint;
- benchmark snapshot version and SHA-256;
- Decision Profile schema and decision-rule versions;
- deterministic-model input schema and rule `0.2.0` versions;
- household question version and answer checksum;
- varied range paths and all endpoint fingerprints.

Equivalent verified inputs produce byte-equivalent normalized input and analysis while leaving both sources unchanged.

## Verification

Focused verification covers P01–P10 and A01–A14 behavior, all accepted calibration outcomes, exact synthetic point values, runtime missingness, rule selection, existing rule `0.1.0` range behavior, research/user-facing reevaluation, determinism, immutability, and library type-checking.

Full `pnpm run verify` passes 46 test files / 355 tests, generated transport drift, formatting, all workspace type-checks and production builds, and the production audit with no known vulnerabilities. The existing tooltip sourcemap and bundle-size advisories remain non-blocking.

## Deliberate activation boundary

No current consumer calls this adapter. Rule `0.2.0` remains explicitly selectable only with a complete normalized input, while omitted-version Results stay on `0.1.0`.

A review preview is authorized for the later rendered Wizard/Results activation slice. This engine-only slice has no honest browser surface to preview. Product activation still requires the accepted four-step Wizard questions, visible missing/excluded/essential explanations, responsive comprehension review, and a separate explicit decision to select `0.2.0`.

This slice does not authorize public API selection, persistence, push, merge, production deployment, provider/AI work, live external data, or inferred household facts.
