# MoveWise Phase 4D: proposed score rule 0.2.0 mechanics

## Status

Accepted internal rule. This document translates the accepted 24-fixture human calibration corpus into exact mechanics for rule `0.2.0`. Nick accepted the contribution budgets, caps, and caution thresholds on 2026-07-19. Phase 4E exports the evaluator only through a typed, fail-closed selector; it is not selected by the Wizard, public API, preview, or production. Research Results still omit a version and therefore select live score rule `0.1.0`.

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

The candidate begins at 50, sums the available contributions below, clamps to 1–100, and then applies the strictest active cap. Excluded, unavailable, or uncollected metrics contribute zero and never redistribute their unused budget.

| Component / metric   |      Normal effect |      Strong effect | Component bound | Candidate status                           |
| -------------------- | -----------------: | -----------------: | --------------: | ------------------------------------------ |
| Financial Security   | materiality-scaled | materiality-scaled |             ±30 | Available when cushion delta is supplied   |
| Commute              |                 ±5 |                ±10 |             ±10 | Available, excluded, or unavailable        |
| Climate              |                 ±5 |                ±10 |             ±10 | Available, excluded, or unavailable        |
| Household continuity |                ±10 |                ±15 |             ±30 | Available when user-supplied signals exist |
| Opportunity Context  |                  0 |                  0 |               0 | Deliberately unavailable in this candidate |

Score bands remain `1–39` worse fit, `40–59` mixed or similar, `60–79` better fit, and `80–100` substantially better fit. Conditions are selected after caps: active financial blocker → high financial risk; blocker-crossing range or unresolved essential → promising if; unmet essential or caution → no clear advantage; otherwise 80+ → likely a better move, 60+ → worth a closer look, and lower values → no clear advantage.

Candidate caps are exact:

- negative destination cushion: `39`;
- destination housing burden at or above 50%: `59`;
- low-cushion or 45%–under-50% housing caution: `59`;
- unresolved or explicitly unmet essential: `59`;
- strong user-declared household/personal continuity loss: `59`, without mislabeling it as a financial blocker;
- blocker-crossing accepted range: point result capped at `59`, while both endpoint results remain visible.

### Financial Security

- Keep negative destination cushion as an exact hard blocker beginning below `$0/month`.
- Keep destination housing burden as an exact hard blocker beginning at `50%` of gross income.
- Add a low-cushion caution zone below the hard blocker. The normalized candidate receives an explicit threshold; fixtures use `$500/month`. A later ScenarioInput adapter should derive the proposed real threshold as the greater of `$500/month` or `10%` of destination take-home income, which remains a review item rather than hidden candidate inference.
- Add a pre-blocker housing caution zone. Initial proposal: destination housing burden at or above `45%` and below `50%` cannot trigger the hard blocker, but must show a visible caution and caps the candidate at a non-favorable result.
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
- Opportunity Context contributes zero in this candidate. Confirmed salary or job effects belong in exact finances; continuity may affect an essential branch. The same fact is never awarded a second opportunity score.
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
- The exact candidate resolves accepted flexible bands by returning worse fit for `F12` and `I02`; `I04` also returns worse fit under the negative-cushion cap. Their user-facing conditions remain no clear advantage or high financial risk as accepted.

## Gate status and remaining product activation

- Nick accepted the exact contribution budgets, caps, and caution-zone thresholds.
- All 18 decision scenarios and 6 invariant fixtures pass against the accepted evaluator, including boundaries, endpoint reruns, determinism, direction, same-metro rejection, monotonicity, missingness/exclusion, and both essential-requirement branches.
- Phase 4E adds explicit internal rule selection while keeping omitted-version Results behavior on `0.1.0`.
- Wizard questions must declare their normalized effect and avoid double-counting financial facts before they can feed this candidate.
- Browser comprehension checks must prove that users distinguish hard blockers, caution zones, unresolved essentials, strong tradeoffs, and confirmed favorable results.
