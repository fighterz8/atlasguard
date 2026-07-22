# ADR-002: Use CBSA geography and versioned offline benchmark snapshots

## Status

Accepted

## Date

2026-07-17

## Context

MoveWise compares regional conditions, but users select cities and may interpret a result as city- or neighborhood-specific. Source datasets use different geographies and release schedules. Request-time calls would also make results non-reproducible and expose the product to API outages, schema changes, rate limits, and silent benchmark drift.

## Decision

Use Census/OMB Core-Based Statistical Areas (CBSAs) as the canonical regional comparison unit for MVP benchmarks.

The system will preserve all three geography facts:

- the exact city and state selected by the user;
- the matched CBSA identifier, name, and delineation vintage;
- the actual geography of every metric, such as CBSA, county, place, state, or representative weather station.

MoveWise will not call external data providers during an evaluation. Data is ingested or curated ahead of time into immutable, versioned snapshots. Each promoted snapshot has a stable version ID and checksum, and every result binds to the exact snapshot and transformation versions it used.

Every metric evidence record must include a stable metric ID, definition, value and units, source and terms URLs, observation period, release date, verification date, geography, margin of error or coverage when available, transformation version, materiality policy, and freshness/missingness status.

The first release supports roughly 8–12 deliberately curated metros. Geography mismatch is visible to users and may reduce evidence confidence. Metro evidence must never be described as neighborhood-specific fact.

## Alternatives Considered

### City/place geography only

This matches user wording but does not align reliably with regional price, labor, housing, and commute datasets.

### County as the universal unit

Counties are useful source geographies but do not consistently represent a labor and housing market, especially across multi-county metros.

### Live provider calls during evaluation

This may appear fresher, but it weakens determinism, reproducibility, availability, and provenance.

### Nationwide coverage first

Breadth would force shallow validation and a large data-operations burden before the decision experience is proven.

## Consequences

- A source/metric registry and snapshot-promotion quality gate are required.
- Historical results remain reproducible after a benchmark refresh.
- Exact city/state remains necessary for state and local caveats even when the benchmark unit is regional.
- Missing or mismatched data is surfaced; weights are never silently redistributed.
- Neighborhood, property, and route-specific claims remain out of MVP scope.

## Revisit When

Validated user demand requires neighborhood-level decisions or a source's update cadence makes offline snapshots materially harmful. Any exception must preserve version binding and provenance.
