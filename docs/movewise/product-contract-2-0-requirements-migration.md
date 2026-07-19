# MoveWise Product Contract 2.0 Requirements Migration

**Change ID:** `MW-CHG-002`

**Status:** Approved

**Decision date:** 2026-07-18

**Approver:** Nick, project owner

**Applies to:** MoveWise implementation after Product Contract 2.0

## 1. Purpose and authority

This record amends `MW-CHG-001` after direct product review showed that the deterministic research flow requires too much manual synthesis, provides too little personalized insight, supports too few metros, lacks save/reopen, and presents Results with an overly card-heavy visual language.

Where this record conflicts with `MW-CHG-001`, ADR-001, or fixed-step UI assumptions, this approved overlay and ADR-006 take precedence. The verified Decision Profile, deterministic engine, evidence contracts, confidence/stability separation, exact thresholds, privacy rules, and optional-AI boundary remain active unless explicitly amended below.

The implementation authority is:

1. Product Contract 2.0;
2. ADR-006 and retained portions of ADR-001 through ADR-005;
3. this requirements overlay;
4. `MW-CHG-001` for requirements not replaced here;
5. historical AtlasGuard documents only where none of the accepted MoveWise records conflict.

## 2. Approved behavioral and scope changes

### Behavioral

- Add one personalized, deterministic, origin-relative 1–100 MoveWise Score as the headline summary of the verified Decision Profile.
- Use 50 as the origin-relative neutral baseline and expose named comparison bands.
- Keep score range, Evidence Confidence, Decision Stability, financial blockers, and exact thresholds separate from the headline value.
- Replace the fixed four-step requirement with adaptive experience stages and in-context assumption confirmation.
- Allow explicitly accepted benchmark estimates to support earlier-stage users without silently converting regional data into personal facts.
- Replace a card-dominant Results grid with an editorial report hierarchy.
- Reopen a saved analysis against its original bound versions before offering any explicit recomputation.

### Scope

- Expand the primary user from a worker with a concrete move to individuals, couples, and families evaluating a known destination, while retaining concrete-information users as the primary path.
- Require independent metro profiles and generated comparisons instead of authored directed pairs.
- Require Los Angeles, Seattle, Austin, and San Diego as the first promoted cohort, then expand to 8–12 metros through identical gates.
- Prioritize lightweight no-account save/reopen after the new canonical contracts are implemented and tested.
- Continue excluding universal rankings, neighborhood claims, generic family/school/safety scores, accounts, public scenario browsing, and mandatory AI.

## 3. Replacement requirements

These `MW2-*` IDs are the active traceability anchors for Product Contract 2.0. Existing `MW-*` requirements remain active unless the disposition table marks them replaced or amended.

### 3.1 Adaptive flow (`MW2-UI`)

- **MW2-UI-01:** Support adaptive Move, Household, Situation, Money, Priorities, and Confirm/Refine stages. The interface may combine or split stages and does not require a standalone review page.
- **MW2-UI-02:** Every question has a stable versioned ID, applicability rule, answer schema, required/optional status, “not sure” behavior, and explicit affected input, score component, confidence/range rule, or rendered insight. Questions with no declared effect are prohibited.
- **MW2-UI-03:** Keep personal financial facts numeric. Use accessible choice-based questions for household, work, housing, mobility, climate, and supported priorities when exact numeric input is not required.
- **MW2-UI-04:** Offer “Estimate for me” only when a promoted benchmark and interpretation contract exist. Show source, geography, period, uncertainty, and estimate status before acceptance; let the user replace the value.
- **MW2-UI-05:** Produce an initial result once every required value is user-supplied or explicitly accepted as an estimate. Optional refinement follows the initial value path unless a demonstrated safety requirement blocks calculation.
- **MW2-UI-06:** Support individual, couple, and family modes without deriving a generic family-friendly score from household mode alone.

### 3.2 MoveWise Score (`MW2-SCR`)

- **MW2-SCR-01:** Emit exactly one integer `MoveWiseScore.value` from 1 through 100, with baseline 50 and bands `worse_fit` (1–39), `mixed_or_similar` (40–59), `better_fit` (60–79), and `substantially_better_fit` (80–100).
- **MW2-SCR-02:** Bind the score to the accepted input fingerprint, origin/destination profile versions, benchmark bundle, transformations, decision rules, and score version. Identical bound inputs produce byte-stable score content.
- **MW2-SCR-03:** Derive the score only from registered Financial Security, Daily-life Fit, Opportunity Context, and Household Fit contributions. Every metric has one owning component; Financial Security is mandatory and retains a non-zero minimum contribution budget.
- **MW2-SCR-04:** Preserve exact financial arithmetic and registered blockers. A negative destination monthly cushion prevents a favorable score band. Every additional blocker cap is versioned, visible, and boundary-tested.
- **MW2-SCR-05:** Do not silently redistribute unavailable weight. Missing evidence creates no invented gain/loss and reduces completeness/confidence as registered policy requires.
- **MW2-SCR-06:** Emit a score range when accepted estimates or plausible ranges can materially change the value. The range is deterministic sensitivity, not a probability interval.
- **MW2-SCR-07:** Keep Evidence Confidence and Decision Stability independent from the score. Neither may be inferred from score favorability.
- **MW2-SCR-08:** Preserve monotonicity: higher destination income cannot worsen the score, and higher destination housing or recurring expenses cannot improve it, with all other inputs fixed.
- **MW2-SCR-09:** Do not activate the runtime score until the formula passes all Product Contract 2.0 calibration, boundary, blocker, missingness, reversed-comparison, determinism, and comprehension gates.

### 3.3 Metro profiles (`MW2-BEN`)

- **MW2-BEN-01:** Store and promote independent immutable metro profiles; generate an origin-to-destination comparison from two active profiles instead of authoring pair-specific truth.
- **MW2-BEN-02:** Preserve selected city/state, CBSA identity/delineation, actual metric geography, dates, uncertainty/coverage, source/terms, transformation/materiality versions, freshness/missingness, checksum, and promotion status per profile.
- **MW2-BEN-03:** Any two different active metros may be compared when both profiles satisfy required critical-metric coverage. Reverse comparisons are generated independently from the same profiles.
- **MW2-BEN-04:** Promote Los Angeles, Seattle, Austin, and San Diego as the first required cohort. Preserve verified Los Angeles/Seattle evidence during migration.
- **MW2-BEN-05:** Expand to 8–12 metros based on major-market relevance and complete comparable evidence. Dropdown breadth never overrides promotion quality.
- **MW2-BEN-06:** A metro-level record is never presented as a neighborhood, property, route, school, safety, or universal family outcome.

### 3.4 Lightweight save/reopen (`MW2-SAV`)

- **MW2-SAV-01:** Saving is an explicit post-result action; evaluation and browser editing do not implicitly create a server record.
- **MW2-SAV-02:** Use no account or email. Access uses a private opaque token with at least 128 bits of entropy; only its hash is stored server-side.
- **MW2-SAV-03:** Apply a 30-day default expiry, explicit deletion/revocation, `noindex`, non-enumerable access, and no public/global saved-analysis list.
- **MW2-SAV-04:** Store only the minimized accepted canonical input, estimate provenance, verified result, and exact schema, score, benchmark, transformation, and decision-rule versions needed for reproduction.
- **MW2-SAV-05:** Reopening reproduces the original saved result. Recomputing against newer data is a later explicit action and never silently overwrites the saved record.
- **MW2-SAV-06:** Transaction failure cannot leave a misleading partial record. Save failure does not remove or downgrade a completed local result.
- **MW2-SAV-07:** Operational logs never contain access tokens, full financial payloads, rejected values, or a public identifier that enables enumeration.

### 3.5 Editorial Results (`MW2-RES`)

- **MW2-RES-01:** Render Conclusion, At a glance, What improves/gets harder, Financial reality, Priority fit, What could change the result, Evidence/method, and Save in that semantic hierarchy.
- **MW2-RES-02:** The conclusion includes route, score, band, range when present, one-sentence relative reading, Evidence Confidence, and any active financial blocker.
- **MW2-RES-03:** Prefer typography, comparison tables, ranked rows, whitespace, and restrained visualizations. Reserve bordered cards for alerts, interactive controls, or genuinely self-contained callouts.
- **MW2-RES-04:** Do not expose implementation-model or AI language in the normal product surface. The user sees evidence, assumptions, and outcomes in relocation-decision language.
- **MW2-RES-05:** Preserve exact thresholds, provenance, source geography/dates, uncertainty, missingness, limitations, keyboard behavior, non-color communication, reduced motion, reflow, touch targets, and screen-reader structure.

### 3.6 Non-functional gates (`MW2-NFR`)

- **MW2-NFR-01:** Trace every score value, component, blocker, band, range endpoint, and rendered material claim to accepted inputs or stable evidence IDs.
- **MW2-NFR-02:** Add unit, property/invariant, calibration-boundary, data-contract, golden, API, persistence, privacy/security, browser, accessibility, performance, and task-comprehension coverage before beta.
- **MW2-NFR-03:** A prepared user can identify the score meaning, strongest improvement, strongest tradeoff, and most decision-changing assumption without coaching.
- **MW2-NFR-04:** Test that users do not interpret the score as probability, percentile, universal city grade, or directive before public activation.

## 4. Disposition of affected MW-CHG-001 requirements

| Existing requirement | Disposition           | Product Contract 2.0 replacement or clarification                                                              |
| -------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------- |
| MW-UI-01             | Replaced              | MW2-UI-01 removes the fixed four-step requirement.                                                             |
| MW-UI-02–03          | Retained              | Supported locations and runtime validation remain required.                                                    |
| MW-UI-04             | Amended               | MW2-UI-03–05 add adaptive benchmark assistance and in-context confirmation.                                    |
| MW-UI-05             | Retained              | Only supported evidence/transforms may affect results; weight zero remains valid.                              |
| MW-UI-06             | Replaced              | MW2-UI-01, MW2-UI-04, and MW2-UI-05 replace a mandatory standalone review step.                                |
| MW-UI-07–09          | Retained and expanded | MW2-RES defines the new headline and report hierarchy.                                                         |
| MW-DEC-01–02         | Retained and expanded | The verified Decision Profile remains canonical; MW2-SCR adds a bound deterministic summary.                   |
| MW-DEC-03            | Retained              | Financial Position still does not emit a separate 0–100 Financial Fit score.                                   |
| MW-DEC-04–12         | Retained              | Arithmetic, transformations, conditions, confidence, stability, evidence, versions, and purity remain binding. |
| MW-RES-01            | Replaced              | MW2-RES-01 defines the editorial hierarchy.                                                                    |
| MW-RES-02–05         | Retained              | Result modes and deterministic fallback semantics remain unchanged.                                            |
| MW-SAV-01–05         | Replaced and expanded | MW2-SAV-01–07 define lightweight no-account persistence and original-version reopen behavior.                  |
| MW-BEN-01–09         | Retained and expanded | MW2-BEN adds independent profiles, generated comparisons, and the required first cohort.                       |
| MW-NFR-\*            | Retained and expanded | MW2-NFR adds score traceability and comprehension gates.                                                       |

## 5. Regression migration

The legacy “no composite score” gate is replaced by a narrower prohibition: no uncalibrated, absolute, probabilistic, universal, or AI-generated city/move score.

New required score gates include:

- values and transitions at 1, 39, 40, 49, 50, 59, 60, 79, 80, and 100;
- every financial blocker cap and precedence conflict;
- identical-input/version determinism;
- reversed origin/destination and same-metro boundaries;
- confirmed-versus-estimated score ranges;
- no silent weight redistribution or metric double-counting;
- income/housing/expense monotonicity;
- missing/stale/geography-mismatched evidence;
- user comprehension of relative, non-probabilistic semantics.

Existing Decision Profile, benchmark checksum, evidence mutation, exact sensitivity, generated transport drift, API, browser, accessibility, and privacy gates remain required.

## 6. Implementation gate and sequencing

This approval freezes direction; it does not activate a numeric formula, new metro, UI, endpoint, or persistence.

Implementation sequence:

1. Product Contract 2.0 decision and requirements freeze.
2. Independent metro-profile architecture plus verified Austin/San Diego evidence.
3. Additive MoveWise Score contract, formula calibration, and verification.
4. Adaptive questions and benchmark-assisted estimate flow.
5. Editorial Results redesign.
6. Replacement persistence schema and default-off lightweight save/reopen.
7. Gated expansion toward 8–12 metros.

Each step is independently verified and committed. The verified Los Angeles→Seattle research path stays intact until its replacement passes equivalent or stronger gates.

## 7. Linked records

- [Product Contract 2.0](./product-contract-2-0.md)
- [Product Contract 2.0 one-pager](../ideas/movewise-product-contract-2-0.md)
- [ADR-001: Replace the three-score MVP with a Decision Profile](../decisions/ADR-001-decision-profile.md)
- [ADR-006: Add a relative MoveWise quality-of-life score](../decisions/ADR-006-relative-movewise-quality-score.md)
- [MW-CHG-001 Type B/C migration](./type-b-c-approval-and-requirements-migration.md)
