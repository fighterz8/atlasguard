# MoveWise Current-First Destination Plan

## Problem Statement

How might MoveWise let a family describe its current financial reality and concrete needs, then do the destination comparison itself without fabricating unsupported estimates or asking the family to score the destination in advance?

## Recommended Direction

Make the Wizard current-first. Step 2 collects the household's current take-home income, housing cost, and recurring expenses. Destination amounts are not required. MoveWise builds a destination research plan from the selected metro and the household plan, labels every value by provenance, and asks for confirmation only where evidence cannot support a personal estimate.

Users who already have an offer, lease quote, childcare quote, or other destination figures can open an optional override section. A complete override set continues through the accepted deterministic `0.2.0` result. Without those overrides, MoveWise produces a preliminary destination research plan rather than inventing a score from copied current values.

Step 4 becomes **Your household plan**. It asks domain-specific questions using formats suited to housing, childcare, and schools. Internal states such as `essential_unconfirmed` remain derived engine inputs and are never presented as user-facing categories.

## Key Assumptions to Validate

- [ ] Families prefer entering current facts once and reviewing MoveWise estimates over researching and typing both sides of the comparison.
- [ ] A preliminary research plan is more trustworthy and useful than a numeric result built from unsupported destination placeholders.
- [ ] Housing tenure, home type, bedrooms, budget, childcare arrangement, and school requirements are enough to select the first evidence modules without making the Wizard arduous.
- [ ] One plain-language “would this stop the move?” control captures essentiality more naturally than several essential-status options.

## MVP Scope

- Require current take-home income, current housing cost, and current recurring expenses.
- Make destination financial overrides optional and visually secondary.
- Preserve the full deterministic result when complete overrides are supplied.
- Otherwise produce a source-aware destination research plan with `MoveWise calculated`, `You told us`, and `Needs confirmation` states.
- Replace the household role/impact matrix with concrete housing, childcare, school, and bounded other-needs questions.
- Derive unconfirmed internal factor states without assigning favorable or unfavorable household impacts.

## Not Doing (and Why)

- **Copying current income into the destination** — ignores pay and tax changes and creates false confidence.
- **Treating metro median rent as the user's expected housing cost** — it is context, not a bedroom/home-type match.
- **Scoring new housing, childcare, or school answers through rule `0.2.0`** — evidence-derived semantics require later `0.3.0` calibration.
- **Live listings, universal school grades, or complete job-market coverage** — broader and less defensible than the first bounded evidence modules.
- **A generic form-builder abstraction** — each domain needs its own clear question format.

## Open Questions

- Which source can support bedroom- and tenure-specific housing estimates across the initial four metros?
- What minimum employment information is needed for a defensible destination take-home range?
- Which childcare datasets can separate cost, licensed supply, and quality without overstating waitlist availability?
- What address or district specificity is required before school-path findings can move beyond `Needs confirmation`?
