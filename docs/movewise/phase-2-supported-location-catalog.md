# Phase 2 supported-location catalog

Status: research-only; four-metro cohort with 12 directed comparisons

## Purpose

MoveWise previously repeated two metro slugs and display geography across the Wizard, benchmark loaders, illustrative scenario, and research HTTP adapter. That was safe for one prototype but created a drift path: a UI option, benchmark geography, or API allowlist could change without the others.

`@workspace/benchmark-data` remains the owner of supported research coverage. The catalog now exposes the first verified cohort: Los Angeles, Seattle, Austin, and San Diego.

## Source-of-truth boundary

`supported-research-locations.ts` derives each selected place's city, state, CBSA code, and CBSA label from its promoted metro profile. Pair records are generated from the four profiles rather than written as separate route truth.

The exported records and tuple are frozen at runtime and readonly in TypeScript. Lookup accepts an arbitrary string and returns either a known catalog record or `null`; callers do not cast unknown input into a supported slug.

The comparison resolver returns a frozen record for every ordered pair of different promoted metros:

- four supported origins;
- three different destinations per origin;
- 12 directed comparisons total.

Reverse routes are first-class generated comparisons. Same-place, empty, and unknown-location inputs return `null`.

## Consumers

- Commute benchmarks and housing context are composed from the selected pair's promoted profiles and checked against frozen expected checksums.
- The illustrative default scenario remains Los Angeles to Seattle for compatibility.
- Wizard options, lookup, slug types, example values, and move validation use the catalog/resolver.
- Results resolve route, commute, lightweight climate traits, and context-only housing from the evaluated pair.
- The default-off research HTTP adapter uses the same resolver and generic benchmark composer before evaluation.

Frozen raw evidence and extraction tests retain literal official-source values because their job is to independently verify the registry. Test requests also retain literals where they are deliberately exercising unknown, reverse, or malformed inputs.

## Explicit boundaries

The four-metro cohort remains research-only. This activation adds no location endpoint, public/default HTTP activation, browser API request, request-time provider call, score, persistence, account, AI, fifth metro, or PocketPulse connection.
