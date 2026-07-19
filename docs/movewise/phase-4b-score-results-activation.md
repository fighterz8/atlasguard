# MoveWise Phase 4B: comprehension-safe score Results activation

## Status

Implemented and verified in the default-off research Results experience on 2026-07-19. Exact human-review preview is ready; broader/public activation remains prohibited until the comprehension review is accepted.

## Purpose

Phase 4A proved that MoveWise Score rule `0.1.0` is deterministic and falsifiable. It did not prove that a person would interpret the number correctly. This slice introduces the verified score inside the research-only editorial Results report without changing the formula, Decision Profile, benchmark evidence, transport contract, or runtime gate.

The presentation must answer five questions before the number can influence a decision:

1. What is this score relative to?
2. How much can accepted estimates change it?
3. Which exact financial result, evidence strength, or blocker constrains it?
4. What supported signal moves it most, and what is not scored yet?
5. Which exact assumption is closest to changing the canonical Decision Profile?

## Presentation contract

The Results model calls `evaluateMoveWiseAnalysis` on the same immutable research evaluation already used by the report. UI code does not reproduce score arithmetic or select its own insights.

The opening score view exposes:

- the integer value, 1–100 band, and optional estimate-sensitivity range;
- the origin-relative baseline: 50 means roughly even with the origin for the current inputs; and
- an explicit boundary: the number is not a probability, universal city grade, city ranking, or instruction to move.

The explanation immediately below keeps the score beside:

- exact monthly cushion difference;
- separate evidence-confidence language;
- the strictest registered blocker and score cap when active;
- strongest supported improvement and tradeoff with their canonical point contributions;
- every unavailable score component, with no silent weight redistribution;
- the nearest exact condition-changing financial threshold; and
- the rule version plus deduplicated evidence and input references in a collapsed disclosure.

The Decision Profile remains the source of truth. Its condition stays the page `h1`; MoveWise Score is a secondary `h2` summary, followed by the existing side-by-side finances, reasoning, What-if tool, and evidence.

## Comprehension safeguards

- `range` is described as estimate sensitivity, never a confidence or probability interval.
- Confirmed inputs and ranges that do not move the point score display no fabricated score range.
- Evidence confidence stays separate from the number and range.
- A registered severe financial blocker is shown as an explicit cap rather than allowing a favorable-looking number to imply safety.
- Opportunity Context and Household Fit remain visibly not scored under rule `0.1.0`; Daily-life Fit is also unavailable when all of its metrics are excluded.
- Exact finances and threshold operators use formatted canonical cents rather than reconstructed floating-point values.
- Calculation references start collapsed so auditability does not displace the decision hierarchy.

## Verification

RED/GREEN model and server-rendered component tests cover relative meaning, no-range behavior, unavailable components, blocker-cap copy, exact threshold presentation, rule/evidence references, the single page `h1`, and the non-probability boundary. Focused verification passes 17 tests plus the AtlasGuard frontend type-check and research-enabled production build.

Real system-Chrome checks passed locally and against the exact preview at 1440, 1024, 768, 390, and 320 CSS pixels:

- canonical direct Results score `52`, range `22–82`, and filled-Wizard score `61` bind to their separate verified evaluations;
- one `h1`, no skipped heading levels, and visible controls/disclosures at least 44 pixels high;
- relative baseline, interpretation boundary, sensitivity, exact finance, evidence confidence, unavailable dimensions, threshold, and calculation references are visible and inspectable;
- zero horizontal overflow, console warnings/errors, page errors, `/api/` requests, local-storage writes, or session-storage writes; and
- desktop and mobile captures preserve the editorial report hierarchy without adding a card grid.

Exact preview deployment `dpl_2X5AWAe62Cq5eQtGka485EcMjyuk` is READY at:

`https://movewise-m2bykczoh-fighterz8s-projects.vercel.app/research/wizard`

The preview was built from clean commit `3f611c60945ccf6c5eb47b65cabffb7d3d37a1a5` with the existing research-only Vite gate enabled.

## Deliberate exclusions and remaining gate

This slice does not change score rule `0.1.0`, add household or opportunity metrics, add adaptive questions, persist analyses, add a fifth metro, expose score through the research API, enable a production route, call a provider, push, merge, or deploy production.

Human review must still confirm that the opening score is understood as relative to the origin and current assumptions rather than as scientific certainty or a generic city ranking. Any formula or contribution change requires a new score rule version and recalibration; copy/layout corrections can remain within this presentation slice.
