# MoveWise Phase 3B Four-Metro Activation

**Status:** Implemented; research-only

**Date:** 2026-07-19

**Requirements:** `MW2-BEN-01`, `MW2-BEN-03`, `MW2-BEN-04`

## Outcome

Los Angeles, Seattle, Austin, and San Diego are selectable in either origin or destination role in the research Wizard. The catalog generates all 12 ordered different-metro comparisons from the four promoted profiles. Same-metro and unknown-metro inputs fail closed.

The selected pair now drives:

- the verified commute and preference-aware hot-day benchmark;
- the Decision Profile evaluated in the Wizard and injected research HTTP capability;
- lightweight city-climate summaries and directional trait descriptions;
- context-only ACS median gross-rent values and direction-aware explanatory copy;
- Results route labels, evidence geographies, findings, sensitivity controls, and Edit Assumptions state.

The original Los Angeles-to-Seattle loaders, checksums, and default sample remain byte-compatible.

## Generated comparison boundary

`research-metro-benchmark.ts` composes the selected origin and destination profiles into a checksum-bound benchmark for either supported climate preference direction. Its frozen checksum registry covers 24 outputs: 12 directed pairs times two hot-day directions.

`research-metro-housing-context.ts` composes 12 checksum-bound, context-only housing comparisons. These area medians remain descriptive evidence and never replace the household housing amount entered by the user.

Pair assembly rejects incompatible source identity, observation period, release metadata, geography, lineage, artifact hashes, and unknown or identical metros.

## Runtime boundary

The browser evaluates the reviewed draft locally from bundled promoted snapshots. It does not call the HTTP API. The HTTP research capability supports the same cohort only when explicitly injected; the default capability remains disabled, and production activation remains prohibited.

This slice does not implement the 1–100 MoveWise Score, a fifth metro, adaptive questions, persistence or save-and-reopen, provider calls, or AI-generated conclusions.

## Verification

- Frozen checksum and mutation tests cover generic benchmarks and housing contexts while preserving legacy Los Angeles-to-Seattle output.
- Wizard and API tests cover Austin-to-San Diego evaluation plus unsupported and same-metro rejection.
- Results model tests cover Austin-to-San Diego and San-Diego-to-Austin route, commute, climate, housing, and copy direction.
- Real-Chrome QA covers the four-place catalog, same-metro focus behavior, forward and reverse flows, Edit Assumptions state preservation, no browser API requests, clean console/page errors, and no horizontal overflow at 320, 768, 1024, or 1440 pixels.
- The full repository gate passes formatting, generated transport drift, 291 tests, all type-checks, production builds, and the production dependency audit.

## Implementation references

- `lib/benchmark-data/src/research-metro-benchmark.ts`
- `lib/benchmark-data/src/research-metro-housing-context.ts`
- `lib/benchmark-data/src/supported-research-locations.ts`
- `artifacts/atlasguard/src/features/wizard-prototype/evaluate-wizard-draft.ts`
- `artifacts/atlasguard/src/features/research-results/model.ts`
- `artifacts/api-server/src/research-evaluation.ts`
