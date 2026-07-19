# MoveWise Product Contract 2.0

## Problem Statement

How might MoveWise use a manageable set of personal answers plus trustworthy metro data to show whether a destination is likely to provide a better quality of life than the user's current city, without turning the result into a universal city ranking or making the user build the analysis manually?

## Recommended Direction

Build MoveWise as a personalized comparative decision report for an individual, couple, or family considering a known destination. The primary user has some concrete information, such as a job offer or destination income, but the product also supports earlier-stage users through clearly labeled metro estimates that they may accept, revise, or replace.

The headline is one deterministic 1–100 `MoveWiseScore` centered on the user's current situation: 50 means broadly equivalent, lower means a worse fit, and higher means a better fit. The score is never a probability or an absolute grade for a city. It is accompanied by a component breakdown, financial guardrails, an uncertainty range when estimates matter, evidence confidence, and the assumptions most capable of changing the result.

The experience uses adaptive questions, reusable independent metro profiles, an editorial Results report, and explicit lightweight save/reopen. It asks as many questions as create decision value, but no question is allowed to exist merely because data can be collected.

## Key Assumptions to Validate

- [ ] People understand 50 as an origin-relative baseline rather than a generic city grade; test the score language and bands in task-based sessions before beta.
- [ ] Benchmark-assisted estimates reduce abandonment without being mistaken for personal facts; test acceptance, override, and provenance comprehension.
- [ ] Users can identify the strongest improvement, strongest tradeoff, and most decision-changing assumption from the editorial report without coaching.
- [ ] Austin and San Diego can meet the same geography, provenance, transformation, freshness, and uncertainty gates as Los Angeles and Seattle.
- [ ] A private expiring link is sufficient for initial save/reopen demand without accounts, email lookup, or a scenario dashboard.

## MVP Scope

- Individual, couple, and family household modes.
- A known origin and destination, with concrete-offer users as the primary path and benchmark-assisted estimates as a secondary path.
- Numeric financial inputs plus adaptive choice-based questions for household situation, work, housing, mobility, climate, and supported priorities.
- One origin-relative 1–100 MoveWise Score with visible components, band, confidence, uncertainty, blockers, and exact decision-changing thresholds.
- Independent versioned metro profiles and generated comparisons.
- Los Angeles, Seattle, Austin, and San Diego as the first required metro cohort; expansion to 8–12 metros only through the same promotion gates.
- An editorial Results report using comparison tables, ranked rows, restrained charts, and evidence disclosures instead of a card-dominant dashboard.
- Explicit no-account save/reopen through private opaque links with expiry and deletion.
- Complete deterministic operation without AI, persistence, or request-time truth calls.

## Not Doing (and Why)

- **Universal city grades or "best places" rankings** — the score belongs to one user and one origin-to-destination decision.
- **Unlimited metro breadth before repeatable promotion** — a long dropdown is not useful if evidence quality varies silently.
- **Generic school, safety, or family-friendly scores** — those claims are often hyperlocal, normative, or poorly aligned with metro geography.
- **Silent financial or household inference** — benchmark assistance is visible, optional, and replaceable.
- **Accounts, email lookup, or public scenario browsing** — private expiring links are enough to test initial save/reopen value.
- **A card for every result** — the product should read like a considered decision report, not a generated component gallery.
- **AI-generated scoring, facts, or conclusions** — deterministic contracts and verified evidence own truth.
- **Scenario sharing, comparison dashboards, neighborhood analysis, property search, or relocation services** — these do not test the first product promise.

## Open Questions

- Which additional nationally consistent dimensions can produce useful metro-level insight without double-counting finances or implying neighborhood precision?
- What score contribution limits and blocker caps remain understandable after calibration fixtures and task-based user testing?
- Which 4–8 metros should follow the required first cohort based on relocation relevance and complete evidence coverage?
- Should a reopened analysis offer a separately labeled recomputation against newer snapshots, or preserve only the original result until the user explicitly duplicates it?
