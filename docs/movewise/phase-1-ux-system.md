# Phase 1 Slice 5 — UX System and Wizard Interaction Prototype

## Purpose

This slice establishes the interaction and visual foundation required before MoveWise connects a functional Wizard to evaluation. It is a research prototype, not a relocation evaluator.

The prototype answers a narrower question:

> Can a prepared user understand the four-step flow, correct validation errors, distinguish confirmed values from estimates, and review every assumption before calculation?

## Run locally

```bash
PORT=5173 BASE_PATH=/ VITE_ENABLE_RESEARCH_PREVIEW=true pnpm --filter @workspace/atlasguard run dev
```

Open `/research/wizard`.

The route uses the existing fail-closed research gate. Default builds do not register the route. Public `POST /api/evaluate` remains an intentional `501` for valid input.

## Interaction architecture

The approved prototype contains four steps:

1. **Your move** — exact origin and destination plus visible metro resolution.
2. **Your money** — current and target monthly assumptions, with target values explicitly marked confirmed or estimated.
3. **What matters** — only the currently supported commute priority, including “does not matter.”
4. **Review assumptions** — values, basis, source, and benchmark geography before any evaluation.

Progress and Back navigation preserve the local draft. Validation blocks forward navigation and produces both a focusable summary and field-associated messages. Completing review produces a local status message and a link to the fixed research result; it does not evaluate the entered scenario.

## Narrow visual system

The Slice 5 system adds only tokens and primitives required by the Wizard and Results experience:

- favorable, caution, risk, estimate, and unavailable semantic states;
- visible focus and a keyboard-focusable skip link;
- 44-pixel minimum form controls;
- reduced-motion behavior;
- reusable provenance/status badges;
- a calm neutral/teal surface system with restrained radius and shadow;
- a responsive four-step progress indicator.

It deliberately avoids a generic component showcase, maps, score gauges, gradients, glass effects, city-photo collages, and broad generated UI inventory.

## Financial provenance and PocketPulse readiness

Manual entry remains the complete independent path. Each destination financial value has a separate assumption basis.

The UI reserves the safe future integration boundary described in the project handoff:

- a user initiates a versioned aggregate transfer;
- MoveWise receives only required monthly aggregates, observation dates, completeness, and provenance;
- raw transactions are not transferred by default;
- imported aggregates remain estimates until the user reviews or confirms them;
- MoveWise continues to work when PocketPulse is absent or disconnected.

This slice does not add a PocketPulse adapter, shared database access, OAuth, or an import button.

## Supported scope

- Los Angeles and Seattle are the only prototype locations.
- The exact selected city remains separate from the displayed CBSA benchmark geography.
- Commute is the only selectable lifestyle priority because it is the only approved decision-bearing benchmark in this research slice.
- Financial fields accept whole monthly dollars for interaction testing; the canonical evaluation contract remains cents-based.

## Not doing

- No evaluation request or active HTTP `200` path.
- No scenario persistence, account, save/share, analytics, or telemetry.
- No live data-source request.
- No AI explanation or recommendation.
- No unsupported climate, safety, school, amenity, tax, occupation, or family inputs.
- No PocketPulse connection or raw-transaction transfer.
- No production or default-enabled Wizard release.

## Verification expectations

- Model tests cover location, money validation, navigation, and assumption-review provenance.
- The enabled build and browser accessibility tree confirm the research limitation, progress semantics, skip link, field labels, and trust-boundary copy.
- Default and enabled production builds pass; the default build excludes the gated prototype route and copy.
- A separately approved Vercel preview must pass the four-step keyboard flow, validation correction, Back preservation, review completion, responsive layout at 320/768/1024/1440, zoom/reflow, console, and accessibility-tree checks before the slice is called preview-complete.
