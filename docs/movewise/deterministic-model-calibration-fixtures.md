# MoveWise Deterministic Decision Model 1.0: calibration fixtures

## Status and review method

Human-reviewed synthetic corpus with all 24 fixture outcomes accepted. These scenarios do not contain real users or claim empirical truth. They define expected product behavior before score rule `0.2.0`, family questions, or new runtime logic are implemented.

For each fixture, reply with one of:

- `Accept <ID>` — provisional outcome and reasoning feel right.
- `Change <ID> to <condition/band>` — expected behavior differs.
- `Question <ID>: <note>` — facts are insufficient or the scenario needs revision.

Useful review dimensions:

1. **Condition:** Likely a better move / Worth a closer look / Promising if… / No clear advantage yet / High financial risk under these assumptions.
2. **Band:** Worse fit / Mixed or similar / Better fit / Substantially better fit.
3. **Override:** Should a financial or essential-requirement rule prevent a favorable result?
4. **Explanation:** What should be the strongest lift, tradeoff, and decision-changing condition?

The amounts below are monthly. “Cushion” means take-home income minus housing and recurring expenses plus retained-property net.

### Human judgment progress

Accepted on 2026-07-19: `F01`–`F12`, `I01`–`I06`, and `B01`–`B06`.

`F06` retains the exact 50% housing-burden blocker. Its activation must also produce a concise visible risk indicator in the final review explaining that the housing share reached the registered boundary; the score cap alone is insufficient explanation.

`F03` confirms that `Worth a closer look` is too weak for the strongest favorable case. The strongest condition is `Likely a better move`, accompanied by `under these assumptions` so it answers the user's primary question without claiming certainty. It applies consistently to every highest-band family or individual fixture.

`F05` proceeds as a conditional calculation using the accepted partner-income range. `F07` uses its exact input normally and shows a pre-blocker caution indicator; it does not require conditional evaluation. `F09` may treat explicit user confirmation of required-service continuity as sufficient without requiring third-party evidence.

`I06` accepts explicit user confirmation of car-free routine viability. Until confirmed, the result says `Promising if car-free access is confirmed`; if it is not confirmed, the move is not yet rated favorably.

Human fixture review is complete. Exact numeric mechanics remain a separate design and implementation gate.

## Family-first fixtures

| ID  | Scenario                                    | Material facts                                                                                                                                                                                  | Provisional expected behavior                                                                                                                                     | Primary calibration question                                                                           |
| --- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| F01 | Dream destination, insolvent budget         | Family of four. Destination cushion `-$300`; commute and climate improve; suitable housing and nearby relatives.                                                                                | **High financial risk under these assumptions; worse fit.** Negative cushion overrides every lifestyle gain.                                                      | Is the override appropriately strict and clearly explainable?                                          |
| F02 | Better daily life, fragile margin           | Family of three. Origin cushion `$1,200`; destination `$150`; housing burden 45%; commute improves materially; nearby support network.                                                          | **No clear advantage yet; mixed.** No hard blocker, but the remaining margin is too fragile for a favorable result.                                               | Do we need a versioned low-cushion caution rule below the negative-cushion blocker?                    |
| F03 | Broad family improvement                    | Family of four. Cushion improves `$500 → $2,500`; housing burden remains below 35%; commute improves; suitable space and support network are confirmed.                                         | **Likely a better move under these assumptions; substantially better fit.** Financial Security is the strongest lift.                                             | What evidence and explanation support the strongest favorable condition?                               |
| F04 | More money, lost informal childcare         | Family of three. Cushion improves `$700 → $1,800`; commute similar; weekly relative-provided childcare is lost and replacement care is unresolved; parent marks childcare continuity essential. | **Promising if childcare is resolved; not favorable yet.**                                                                                                        | Should an unresolved essential requirement create a conditional result or merely reduce Household Fit? |
| F05 | Partner employment determines viability     | Family of four. Destination cushion range is `-$600 → $1,600` depending on unconfirmed partner income; housing and commute improve.                                                             | **Promising if partner employment is confirmed; assumption-sensitive range crossing a financial blocker.** Calculate conditionally using both accepted endpoints. | How should the final review make the conditional branch unmistakable?                                  |
| F06 | Positive cash flow, extreme housing burden  | Family of four. Destination cushion `$800`; gross income `$7,000`; housing `$3,500` (50%); commute improves.                                                                                    | **High financial risk under these assumptions; no favorable band.** Housing-burden blocker overrides.                                                             | Is 50% the correct hard boundary for a family, or should household size affect it?                     |
| F07 | One dollar below the burden boundary        | Same as F06 except housing is `$3,499` against `$7,000` gross.                                                                                                                                  | **No hard housing blocker; likely mixed.** Calculate normally and show a visible pre-blocker housing-cost caution.                                                | What caution-zone boundary should be tested before implementation?                                     |
| F08 | Raise erased by childcare                   | Family of three. Take-home rises `$1,500`; childcare/recurring costs rise `$1,800`; destination cushion stays positive but falls `$300`; commute improves.                                      | **No clear advantage yet; mixed or worse fit.** Childcare belongs in exact finances, not a second household penalty.                                              | Does this avoid double-counting while explaining the real tradeoff?                                    |
| F09 | Required services unverified                | Family with a child who needs continuing therapy or special-education services. Finances and commute improve; destination service continuity is unverified and marked essential.                | **Promising if continuity is user-confirmed; not favorable yet.** No third-party evidence or generic city service score is required.                              | How should the Wizard make the responsibility of user confirmation clear?                              |
| F10 | Better household fit, modest financial loss | Family of five. Destination provides required space and nearby support; cushion declines `$200` but remains `$1,600`; commute worsens slightly.                                                 | **Worth a closer look; better fit, not substantially better.** Household Fit may outweigh a modest non-blocking financial loss.                                   | Is this too permissive given the financial and commute deterioration?                                  |
| F11 | Teen continuity conflict                    | Family with a graduating student. Cushion improves `$300`; employment is confirmed; a must-have school-continuity requirement is explicitly unmet.                                              | **No clear advantage yet; mixed.** An explicitly unmet essential requirement caps favorability.                                                                   | Should “must-have” cap the result, or should only financial rules hard-cap it?                         |
| F12 | Reverse of a strong family move             | Reverse F03: the prior destination becomes origin. Cushion falls `$2,500 → $500`; commute and support network worsen; cushion remains positive.                                                 | **No clear advantage yet or worse fit; never `100 - prior score` by shortcut.**                                                                                   | Does reversed evaluation recompute facts rather than reuse a city grade?                               |

## Individual fixtures

| ID  | Scenario                                   | Material facts                                                                                                                  | Provisional expected behavior                                                                                                          | Primary calibration question                                                         |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| I01 | Confirmed career and financial improvement | Individual with confirmed job. Cushion improves `$900 → $2,400`; commute shortens; preferred climate improves.                  | **Likely a better move under these assumptions; substantially better fit.**                                                            | Are strong confirmed gains sufficient for the highest band without household inputs? |
| I02 | Higher salary, worse lived finances        | Salary/take-home increases, but housing and recurring costs reduce cushion `$1,400 → $1,000`; commute worsens.                  | **No clear advantage yet; mixed or worse fit.**                                                                                        | Does the model resist treating salary alone as improvement?                          |
| I03 | Remote worker, materially unchanged        | Cushion unchanged; commute and climate are marked “does not matter”; no supported opportunity or household factors apply.       | **No clear advantage yet; score near 50 with visible unavailable components.**                                                         | Is an honest neutral result useful enough?                                           |
| I04 | Dream city, negative cushion by one dollar | Destination cushion is `-$1`; every selected daily-life priority improves.                                                      | **High financial risk under these assumptions; no favorable band.**                                                                    | Does the one-dollar boundary need a nearby caution zone while remaining exact?       |
| I05 | Career gain, support-network loss          | Confirmed job improves cushion `$800`; close support network is lost and marked important, not essential; commute is similar.   | **Meaningful tradeoff / no clear advantage yet.**                                                                                      | How should user-supplied personal support affect Individual Household Fit?           |
| I06 | Essential mobility unresolved              | Individual cannot drive and marks car-free access essential. Finances improve, but destination routine viability is unverified. | **Promising if car-free access is confirmed; if not confirmed, the move is not yet rated favorably.** User confirmation is sufficient. | Does the final review make both branches immediately understandable?                 |

## Technical and policy boundary fixtures

| ID  | Boundary                       | Paired cases                                                                                             | Required invariant                                                                                                                   |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| B01 | Neutral baseline               | All included origin and destination point facts match.                                                   | Score is exactly 50; condition is not falsely favorable; unavailable factors remain unavailable.                                     |
| B02 | Negative-cushion edge          | Destination cushion `$0` versus `-$1`.                                                                   | `$0` does not trigger the negative-cushion blocker; `-$1` does. Both receive nearby cautionary explanation where policy supports it. |
| B03 | Housing-burden edge            | 49.99% versus exactly 50%.                                                                               | The registered blocker begins at 50%; values below it do not silently trigger the cap.                                               |
| B04 | Missingness and exclusion      | One metric unavailable; one available metric explicitly weight zero.                                     | Neither contributes, neither reallocates its budget, and the UI distinguishes unavailable from intentionally excluded.               |
| B05 | Sensitivity crossing a blocker | Accepted financial range crosses from positive to negative destination cushion.                          | Range endpoints rerun the full evaluator; stability is assumption-sensitive; the blocker is not averaged away.                       |
| B06 | Determinism and direction      | Identical bound inputs evaluated twice; then origin and destination reversed; then same-metro attempted. | Identical evaluation is byte-stable; reverse recomputes directionally; same-metro fails closed.                                      |

## Coverage audit

This first corpus intentionally covers:

- 12 family scenarios, 6 individual scenarios, and 6 technical/policy boundaries;
- financial overrides, thin-margin cautions, contribution conflicts, unresolved and unmet essentials, missingness, exclusion, reversals, and exact boundaries;
- outcomes that should be favorable, unfavorable, mixed, conditional, or rejected;
- family facts that can initially be user-supplied without inventing school, safety, childcare, health-care, neighborhood, or universal city grades.

It does not yet calibrate exact numeric weights. The accepted corpus is now ready to become versioned machine-readable fixtures before exact rule `0.2.0` mechanics are approved or implemented.
