# Phase 4I — Grounded Money and Native Decision Change

Status: complete and previewed on 2026-07-19  
Rule version: `0.2.0` (unchanged)  
Analysis schema: `1.1.0`

## Purpose

This slice corrects the largest grounding weakness identified in the independent review: the Money step previously made it too easy to copy a current take-home value into a destination even when state taxes could differ. It also restores the decision-changing-assumption explanation using calculations owned by rule `0.2.0`, and makes the source/readiness of financial values visible.

## Implemented behavior

### Safe Money guidance

- `Copy current costs` copies housing and other recurring expenses only. It never copies destination take-home income.
- A versioned state wage-income-tax context record is shown for supported cross-state moves.
- California to Texas or Washington explains that the destination may improve take-home if gross pay and other deductions stay similar. The reverse direction warns that take-home may be lower. Texas and Washington are not presented as having a directional advantage over one another.
- The guidance never fills, changes, or scores a destination income value. The user must enter and classify that value as an estimate or confirmed input.
- Official state sources are cited: the California Franchise Tax Board 2025 Form 540 booklet, Washington Department of Revenue individual-income-tax guidance, and Texas Constitution Article VIII via the Texas Legislative Council.

This is deliberately not a paycheck calculator. It excludes federal tax, payroll tax, filing status, credits, benefits, withholding, income type, and other state or local taxes. A numeric destination paycheck estimate would imply unsupported precision without those facts.

### Evidence and readiness

Results label financial values as `MoveWise calculated`, `You told us`, or `Needs confirmation`. The decision-readiness note calls out unconfirmed estimates and separately explains when gross income is missing and the housing-burden check therefore cannot run. Missing gross income is not inferred from take-home pay.

### Native rule-0.2 decision change

The verified adapter now derives exact decision-change candidates by rerunning evaluator-owned rule `0.2.0` calculations. Supported paths cover destination take-home, destination gross income, destination housing, destination recurring expenses, and retained-property cost when present.

The selected result names the input, current monthly value, exact threshold, monthly distance, and the Decision Profile condition that would result. Search behavior is deterministic and monotone, and one-cent boundary tests prove the stated threshold is the first value that changes the condition. The UI performs no duplicate score or threshold arithmetic and never falls back to rule `0.1.0`.

An essential-needs override remains a separate rule-owned explanation. Browser review found that its heading still appeared when no essential need existed; the final correction hides that empty section.

## Verification

- `pnpm run verify` passed with generated transport current, formatting clean, 50 test files / 372 tests, all workspace type-checks, API and frontend production builds, and no known production dependency vulnerabilities.
- The existing tooltip sourcemap and bundle-size advisories remain non-blocking.
- Hosted Chrome QA passed at 1440×1000 and 390×844 with one `h1`, no duplicate IDs, no horizontal overflow, no undersized visible controls, no console or page errors, and no unexpected API traffic.
- The final filled family example shows official California-to-Washington tax context, preserves user-owned income input, and omits the empty essential-needs override.
- Desktop capture: `/home/nick/.openclaw/media/browser/dce1b6f9-724c-42c9-b922-b0013b4e1eeb.jpg`
- Mobile capture: `/home/nick/.openclaw/media/browser/ad9701bb-e565-4347-a93a-d939513581b6.jpg`

Final review preview:

- Superseded deployment: `dpl_34oRfvzF5tWzWcD4tVURXMHY2MyQ`
- Replacement deployment: `dpl_F81QH45ewr6kjc4ALD95ELAy8V9W`
- Wizard: `https://movewise-lss5tcyhk-fighterz8s-projects.vercel.app/research/wizard`

## Mobile preview correction

Nick reported that the initial final preview returned a blank white page on mobile. Current Chrome could not reproduce the white screen, but inspection found a concrete compatibility defect: the shipped research bundle directly required `structuredClone`, `Array.prototype.at`, and `String.prototype.replaceAll`, while the raw HTML root was empty whenever JavaScript failed to start.

Commit `fa88906` removes those runtime requirements from application code, uses a tested plain-data clone for Wizard and scenario values, targets ES2019 and Safari 13 during production builds, and leaves a readable loading/recovery message in the server-delivered HTML until React mounts. A research-enabled production build contains none of the three unsupported API calls.

The replacement immutable preview was opened from a new hosted-browser tab and verified at 390×844 and 1440×1000. The Wizard rendered, the startup fallback was replaced, the filled research example advanced to Money, all static assets returned HTTP 200, and there were no console errors, page errors, unexpected API requests, or horizontal overflow. This bounds the code/deployment defect; confirmation on the originally affected physical device remains the final acceptance check.

### iPhone Chrome follow-up

Nick confirmed that the replacement still remained on the server-rendered loading message in Chrome on an iPhone 16. Because all iOS browsers use Apple's WebKit engine, Chromium viewport emulation was not a sufficient compatibility test. The page HTML and hashed assets returned HTTP 200, localizing the remaining failure to module bootstrap or execution before React mounted; the precise device-side exception was not observable remotely.

Commit `c744c20` removes that dependency entirely for this preview by emitting one Babel-transformed classic SystemJS application bundle with usage-derived polyfills and no `type="module"` scripts. The raw HTML also replaces an endless loading state with bounded `MW-BOOT-01` through `MW-BOOT-03` startup codes if JavaScript stalls, throws, or rejects before React mounts. Source-level regression tests lock both requirements.

Full verification passes 52 test files / 376 tests. The exact hosted replacement contains zero module scripts and passes the complete four-step desktop and 320px flow without console errors, page errors, duplicate IDs, horizontal overflow, browser storage writes, or unexpected API requests. Physical iPhone confirmation remains the final acceptance gate.

Second replacement preview:

- Deployment: `dpl_Cfzae6m9nv5RL5BCLLaZT78uPn1M`
- Wizard: `https://movewise-eyz0toi8e-fighterz8s-projects.vercel.app/research/wizard`

## Preserved boundaries

This slice does not change accepted rule-`0.2.0` scoring, weights, caps, conditions, or fixture outcomes. It adds no minimum-evidence gate, rule `0.3.0`, numeric tax calculator, storage, public API activation, external data provider, push, merge, or production deployment.

## Next safe slice

Replace the abstract `Enough suitable space` household prompt with a concrete space-for-money housing input and comparison. The user should describe the home they want or expect, while MoveWise supplies clearly sourced destination housing context. Housing dollars must continue to enter Financial Security only once; any household-fit conclusion must remain distinct from the cost calculation and must not silently change rule `0.2.0` semantics.
