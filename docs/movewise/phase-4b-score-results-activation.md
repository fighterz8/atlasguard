# MoveWise Phase 4B: comprehension-safe score Results activation

## Status

Implemented and verified in the default-off research Results experience on 2026-07-19. Exact human-review preview is ready; broader/public activation remains prohibited until the comprehension review is accepted.

## Purpose

Phase 4A proved that MoveWise Score rule `0.1.0` is deterministic and falsifiable. It did not prove that a person would interpret the number correctly. This slice introduces the verified score inside the research-only editorial Results report without changing the formula, Decision Profile, benchmark evidence, transport contract, or runtime gate.

The presentation must answer four questions before the number can influence a decision:

1. What is this score relative to?
2. How much can accepted estimates change it?
3. Which exact financial result, evidence strength, or blocker constrains it?
4. What supported signal moves it most, and what is not scored yet?

## Presentation contract

The Results model calls `evaluateMoveWiseAnalysis` on the same immutable research evaluation already used by the report. UI code does not reproduce score arithmetic or select its own insights.

The opening score view exposes:

- the integer value, 1–100 band, and optional estimate-sensitivity range;
- the origin-relative baseline: 50 means roughly even with the origin for the current inputs; and
- an explicit boundary: the number is not a probability, universal city grade, city ranking, or instruction to move.

The explanation immediately below keeps the score beside:

- exact monthly cushion difference;
- the strongest supported score effect;
- the closest condition-changing assumption with its named monthly input, current value, exact threshold, distance from current, and resulting Decision Profile;
- the strictest registered blocker and score cap when active;
- every unavailable score component, with no silent weight redistribution;
- the rule version plus deduplicated evidence and input references in a collapsed disclosure.

Evidence confidence and estimate sensitivity remain visible in the opening report summary without consuming the three primary explanation slots. The full threshold list remains in the lower What-if tool, where every value is attached to a named editable monthly input; the explanation promotes only the closest decision change with enough context to interpret it.

The Decision Profile remains the source of truth. Its condition stays the page `h1`; MoveWise Score is a secondary `h2` summary, followed by the existing side-by-side finances, reasoning, What-if tool, and evidence.

## Comprehension safeguards

- `range` is described as estimate sensitivity, never a confidence or probability interval.
- Confirmed inputs and ranges that do not move the point score display no fabricated score range.
- Evidence confidence stays separate from the number and range.
- A registered severe financial blocker is shown as an explicit cap rather than allowing a favorable-looking number to imply safety.
- Opportunity Context and Household Fit remain visibly not scored under rule `0.1.0`; Daily-life Fit is also unavailable when all of its metrics are excluded.
- Exact finances and What-if threshold operators use formatted canonical cents rather than reconstructed floating-point values.
- The opening explanation does not surface a bare threshold amount without its monthly input context.
- Semantic colors always pair with text and icons: favorable/helps, risk/reduces, caution/needs attention, neutral/similar, and unavailable/not scored.
- Calculation references start collapsed so auditability does not displace the decision hierarchy.

## Human-review correction

The first review found that the San Diego-to-Austin opening summary could show wording such as `at least $8,100` under “Most decision-changing assumption” without making the unit or decision value clear. The bare presentation was removed while the breakpoint engine and What-if thresholds remained unchanged.

The second review clarified that the decision-changing assumption itself is important, but Estimate sensitivity and Evidence confidence were weak primary indicators when they collapsed into generic or unavailable readings. The explanation now prioritizes monthly cushion, strongest supported effect, and the closest decision change. A threshold reads as a named input with `/month`, current amount, monthly distance, and resulting profile. The same review added restrained semantic color across Wizard and Results, with words and icons preserving the meaning without color.

## Verification

RED/GREEN model, server-rendered component, and money-slider tests cover relative meaning, contextual thresholds, score drivers, semantic financial impact, unavailable components, blocker-cap copy, rule/evidence references, the single page `h1`, and the non-probability boundary. Focused verification passes 22 tests plus the AtlasGuard frontend type-check and research-enabled production build. Full repository verification passes 40 files / 316 tests.

Real system-Chrome checks passed locally and against the exact preview at 1440, 1024, 768, 390, and 320 CSS pixels:

- canonical direct Results and edited Wizard results bind to their separate verified evaluations;
- the San Diego-to-Austin Wizard result presents a named closest decision change with monthly threshold, current value, distance, and resulting condition;
- one `h1`, no skipped heading levels, and visible controls/disclosures at least 44 pixels high;
- relative baseline, interpretation boundary, sensitivity, exact finance, evidence, strongest effect, unavailable dimensions, and calculation references are visible and inspectable;
- exact decision-changing thresholds remain visible in the named-input What-if section while the closest threshold receives full context in the opening explanation;
- Wizard money changes show labeled helps/reduces-cushion tones, must-have priorities show caution, excluded choices show unavailable, and Results reuse the same semantic language;
- zero horizontal overflow, console warnings/errors, page errors, `/api/` requests, local-storage writes, or session-storage writes; and
- desktop and mobile captures preserve the editorial report hierarchy without adding a card grid.

Exact replacement preview deployment `dpl_BA1an8tAFwnRdofEwVmWHuoP7rxk` is READY at:

`https://movewise-5hvqv9exm-fighterz8s-projects.vercel.app/research/wizard`

The application source in the preview matches commit `d7b5d7ce006cbf87db2cfbdbac39212e87f9ee2b`, built with the existing research-only Vite gate enabled. The hosted suite passed all 169 browser checks across the five viewport sizes, the edited Wizard money/priority states, and the San Diego-to-Austin flow.

## Deliberate exclusions and remaining gate

This slice does not change score rule `0.1.0`, add household or opportunity metrics, add adaptive questions, persist analyses, add a fifth metro, expose score through the research API, enable a production route, call a provider, push, merge, or deploy production.

Human review must still confirm that the opening score is understood as relative to the origin and current assumptions rather than as scientific certainty or a generic city ranking. Any formula or contribution change requires a new score rule version and recalibration; copy/layout corrections can remain within this presentation slice.
