# Phase 2 supported-location catalog

Status: research-only; exact Los Angeles -> Seattle comparison

## Purpose

MoveWise previously repeated the two metro slugs and display geography across the Wizard, benchmark loaders, illustrative scenario, and research HTTP adapter. That was safe for one prototype but created a drift path: a UI option, benchmark geography, or API allowlist could change without the others.

This slice establishes `@workspace/benchmark-data` as the owner of supported research coverage. It does not expand that coverage.

## Source-of-truth boundary

`supported-research-locations.ts` derives each selected place's city, state, CBSA code, and CBSA label from `APPROVED_ACS_COMMUTE_SOURCE.geographies`. The only catalog-authored values are stable MoveWise slugs and the directed comparison ID.

The exported records and tuple are frozen at runtime and readonly in TypeScript. Lookup accepts an arbitrary string and returns either a known catalog record or `null`; callers do not cast unknown input into a supported slug.

The comparison resolver returns the single frozen comparison only for:

- origin: `los-angeles-ca`;
- destination: `seattle-wa`.

Reverse, same-place, empty, and unknown-location inputs return `null`.

## Consumers

- Commute and housing promotion obtain metro slugs from the catalog and fail if verified snapshot geography differs from its catalog record.
- The illustrative scenario uses the catalog's directed comparison.
- Wizard options, lookup, slug types, example values, and move validation use the catalog/resolver.
- The default-off research HTTP adapter uses the same resolver before evaluation.

Frozen raw evidence and extraction tests retain literal official-source values because their job is to independently verify the registry. Test requests also retain literals where they are deliberately exercising unknown, reverse, or malformed inputs.

## Explicit boundaries

This slice adds no location endpoint, new metro, reverse evaluation, public HTTP activation, browser API request, request-time provider call, persistence, account, AI, or PocketPulse connection. User-facing options, wording, and behavior remain unchanged.
