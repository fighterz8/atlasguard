# MoveWise Phase 4D: proposed score rule 0.2.0 mechanics

## Status

Draft proposal for review. This document translates the accepted 24-fixture human calibration corpus into exact mechanics for the next score-rule design gate. It does not implement runtime rule `0.2.0`, change Wizard questions, expose new API behavior, push, merge, or deploy.

The accepted corpus is now machine-readable in `lib/decision-core/src/fixtures/deterministic-model-calibration-v1.ts`, verified by `lib/contracts/src/deterministic-model-calibration.ts`, and locked by `lib/decision-core/src/deterministic-model-calibration.test.ts`.

## Rule shape

Rule `0.2.0` should preserve the ADR-006 score contract and ADR-007 family-first deterministic architecture:

1. Applicability selects `family` or `individual` mode. Mode controls which question effects are eligible; it never grants automatic points.
2. Financial safety blockers run before contribution interpretation.
3. Accepted financial ranges rerun the full evaluator at endpoints. A blocker-crossing range is conditional, never averaged into favorability.
4. Contributions remain non-duplicative: exact finances own income, housing, recurring costs, childcare costs, and retained-property net; household fit does not score the same dollars again.
5. Essential requirements run after safety blockers and before favorable final conditions. Unresolved essentials create `Promising if...`; explicitly unmet essentials cap favorability.
6. Explanation comes from the verified evaluation: condition, fit band, range/stability, strongest lift, strongest tradeoff, active blocker or cap, unavailable/excluded dimensions, and closest decision-changing condition.

## Proposed condition ladder

| Condition                                      | Rule intent                                                                                                                            |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `High financial risk under these assumptions`  | Any active severe financial blocker prevents a favorable condition, even when lifestyle signals improve.                               |
| `No clear advantage yet`                       | Result is neutral, mixed, materially fragile, deteriorating, or capped by an explicitly unmet essential.                               |
| `Promising if...`                              | The move could become favorable only if an unresolved essential or blocker-crossing accepted range is confirmed.                       |
| `Worth a closer look`                          | There is a supported net improvement, but not enough for the strongest favorable condition or there are modest non-blocking tradeoffs. |
| `Likely a better move under these assumptions` | Strong confirmed gains with no active blocker, no unresolved/unmet essential, and no material unexplained deterioration.               |

## Proposed mechanics

### Financial Security

- Keep negative destination cushion as an exact hard blocker beginning below `$0/month`.
- Keep destination housing burden as an exact hard blocker beginning at `50%` of gross income.
- Add a low-cushion caution zone below the hard blocker. Initial proposal: destination cushion above `$0/month` but below the greater of `$500/month` or `10%` of take-home income cannot produce the strongest favorable condition.
- Add a pre-blocker housing caution zone. Initial proposal: destination housing burden at or above `45%` and below `50%` cannot trigger the hard cap, but must show a visible caution and prevents the strongest favorable condition unless other facts are exceptionally strong and Nick accepts that later.
- Treat childcare and other recurring household costs as exact financial inputs only. Do not add a second household penalty for the same cost increase.

### Household Fit

- Add only user-supplied continuity facts at first: required space, nearby support, childcare continuity, school continuity, therapy/special-service continuity, and car-free routine viability.
- Each fact has importance `essential`, `important`, or `not_applicable`.
- `essential + confirmed` may contribute to Household Fit when it reflects a real destination improvement.
- `essential + unresolved` produces `Promising if...` and prevents a favorable result until user confirmation.
- `essential + explicitly_unmet` produces `No clear advantage yet` or worse and caps favorability.
- `important` facts can create lift or tradeoff but cannot hard-block favorability on their own.

### Opportunity Context

- Begin with user-confirmed facts only: confirmed job, confirmed remote-work continuity, confirmed partner employment, or unconfirmed partner employment range.
- Confirmed opportunity may contribute when it changes exact finances or continuity; salary alone is never enough if lived monthly cushion worsens.
- Unconfirmed partner employment that crosses a financial blocker remains conditional and reports both endpoints.
- Do not add metro-level opportunity scores until a separate source and geography contract exists.

### Daily-Life Fit

- Keep existing commute and climate ownership.
- Excluded priorities contribute zero and remain visible as excluded.
- Missing priorities contribute zero and remain visible as unavailable.
- Do not redistribute unused budget.

## Fixture implications

- `F03` and `I01` are the initial top-condition calibration anchors.
- `F01`, `F06`, `I04`, `B02`, and `B03` require exact financial blocker behavior plus visible final-review risk.
- `F02` and `F07` require caution behavior below hard-blocker boundaries.
- `F04`, `F09`, and `I06` require conditional handling for unresolved essentials; user confirmation is sufficient for `F09` and `I06`.
- `F05` and `B05` require full endpoint reevaluation for blocker-crossing ranges.
- `F08` prevents childcare double-counting.
- `F10` proves Household Fit can outweigh a modest non-blocking financial loss without reaching the top condition.
- `F11` proves an explicitly unmet essential caps favorability.
- `F12` and `B06` require directional recomputation, not score reversal.
- `B01` and `B04` preserve neutral baseline, missingness, exclusion, and unused budget behavior.

## Review gates before implementation

- Nick accepts or edits the caution-zone thresholds.
- Runtime `0.2.0` tests instantiate each accepted fixture against the evaluator and assert condition, band, blockers/caps, conditional state, and explanation signals.
- Existing `0.1.0` behavior remains available for comparison until `0.2.0` is implemented and explicitly selected.
- Browser comprehension checks prove that users can distinguish hard blockers, caution zones, unresolved essentials, and confirmed favorable results.
