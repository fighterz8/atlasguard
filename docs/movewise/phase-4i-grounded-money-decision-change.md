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

- Deployment: `dpl_34oRfvzF5tWzWcD4tVURXMHY2MyQ`
- Wizard: `https://movewise-gy72xrb1e-fighterz8s-projects.vercel.app/research/wizard`

## Preserved boundaries

This slice does not change accepted rule-`0.2.0` scoring, weights, caps, conditions, or fixture outcomes. It adds no minimum-evidence gate, rule `0.3.0`, numeric tax calculator, storage, public API activation, external data provider, push, merge, or production deployment.

## Next safe slice

Replace the abstract `Enough suitable space` household prompt with a concrete space-for-money housing input and comparison. The user should describe the home they want or expect, while MoveWise supplies clearly sourced destination housing context. Housing dollars must continue to enter Financial Security only once; any household-fit conclusion must remain distinct from the cost calculation and must not silently change rule `0.2.0` semantics.
