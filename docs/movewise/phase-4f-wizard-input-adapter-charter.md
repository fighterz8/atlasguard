# MoveWise Phase 4F: Wizard input and adapter charter

## Status

Proposed for human review. This charter defines the smallest question and normalization surface that could eventually supply accepted rule `0.2.0`. It does not change the current Wizard draft, ScenarioInput, Results, rule selection, public API, preview, or production behavior.

Question semantics must be accepted before adapter or UI implementation because these answers can change the recommendation, cap favorability, or create a conditional result.

## Design constraints

- Family and individual mode change applicability only; neither grants points.
- Every included household fact comes from the user. MoveWise does not infer school, safety, childcare, health-care, neighborhood, or “family-friendly” quality from a city name.
- Exact finances own income, housing, childcare cost, recurring expenses, and retained-property net. Household questions cannot score those dollars again.
- `Essential` is reserved for a requirement the user says must work for the move. Benchmark preferences such as commute and climate cannot claim essential feasibility.
- Unknown, unanswered, excluded, and neutral are different states and must remain different through Results.
- The verified Decision Profile remains canonical for finances and supported commute/climate evidence.

## Proposed Wizard shape

Keep the current location and money steps. Split the current final step into two short steps:

1. **Your move** — origin, destination, and who would be moving.
2. **Your money** — unchanged exact financial questions and plausible ranges.
3. **Daily life** — commute and climate direction/importance using supported evidence.
4. **Household needs** — only the mode-applicable user-supplied factors below.

The fourth step may be skipped only when the user explicitly marks every applicable factor `Not part of my decision`. It may never be skipped by silently applying defaults.

## Q1: moving party

**Question:** `Who would be making this move?`

| User option                                       | Normalized mode | Explanation shown to user                                                      |
| ------------------------------------------------- | --------------- | ------------------------------------------------------------------------------ |
| `Just me`                                         | `individual`    | `We’ll ask only about needs that can apply to an individual move.`             |
| `Me and one or more other people in my household` | `family`        | `We’ll include household continuity without adding an automatic family bonus.` |

`Family` includes partners, children, relatives, or other household members. The product does not need relationship details or the names/ages of people moving in this version.

## Required addition to Your money

The accepted housing-burden caution and blocker require destination gross income. The current Wizard leaves gross income unavailable and must not estimate it from take-home pay.

**Question:** `What would your household’s total monthly income be before taxes in the destination?`

| User option                  | ScenarioInput mapping                                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| `Enter monthly gross income` | Positive whole-dollar amount with `Confirmed` or `Estimate`; estimates may add a plausible low/high range |
| `I don’t know`               | `finances.destination.grossIncome: null`; housing burden remains unavailable                              |

No current-city gross-income question is required for rule `0.2.0`. If destination gross income is unavailable, Results must say that the 45% caution and 50% blocker could not be evaluated. It must not imply the move is below either threshold.

## Canonical factor registry

Historical calibration fixtures use several equivalent IDs such as `nearby_relatives`, `nearby_support`, `suitable_space`, and `required_space`. Product input should use the six canonical factors below rather than preserving fixture-specific aliases.

The fixture-to-product mapping is exact:

| Historical fixture ID                                   | Canonical product factor       |
| ------------------------------------------------------- | ------------------------------ |
| `housing_fit`, `required_space`, `suitable_space`       | `space_fit`                    |
| `nearby_relatives`, `nearby_support`, `support_network` | `support_network`              |
| `childcare_continuity`                                  | `childcare_continuity`         |
| `school_continuity`                                     | `school_continuity`            |
| `required_services_continuity`                          | `required_services_continuity` |
| `car_free_access`                                       | `car_free_access`              |

| Factor ID                      | User-facing label                                           | Individual | Family | What the answer is allowed to mean                                           |
| ------------------------------ | ----------------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------- |
| `space_fit`                    | `Enough suitable space for the people moving`               | Yes        | Yes    | User's lived assessment of space suitability; not a city housing grade       |
| `support_network`              | `Being near people you rely on`                             | Yes        | Yes    | Personal support continuity; not population, demographics, or social ranking |
| `childcare_continuity`         | `Keeping workable childcare arrangements`                   | No         | Yes    | Continuity only; childcare dollars remain in recurring expenses              |
| `school_continuity`            | `Keeping a workable school path`                            | No         | Yes    | User-confirmed continuity; not school quality, ratings, or district claims   |
| `required_services_continuity` | `Keeping required therapy, disability, or support services` | Yes        | Yes    | User confirmation only; no inferred service availability or quality          |
| `car_free_access`              | `Completing essential routines without driving`             | Yes        | Yes    | User-confirmed routine viability; not a generic walkability or transit score |

Family mode asks all six factors. Individual mode asks `space_fit`, `support_network`, `required_services_continuity`, and `car_free_access`. Every shown factor requires an explicit response.

## Q2: role in the decision

For each applicable factor, first ask:

**Question:** `What role does this play in your decision?`

| User option                                    | Importance       | Essential status  | Meaning                                                               |
| ---------------------------------------------- | ---------------- | ----------------- | --------------------------------------------------------------------- |
| `Important, but not a deal-breaker`            | `important`      | none              | The factor may add a supported lift or tradeoff                       |
| `Essential — the destination meets this need`  | `essential`      | `confirmed_met`   | User confirms the requirement works                                   |
| `Essential — I haven’t confirmed it yet`       | `essential`      | `unconfirmed`     | Produces `Promising if…` when no stricter financial blocker applies   |
| `Essential — the destination does not meet it` | `essential`      | `confirmed_unmet` | Prevents a favorable result and must be explained                     |
| `Not part of my decision`                      | `not_applicable` | none              | Explicitly excluded; contributes zero and remains visible as excluded |

The UI should not use a generic `Must-have` importance option for commute or climate. Rename that existing option to `Very important` with the description `Give this supported comparison the strongest daily-life influence.` It remains a contribution weight, not an essential-requirement blocker.

## Q3: expected change

When the factor is not excluded, ask:

**Question:** `After the move, how would this compare with your situation now?`

| User option        | Normalized impact |
| ------------------ | ----------------- |
| `Much harder`      | `strong_negative` |
| `Somewhat harder`  | `negative`        |
| `About the same`   | `neutral`         |
| `Somewhat better`  | `positive`        |
| `Much better`      | `strong_positive` |
| `I’m not sure yet` | `unavailable`     |

The prompt may substitute `worse/better` for `harder/better` per factor during later comprehension testing, but the normalized values and ordering cannot change without a new review.

## Proposed normalized answer contract

```ts
type MoveWiseHouseholdMode = "individual" | "family";

type HouseholdFactorAnswer = {
  factorId:
    | "space_fit"
    | "support_network"
    | "childcare_continuity"
    | "school_continuity"
    | "required_services_continuity"
    | "car_free_access";
  importance: "important" | "essential" | "not_applicable";
  impact:
    | "strong_negative"
    | "negative"
    | "neutral"
    | "positive"
    | "strong_positive"
    | "unavailable"
    | "excluded";
  essentialStatus: "confirmed_met" | "confirmed_unmet" | "unconfirmed" | null;
};
```

Contract invariants:

- every factor applicable to the selected mode appears exactly once;
- mode-inapplicable factor IDs are rejected, not silently ignored;
- `not_applicable` requires `impact: "excluded"` and `essentialStatus: null`;
- `important` requires a non-excluded impact and `essentialStatus: null`;
- `essential` requires a non-excluded impact and a non-null essential status;
- duplicate, missing, unknown, or extra factor IDs fail closed;
- `unavailable` contributes zero but stays visible as missing information; it never becomes neutral or excluded;
- the same factor may create one Household Fit impact and one essential status because essential status changes precedence, not points.

## Proposed verified adapter boundary

The future adapter should accept only:

1. a `VerifiedEvaluationResult` or `VerifiedResearchEvaluationResult` produced from canonical ScenarioInput and benchmark evidence; and
2. a schema-verified, immutable household-question response with its own question-contract version and checksum.

It must not accept an arbitrary Decision Profile, unverified form draft, precomputed score, city label, or caller-supplied financial derivation.

### Financial derivation

For each point or endpoint evaluation, derive these values from the verified Decision Profile:

| Rule `0.2.0` input                   | Canonical source                                                         |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `originMetroSlug`                    | `decisionProfile.scenario.origin.slug`                                   |
| `destinationMetroSlug`               | `decisionProfile.scenario.destination.slug`                              |
| `monthlyCushionDeltaCents`           | `financialPosition.change.monthlyCushionDeltaCents`                      |
| `destinationMonthlyCushionCents`     | `financialPosition.destination.monthlyCushionCents`                      |
| `financialMaterialityThresholdCents` | `financialPosition.change.materialityThresholdCents`                     |
| `destinationHousingBurdenBps`        | `financialPosition.destination.housingBurdenBps`; preserve `null`        |
| `lowCushionCautionThresholdCents`    | greater of `50_000` cents or 10% of destination monthly take-home income |

The 10% calculation uses the existing `roundHalfAwayFromZero` integer rule. The adapter never accepts a caller-supplied threshold and never derives gross income from take-home income.

### Supported daily-life mapping

Map each verified `PriorityChange` without reinterpreting benchmark values:

| Decision Profile state                        | Rule impact       |
| --------------------------------------------- | ----------------- |
| priority weight `0`                           | `excluded`        |
| active priority with unavailable evidence     | `unavailable`     |
| `classification: similar`                     | `neutral`         |
| `classification: improves`, `material: false` | `positive`        |
| `classification: improves`, `material: true`  | `strong_positive` |
| `classification: worsens`, `material: false`  | `negative`        |
| `classification: worsens`, `material: true`   | `strong_negative` |

Only `commute_time` and `climate_heat` map in this version. Missing registered priorities fail closed; extra benchmark priorities remain outside rule `0.2.0` until separately approved.

### Household and essential mapping

- Every applicable factor answer becomes a Household Fit signal, including `excluded` and `unavailable`, so Results can distinguish them.
- `strong_negative` through `strong_positive` retain the accepted Household Fit contributions.
- `excluded` and `unavailable` contribute zero and never redistribute budget.
- Every `essential` answer also becomes one essential requirement with the same canonical factor ID and selected status.
- `important` and `not_applicable` answers never create essential requirements.
- The adapter must reject an essential answer whose factor is missing, mode-inapplicable, or excluded.

This requires a reviewed input-contract extension before implementation: add `householdMode`, allow `excluded` and `unavailable` Household Fit impacts, and preserve per-factor status in the result. The current calibration input excludes those two Household Fit states and cannot yet represent the proposed missingness contract honestly.

### Plausible-range reevaluation

The adapter must not pass one averaged range into the point evaluator.

1. Discover every non-degenerate plausible range in score-relevant ScenarioInput finances, including destination gross income.
2. Rebuild and verify the full Decision Profile at every low/high endpoint combination.
3. Derive the low-cushion threshold independently at each endpoint because destination take-home may vary.
4. Run the complete `0.2.0` point evaluator for every endpoint with the same verified household answers.
5. Return deterministic minimum/maximum values, endpoint fingerprints, varied input paths, the union of endpoint blocker/caution codes, and `assumption_sensitive` when endpoints differ.
6. If any endpoint crosses a hard financial blocker, the point result is conditional and cannot be favorable even when the point estimate itself is safe.

No endpoint may reuse or mutate the original verified evaluation. Endpoint ordering is canonical by value, then input fingerprint.

### Reproducibility envelope

Before Results activation, the verified `0.2.0` analysis must bind:

- input fingerprint;
- benchmark version and SHA-256;
- Decision Profile schema and decision-rule versions;
- deterministic-model schema and rule version `0.2.0`;
- Wizard question-contract version;
- canonical household-answer checksum;
- all varied range paths and endpoint fingerprints.

Changing any bound value requires reevaluation. The UI cannot synthesize, patch, or reinterpret this envelope.

## Adapter review scenarios

These are proposed mapping fixtures, not real users and not empirical claims.

| ID  | Setup                                                                                           | Required adapter behavior                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| A01 | Family; space somewhat better; support somewhat better; both important                          | Emit `space_fit +positive` and `support_network +positive`; no essential requirements                                         |
| A02 | Individual; all four applicable factors explicitly `Not part of my decision`                    | Emit four `excluded` signals, zero Household Fit contribution, and no family-only factor IDs                                  |
| A03 | Individual; car-free access essential and unconfirmed; finances improve                         | Emit `car_free_access` essential `unconfirmed`; evaluator returns `Promising if…` unless a stricter financial blocker applies |
| A04 | Family; school continuity essential and confirmed unmet                                         | Emit `school_continuity` essential `confirmed_unmet`; favorable result is capped and explained                                |
| A05 | Individual; support network much harder and important                                           | Emit `support_network +strong_negative`; preserve the accepted I05 tradeoff behavior                                          |
| A06 | Family; required services important but user selects `I’m not sure yet`                         | Emit `required_services_continuity +unavailable`; contribute zero and show missing, never neutral or excluded                 |
| A07 | Family; childcare marked `Not part of my decision`; childcare cost already in expenses          | Emit `childcare_continuity +excluded`; never add or subtract Household Fit points for the same childcare dollars              |
| A08 | Destination take-home `$4,000/month`                                                            | Derive low-cushion threshold `$500/month`, not `$400`                                                                         |
| A09 | Destination take-home `$8,000/month`                                                            | Derive low-cushion threshold `$800/month`, not `$500`                                                                         |
| A10 | Destination gross income unknown                                                                | Preserve housing burden as unavailable; do not activate or clear the 45%/50% rules by assumption                              |
| A11 | Commute improves materially; climate excluded                                                   | Map commute `strong_positive`, climate `excluded`; do not redistribute climate budget                                         |
| A12 | Destination-income range crosses from negative to positive cushion                              | Reevaluate full endpoints, preserve fingerprints and blocker union, and return a conditional non-favorable point result       |
| A13 | Duplicate factor, missing applicable factor, family-only factor in individual mode, or extra ID | Reject the household response before evaluation                                                                               |
| A14 | Same verified evaluation and household answers repeated                                         | Produce byte-equivalent normalized input and analysis; keep all source objects immutable                                      |

## Human review decisions

Nick can respond to each policy with `Accept`, `Change`, or `Question`:

| ID  | Decision                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------- |
| P01 | Four-step Wizard: move/mode, money, daily life, household needs                                           |
| P02 | Mode wording: `Just me` versus `Me and one or more other people in my household`                          |
| P03 | Six canonical factors and the family/individual applicability table                                       |
| P04 | Role options that separate important, essential-met, essential-unconfirmed, essential-unmet, and excluded |
| P05 | Six impact options from much harder to much better plus `I’m not sure yet`                                |
| P06 | Reserve `Essential` for user-confirmable needs and rename benchmark `Must-have` to `Very important`       |
| P07 | Add optional destination gross income; unknown means housing-burden caution/blocker remain unevaluated    |
| P08 | Extend the model contract so excluded/unavailable household factors remain distinguishable                |
| P09 | Exact Decision Profile-to-finance and commute/climate impact mappings                                     |
| P10 | Full endpoint reevaluation and reproducibility envelope before product activation                         |

All 14 adapter scenarios are also reviewable by ID. No accepted policy in this document authorizes UI implementation, runtime `0.2.0` selection, public API exposure, persistence, preview publication, push, merge, or production deployment.

## Verification

The review packet was cross-checked against all accepted historical Household Fit and essential-requirement IDs, canonical Decision Profile financial paths, ScenarioInput gross-income/range support, existing score endpoint descriptors, and current priority availability/materiality states.

Full `pnpm run verify` passes 43 test files / 334 tests, transport drift, formatting, all workspace type-checks, production builds, and the production dependency audit. Existing tooltip sourcemap and bundle-size advisories remain non-blocking. The verification proves repository compatibility only; it does not accept the proposed question semantics on Nick's behalf.
