# MoveWise Phase 4H: rendered deterministic activation

## Status

Complete as a research-only Wizard and Results activation on 2026-07-19. Nick accepted the Phase 4F policies and scenarios, Phase 4G verified adapter, and proceeding with an exact review preview before this implementation.

The research Wizard now explicitly evaluates complete, verified household answers through deterministic rule `0.2.0`. The direct fixed Results route still omits a rule version and therefore remains on `0.1.0`.

## Four-step Wizard

The rendered flow is now:

1. **Your move** — origin, destination, and whether the move is individual or household/family.
2. **Your money** — existing monthly comparisons plus optional destination gross household income. Gross income is used only for the housing-burden check and is never inferred from take-home income.
3. **Daily life** — commute and hot-day preferences. The former `Must-have` label is now `Very important`; this is a weighted supported comparison, not an essential requirement.
4. **Household needs** — every mode-applicable factor requires an explicit role. Included factors also require an explicit expected impact. `Not part of my decision`, `I’m not sure yet`, important, confirmed essential, unconfirmed essential, and unmet essential remain separate states.

Family mode presents all six accepted household factors. Individual mode omits childcare and school continuity but retains space, support network, required services, and car-free routines. The controls use native radio/select semantics, associated labels and errors, first-invalid-field focus, and no inferred household answers.

## Explicit rule `0.2.0` activation

The final Wizard action:

- verifies the existing research ScenarioInput and Decision Profile;
- verifies checksum-bound household answers in canonical mode order;
- derives and evaluates the complete deterministic input through the Phase 4G adapter; and
- supplies the verified evaluation, answers, and deterministic analysis together to Results.

Results cannot select `0.2.0` from an evaluation alone. The fixed direct Results route supplies no deterministic context and retains the existing `0.1.0` score and What-if behavior.

## Results explanation

The explicitly activated view renders engine-owned values rather than recreating arithmetic in UI code:

- deterministic condition, point score, band, endpoint range, applied cap, blockers, cautions, and component/factor contributions;
- a top-level Household essentials signal and visible rule version;
- an essential-needs check explaining that an unconfirmed or unmet essential can override the numeric score;
- every applicable household factor with the user's role, expected impact, contribution, and an explicit zero for excluded/unavailable states; and
- reproducibility references for the input fingerprint, household-answer checksum, and benchmark snapshot.

Household fit is labeled as user-supplied rather than city evidence. Stale `Add household factors` guidance is removed from `0.2.0`; conditional and unmet essentials generate exact factor-specific next steps. Opportunity context remains visibly unscored. The `0.1.0` What-if control is intentionally unavailable in the `0.2.0` Wizard result so changing a value cannot silently fall back to a different rule; users edit assumptions and rerun the complete model instead.

## Verification

Full `pnpm run verify` passes:

- generated transport drift;
- Prettier formatting;
- 48 test files / 365 tests;
- all workspace type-checks and production builds; and
- production dependency audit with no known vulnerabilities.

The existing tooltip sourcemap and bundle-size build advisories remain non-blocking.

System Chrome passed the complete local and exact hosted example at 1440 and 320 CSS pixels:

- all four Wizard steps and six family-mode household factors;
- optional gross-income rendering and the `Very important` daily-life wording;
- deterministic `0.2.0` Results, household explanations, and exact rule references;
- error summary plus focus on the first invalid field;
- one `h1`, no skipped heading levels, no duplicate IDs, and visible button/select/text controls at least 44 pixels high;
- zero horizontal overflow, console errors, page errors, `/api/` requests, local-storage writes, or session-storage writes.

## Exact review preview

Deployment `dpl_83XASBF7FrxnoiiUACMkGpqvi9us` is READY at:

`https://movewise-hbdc6w5z2-fighterz8s-projects.vercel.app/research/wizard`

The preview is built from code checkpoint `63fc54b7ebaeebfcc0a341fa6f0fffa0fb51e945` with `VITE_ENABLE_RESEARCH_PREVIEW=true`. It is a Vercel preview target, not production.

## Deliberate exclusions

This slice does not change the public API, save or persist an analysis, write browser storage, add a fifth metro, add opportunity metrics, perform live provider or AI work, infer household facts, push the branch, merge it, or deploy production.

Any contribution, cap, threshold, or precedence change requires a new rule version and renewed fixture calibration. Copy and layout can continue to improve without changing deterministic mechanics.
