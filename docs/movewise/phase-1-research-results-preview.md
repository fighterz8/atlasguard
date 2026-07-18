# Phase 1 Research Results Preview

## Purpose

This slice proves that a checksum-verified research benchmark and the deterministic Decision Profile engine can drive a useful results experience. It is not a public evaluation path and does not make the Los Angeles → Seattle comparison user-facing eligible.

## Run locally

```bash
PORT=5173 BASE_PATH=/ VITE_ENABLE_RESEARCH_PREVIEW=true pnpm --filter @workspace/atlasguard run dev
```

Then open `/research/la-to-seattle`.

The gate is fail-closed: only the exact string `true` registers the route. Default production builds remove the research route and its result copy from the bundle. `POST /api/evaluate` remains an intentional `501` for valid scenarios.

## What the page renders

- The canonical deterministic condition, evidence confidence, and stability status.
- Fixed illustrative financial assumptions exported from `@workspace/benchmark-data`.
- The promoted ACS 2024 commute metric and 90% margins of error.
- A separately promoted ACS 2024 median-gross-rent context record, labeled “Area context—not your budget.”
- Findings and next steps selected by `@workspace/decision-core`.
- Source, observation/release/verification dates, benchmark geography, transformation version, snapshot checksum, and raw-snapshot checksum.

The fixed finances are calculation fixtures, not metro observations or a recommended budget. The page labels them accordingly. The housing benchmark remains `context_only`; it is not substituted into those fixtures or the deterministic decision.

## Boundaries

- Research-only benchmark admission remains enforced by the engine.
- No live source request, HTTP evaluation, persistence, account, model provider, or AI explanation is used.
- No Wizard, what-if breakpoint engine, multi-metro lookup, save/share flow, or deployment is included.
- The single decision-bearing commute metric produces limited evidence confidence and cannot answer whether a move is worthwhile. The housing record adds context, not scoring weight.

## Verification expectations

- Focused tests must confirm the release status, route pair, condition, financial/metric separation, source lineage, and fail-closed flag.
- Both enabled and default-disabled production builds must pass.
- The default build must not contain the research route or result copy.
- The Vercel preview must pass desktop/mobile overflow, console, keyboard, landmark, heading, and table checks before the slice is checkpointed.
