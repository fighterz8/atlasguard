# MoveWise Type B/C Approval and Requirements Migration

**Change ID:** MW-CHG-001

**Status:** Approved

**Decision date:** 2026-07-17

**Approver:** Nick (project owner)

**Approval basis:** Nick instructed the team to “Begin implementation” immediately after receiving the July 17 roadmap, which explicitly required approval of this Type B/C redesign before implementation.
**Applies to:** MoveWise MVP and all implementation after this date

## 1. Purpose and authority

This record makes the product-contract change explicit and prevents implementation from drifting between two incompatible designs.

The April AtlasGuard documents remain historical decision evidence. Where they conflict with this migration record or ADR-001 through ADR-005, the accepted MoveWise decisions take precedence. The existing files must not be silently edited to look as though the old design never existed.

This is an approved migration overlay, not a claim that every replacement specification is already implemented. Phase 0 is complete only when the new runtime schemas, decision table, boundary fixtures, generated contracts, and requirements-to-test mapping agree with this record.

## 2. Approved Type B and Type C changes

### Type B — behavioral

- Replace Lifestyle Fit, Financial Fit, and blended Move Score with a deterministic Decision Profile.
- Replace score-band verdicts and financial downgrade rules with a mutually exclusive and exhaustive Decision Condition table.
- Add independent Evidence Confidence and Decision Stability assessments.
- Replace index-based evidence references with stable evidence IDs or JSON Pointers.
- Make a complete deterministic result the normal provider-off path.
- Add `deterministic` to the result-mode enum while preserving verified, repaired, and fallback modes for optional AI.
- Separate protected evaluation traces from opt-in saved scenarios.
- Make Zod runtime schemas the canonical contract source and generate TypeScript/API artifacts.

### Type C — scope

- Make AI explanation optional instead of mandatory for every MVP result.
- Reduce the first release to supported, defensible comparison dimensions and roughly 8–12 curated metros.
- Remove generic Safety, School, Family Fit, Amenities, and scientific Move Score claims from MVP.
- Defer scenario saving until privacy, tokens, transactions, retention, and reproduction are tested.
- Defer AWS-specific infrastructure until the deterministic vertical slice works.
- Retire priority blend modes, nationwide coverage, request-time providers, and email-based scenario lookup from MVP.

## 3. Canonical MVP statement

MoveWise is a pre-commitment move validator for a person with a known U.S. origin and destination. It uses user-entered financial assumptions and versioned regional evidence to produce:

- a direct Financial Position comparison;
- priority-weighted origin-to-destination changes;
- one deterministic Decision Condition;
- an independent Evidence Confidence assessment;
- an independent Decision Stability assessment;
- exact decision-changing thresholds when a defensible breakpoint exists;
- visible evidence, geography, dates, assumptions, missingness, and limitations.

AI may optionally paraphrase deterministically selected facts. It never scores, chooses evidence, determines a condition, changes confidence/stability, or introduces outside facts.

## 4. Disposition legend

- **Retained:** the old requirement's intent remains binding, sometimes with clarified terminology.
- **Replaced:** the old requirement is retired and the listed `MW-*` requirement is authoritative.
- **Deferred:** valid later work, but not an exit gate for the deterministic MVP phase shown.
- **Removed:** intentionally outside the approved direction; reintroduction requires a new Type B/C decision.

## 5. Replacement requirement set

These IDs are the active traceability anchors until a fully versioned replacement for legacy Docs 01–06 is published.

### 5.1 User flow and results (`MW-UI`)

- **MW-UI-01:** Present a four-step flow: Your Move, Your Money, What Matters, Review Assumptions.
- **MW-UI-02:** Require supported origin and destination city/state selections and show the matched CBSA for each.
- **MW-UI-03:** Validate required values, units, ranges, and logical combinations at runtime and show field-level errors before evaluation.
- **MW-UI-04:** Collect current and target take-home income, optional gross income, housing, recurring expenses, and optional retained-property impact; label each value confirmed, user estimate, or benchmark default. A wage benchmark never becomes target income without explicit user adoption.
- **MW-UI-05:** Offer only priorities with implemented transformations and evidence. Weight 0 means “does not matter.” Missing evidence is visible and never causes silent weight redistribution.
- **MW-UI-06:** Show every input, default, benchmark geography, and observation year in a required review step before evaluation.
- **MW-UI-07:** Return and render a complete Decision Profile with AI disabled and persistence unavailable.
- **MW-UI-08:** Let users amend assumptions and recompute in memory without rebuilding the scenario.
- **MW-UI-09:** Surface condition, confidence, stability, top reasons for/against, material assumptions, exact thresholds, caveats, and evidence without relying on color alone.

### 5.2 Deterministic decision engine (`MW-DEC`)

- **MW-DEC-01:** Emit one schema-valid `DecisionProfile` per valid scenario containing Financial Position, Priority Changes, Decision Condition, Confidence Assessment, Stability Assessment, deterministic signals, and evidence/version references.
- **MW-DEC-02:** Identical inputs and snapshot/transformation versions produce byte-stable deterministic content apart from explicitly excluded run metadata.
- **MW-DEC-03:** Financial Position reports current and target monthly cushion, dollar and take-home-percentage change, housing burden when gross income is available, assumption status, and absolute risk/blocker flags. It does not emit a 0–100 Financial Fit score.
- **MW-DEC-04:** Cash flow uses take-home income. Housing burden uses gross income. Missing gross income omits or visibly estimates burden; it is never silently substituted.
- **MW-DEC-05:** Each Priority Change compares destination utility with origin utility from documented indicators and records raw evidence, transformation, delta, weight, contribution, classification, and availability.
- **MW-DEC-06:** Affordability is owned by Financial Position rather than counted again as lifestyle. Weight 0 excludes a priority. Missing data lowers completeness/confidence and is not imputed silently.
- **MW-DEC-07:** Emit exactly one condition from `worth_a_closer_look`, `promising_if`, `meaningful_tradeoff`, or `high_financial_risk_under_assumptions`, using an approved precedence table that covers blockers, missing critical evidence, material gains/losses, and boundary cases.
- **MW-DEC-08:** Derive Evidence Confidence as `high`, `moderate`, or `limited` from source age, geography match, uncertainty/coverage, and missing weighted evidence—not from whether the move looks favorable.
- **MW-DEC-09:** Report Decision Stability as `not_evaluated` until deterministic range reevaluation runs; then derive `stable` or `assumption_sensitive` and emit exact rent, income, expense, or priority breakpoints when a finite in-range solution exists.
- **MW-DEC-10:** Select drivers, tradeoffs, blockers, caveats, omitted dimensions, and next investigation steps deterministically. Every material claim carries a stable evidence ID.
- **MW-DEC-11:** Bind each profile to exact benchmark, geography, metric-transformation, and decision-rule versions.
- **MW-DEC-12:** The engine is pure TypeScript and does not depend on HTTP, a database, a browser, or an AI provider.

### 5.3 Optional explanation (`MW-EXP`)

- **MW-EXP-01:** The deterministic rendering is complete before any optional explanation request.
- **MW-EXP-02:** The provider receives only a minimized, identity-free projection of already-selected evidence.
- **MW-EXP-03:** The provider returns schema-constrained structured data before prose rendering.
- **MW-EXP-04:** Generated language may paraphrase but may not select facts, infer missing evidence, add numbers or local facts, change condition/confidence/stability, or give command-style life/financial/legal advice.
- **MW-EXP-05:** Every generated evidence-backed item resolves through a stable evidence ID or JSON Pointer.
- **MW-EXP-06:** Provider absence, timeout, invalid schema, verification failure, or repair failure returns a safe deterministic result.

### 5.4 Verifier and repair (`MW-VER`)

- **MW-VER-01:** Verify every optional generated explanation before display; raw generated language is never displayed.
- **MW-VER-02:** Run V-001 through V-010 in order over `unknown`, with V-001 schema failure short-circuiting subsequent checks.
- **MW-VER-03:** Adapt score/verdict fidelity checks to exact Decision Profile values, condition, confidence, stability, evidence references, assumptions, caveats, and deterministic selections.
- **MW-VER-04:** Return only PASS, PARTIAL, or FAIL using the legacy strict aggregation rule.
- **MW-VER-05:** Allow at most one repair using the original structured output and check-level failures; the repaired result must pass before display.
- **MW-VER-06:** Fall back deterministically after an unsuccessful repair or any unsafe provider path.
- **MW-VER-07:** Maintain a 30–40-scenario corpus with at least one seeded failure per V-001…V-010, mixed failures, at least 20 explicit grounding failures, and at least three cases each for climate behavior, condition/blocker behavior, and fallback.
- **MW-VER-08:** Final repaired or fallback outputs are 100% schema-valid; at least 85% of the explicit grounding-failure corpus is detected; at least 9 of 10 seeded contradictions are blocked or repaired.

### 5.5 Rendering and result modes (`MW-RES`)

- **MW-RES-01:** Render Summary, Money, Priorities, What-if, and Evidence views from canonical deterministic data.
- **MW-RES-02:** Use exactly `deterministic`, `explainer`, `repaired_explainer`, or `deterministic_fallback` across schemas, traces, persistence, telemetry, and UI.
- **MW-RES-03:** `deterministic` is a normal complete mode; `deterministic_fallback` means AI was attempted but no acceptable generated explanation survived.
- **MW-RES-04:** Fallback contains condition, confidence, stability, financial position, drivers, tradeoffs/blockers, assumptions, caveats, sensitivity thresholds, and a deterministic next investigation step.
- **MW-RES-05:** Do not expose raw structured/provider output to end users by default.

### 5.6 Saved scenarios (`MW-SAV`, deferred to the persistence phase)

- **MW-SAV-01:** Saving is an explicit opt-in action after a successful evaluation; evaluation never creates a saved scenario implicitly.
- **MW-SAV-02:** Use opaque tokens with at least 128 bits of entropy, a 30-day default expiry, revocation/deletion, and `noindex` result pages.
- **MW-SAV-03:** Save enough validated input, profile, and exact version metadata to reproduce the canonical result.
- **MW-SAV-04:** Email is not part of evaluation or lightweight saved-scenario access.
- **MW-SAV-05:** Save failure does not suppress an already-safe result; it returns a save warning and cannot leave a misleading partial scenario.

### 5.7 Traces and evaluation (`MW-TRC`)

- **MW-TRC-01:** Create a protected trace for every attempted evaluation; validation failures record error codes without rejected values.
- **MW-TRC-02:** A post-validation trace records minimized inputs, exact versions, Decision Profile, optional structured explanation, verifier result, repair output, final mode, timing, and safe failure metadata.
- **MW-TRC-03:** Keep protected traces separate from operational logs and opt-in saved scenarios; never expose a public trace-list endpoint.
- **MW-TRC-04:** Apply a 30-day default raw/minimized trace retention window with automated deletion and access controls.
- **MW-TRC-05:** Redact operational logs; they contain no email, full financial payload, prompt, or unredacted model output.
- **MW-TRC-06:** A trace-store failure may not make a safe deterministic result unsafe; disable save for the run and emit a redacted operational alert.
- **MW-TRC-07:** Preserve the corpus and verifier thresholds in MW-VER-07 and MW-VER-08 as required optional-AI release gates.

### 5.8 Benchmark data (`MW-BEN`)

- **MW-BEN-01:** Curate benchmarks ahead of evaluation; make no request-time truth calls.
- **MW-BEN-02:** Use CBSA as the canonical regional unit while preserving exact selected city/state and actual source geography.
- **MW-BEN-03:** Start with roughly 8–12 supported metros; inactive records remain non-selectable.
- **MW-BEN-04:** Maintain a source/metric registry containing definition, source/terms URLs, period/dates, geography, units, uncertainty/coverage, transformation, materiality, freshness, missingness, and attribution.
- **MW-BEN-05:** Promote immutable versioned snapshots only after schema, geography, range, missingness, date, checksum, and data-quality checks pass.
- **MW-BEN-06:** Bind each result to snapshot and transformation versions so it can be reproduced after refreshes.
- **MW-BEN-07:** Show stale, missing, and geography-mismatched evidence and reduce confidence when policy requires it.
- **MW-BEN-08:** Never present a metro statistic as a neighborhood, property, route, or individual outcome.
- **MW-BEN-09:** Recompute the canonical snapshot SHA-256 before promotion; reject schema-valid content whose declared checksum is stale and expose only an immutable verified snapshot to the decision engine.

### 5.9 Non-functional requirements (`MW-NFR`)

- **MW-NFR-COR-01:** Deterministic calculations, condition selection, confidence, stability, and evidence selection are reproducible and fixture-tested.
- **MW-NFR-COR-02:** Trust a result only after semantic bundle verification binds the canonical input fingerprint, promoted benchmark checksum, transformed utilities, financial values/ranges, priorities, condition, confidence, and evidence references.
- **MW-NFR-MOD-01:** Contracts, snapshots, pure engine, renderer, optional provider, verifier, persistence, HTTP, and UI remain separate modules inside one TypeScript monolith.
- **MW-NFR-TEST-01:** Unit, property/invariant, data-contract, golden, API, integration, verifier, browser, accessibility, performance, and privacy/security layers have explicit traceability.
- **MW-NFR-AVAIL-01:** The complete product flow works without AI and without persistence; optional-provider failure degrades safely.
- **MW-NFR-UX-01:** A prepared user can identify the strongest reason for, strongest reason against, and main decision-changing assumption without coaching.
- **MW-NFR-A11Y-01:** Target WCAG 2.2 AA and verify the critical flow with automation plus keyboard, screen reader, 200–400% zoom/reflow, focus/error, non-color, reduced-motion, and touch-target checks.
- **MW-NFR-PERF-01:** Use a provider-off deployed target of deterministic evaluation p95 under 500 ms and web-vital targets of LCP ≤2.5 s, INP ≤200 ms, and CLS ≤0.1 at p75 on the agreed mobile profile.
- **MW-NFR-SEC-01:** Validate untrusted boundaries, prevent enumeration, use secure headers/rate and size limits, and never let generated output override deterministic truth.
- **MW-NFR-PRIV-01:** Minimize sensitive inputs, separate data lifecycles, enforce retention/deletion, and never log raw financial payloads.

## 6. Old-to-new requirement migration

### 6.1 User flow

| Legacy requirement    | Disposition            | Active replacement                                                                                                        |
| --------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| UI-01                 | Replaced               | MW-UI-01 and MW-UI-06                                                                                                     |
| UI-02–UI-04           | Retained and clarified | MW-UI-02 and MW-UI-03                                                                                                     |
| UI-05                 | Replaced               | MW-UI-04                                                                                                                  |
| UI-06, UI-06.1, UI-07 | Replaced               | MW-UI-05; only supported transformations are shown, weight 0 is allowed, and climate is not a warm/cold 85/50/20 shortcut |
| UI-08                 | Removed                | Priority blend modes and composite Move Score are retired                                                                 |
| UI-09                 | Retained               | MW-UI-03                                                                                                                  |
| UI-10                 | Replaced               | MW-UI-07; provider-off deterministic output is a normal path                                                              |
| UI-10.1               | Retained and expanded  | MW-UI-06 and MW-UI-09                                                                                                     |
| UI-11                 | Retained               | MW-UI-08                                                                                                                  |

### 6.2 Scoring and evidence

| Legacy requirement | Disposition           | Active replacement                                                       |
| ------------------ | --------------------- | ------------------------------------------------------------------------ |
| SCR-01             | Replaced              | MW-DEC-01, MW-DEC-03, MW-DEC-05, MW-DEC-07–MW-DEC-09                     |
| SCR-02             | Retained              | MW-DEC-02                                                                |
| SCR-03             | Replaced              | MW-DEC-05 and MW-DEC-06                                                  |
| SCR-04             | Replaced              | MW-DEC-03 and MW-DEC-04                                                  |
| SCR-05             | Removed               | No composite blend or priority mode                                      |
| SCR-06–SCR-08      | Retained and expanded | MW-DEC-01 and MW-DEC-10–MW-DEC-11                                        |
| SCR-09–SCR-10      | Retained              | MW-DEC-09–MW-DEC-10                                                      |
| SCR-11             | Replaced              | MW-DEC-07; condition precedence replaces verdict band/downgrade metadata |

### 6.3 Explanation, verification, and rendering

| Legacy requirement | Disposition                               | Active replacement                                                                                     |
| ------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| EXP-01–EXP-04      | Deferred and reframed                     | MW-EXP-01–MW-EXP-05; optional AI only, stable references                                               |
| EXP-05             | Replaced                                  | MW-VER-03 exact Decision Profile fidelity                                                              |
| EXP-06–EXP-07      | Retained                                  | MW-EXP-04 and MW-VER-01                                                                                |
| VER-01–VER-07      | Retained but deferred until AI is enabled | MW-VER-01–MW-VER-06                                                                                    |
| VER-08–VER-10      | Replaced                                  | MW-VER-03; profile numbers, condition, confidence, stability, and caveats replace score/verdict checks |
| VER-11–VER-14      | Retained and adapted                      | MW-VER-01–MW-VER-06                                                                                    |
| RES-01–RES-02.1    | Retained and adapted                      | MW-RES-01, MW-RES-03, MW-RES-04                                                                        |
| RES-03             | Replaced                                  | MW-RES-02 adds the first-class `deterministic` mode                                                    |
| RES-04–RES-05      | Retained                                  | MW-RES-05 and MW-VER-01                                                                                |

### 6.4 Persistence, traces, and benchmark data

| Legacy requirement | Disposition                                 | Active replacement                |
| ------------------ | ------------------------------------------- | --------------------------------- |
| SAV-01–SAV-04      | Deferred and privacy-strengthened           | MW-SAV-01–MW-SAV-05               |
| TRC-01–TRC-03      | Retained and separated from saved scenarios | MW-TRC-01–MW-TRC-06               |
| TRC-04–TRC-06      | Retained for optional-AI release            | MW-VER-07–MW-VER-08 and MW-TRC-07 |
| BEN-01             | Retained                                    | MW-BEN-01                         |
| BEN-02–BEN-03      | Replaced and expanded                       | MW-BEN-02–MW-BEN-07               |
| BEN-04             | Retained                                    | MW-BEN-03                         |

### 6.5 Non-functional families

| Legacy family | Disposition                      | Active replacement                                                              |
| ------------- | -------------------------------- | ------------------------------------------------------------------------------- |
| NFR-P         | Retained with measurable budgets | MW-NFR-PERF-01; provider-off remains the baseline                               |
| NFR-M         | Retained                         | MW-NFR-MOD-01                                                                   |
| NFR-U         | Retained and expanded            | MW-NFR-UX-01 and MW-NFR-A11Y-01                                                 |
| NFR-T         | Retained and expanded            | MW-NFR-TEST-01 and MW-NFR-COR-01                                                |
| NFR-A         | Retained and reframed            | MW-NFR-AVAIL-01; deterministic is normal, fallback follows an attempted AI path |
| NFR-S         | Retained and strengthened        | MW-NFR-SEC-01 and MW-NFR-PRIV-01                                                |

## 7. Regression and test migration

| Legacy gate                                                             | Disposition                      | New gate                                                                                                                                                     |
| ----------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identical inputs produce identical three scores                         | Replaced                         | Identical inputs and version bindings produce byte-stable Decision Profile content                                                                           |
| Lifestyle/Financial/Move Score boundaries                               | Removed                          | Financial arithmetic/blockers, condition precedence, confidence, stability, missingness, and breakpoint boundaries                                           |
| Move Score band and downgrade fixtures                                  | Replaced                         | One fixture for every condition branch, precedence conflict, blocker, boundary, same-city case, missing-critical-evidence case, and no-valid-breakpoint case |
| Climate match/partial/mismatch cases                                    | Adapted                          | At least three climate-preference/transformation cases, including driver, tradeoff, unavailable evidence, and boundary behavior                              |
| One seeded failure per V-001…V-010                                      | Retained                         | MW-VER-07                                                                                                                                                    |
| 30–40 seeded scenarios                                                  | Retained for optional-AI release | MW-VER-07; this is not waived by making AI optional                                                                                                          |
| ≥85% grounding detection, ≥9/10 contradictions, 100% valid final output | Retained                         | MW-VER-08 with explicit denominators                                                                                                                         |
| Fallback path                                                           | Retained and clarified           | Provider-off uses `deterministic`; attempted-but-failed AI uses `deterministic_fallback`                                                                     |
| Four-step browser flow                                                  | Replaced                         | MW-UI-01 plus a traceability matrix covering validation, review, result, what-if, stale/missing data, evidence, accessibility, and provider-off behavior     |

## 8. Deferred and removed work

### Deferred, not rejected

- Optional AI explanation, verifier, repair, and adversarial regression runtime after the deterministic vertical slice.
- Opt-in save/reopen after migrations, transactions, tokens, retention, deletion, and reproduction tests.
- Occupation-specific labor context, childcare/school context, reported-crime context, richer mobility, and additional metros after source contracts exist.
- AWS-specific deployment only after a separate decision.

### Removed from the approved MVP

- Three 0–100 headline scores and priority blend modes.
- Generic Safety, School, Family Fit, Amenities, or universal “best city” judgments.
- Mandatory AI involvement in every evaluation.
- Email-based access, public scenario lists, and guessable IDs.
- Nationwide launch coverage, request-time external data, scraping, maps, property search, full tax computation, and salary prediction.

## 9. Implementation gate

Implementation may proceed against these requirements only when the active change also preserves the following Phase 0 checks:

1. Canonical Zod schemas parse one golden `ScenarioInput` and one complete `DecisionProfile`.
2. A documented decision table is mutually exclusive and exhaustive.
3. Fixtures cover every condition boundary, blocker, precedence conflict, missing-critical-evidence state, same-city case, invalid combination, and no-valid-breakpoint case.
4. Generated contracts have a no-diff CI check.
5. The root install, type-check, tests, and build are green.
6. No implementation depends on a retired legacy score, blend, result mode, email field, or mandatory provider call.

## 10. Linked decisions

- [ADR-001: Replace the three-score MVP with a Decision Profile](../decisions/ADR-001-decision-profile.md)
- [ADR-002: Use CBSA geography and versioned offline benchmark snapshots](../decisions/ADR-002-cbsa-versioned-offline-snapshots.md)
- [ADR-003: Make Zod runtime schemas the canonical contract source](../decisions/ADR-003-canonical-runtime-schema.md)
- [ADR-004: Separate protected evaluation traces from opt-in saved scenarios](../decisions/ADR-004-protected-eval-traces.md)
- [ADR-005: Keep a TypeScript modular monolith and defer AWS-specific infrastructure](../decisions/ADR-005-typescript-modular-monolith-deployment.md)
