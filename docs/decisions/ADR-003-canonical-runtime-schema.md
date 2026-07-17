# ADR-003: Make Zod runtime schemas the canonical contract source

## Status

Accepted

## Date

2026-07-17

## Context

The repository currently has conflicting handwritten TypeScript interfaces, OpenAPI schemas, generated Zod artifacts, route assumptions, database shapes, and planning-document examples. The existing `email` mismatch proves that compile-time types alone do not protect an API boundary. The Decision Profile also introduces a new contract that must remain identical across engine, API, UI, fixtures, persistence adapters, and optional AI verification.

## Decision

Create one contracts package whose hand-authored Zod schemas are the executable source of truth for runtime/domain and public API data.

- Parse `unknown` at every inbound, persistence, provider, and fixture boundary.
- Derive TypeScript types with `z.infer`; do not maintain parallel handwritten interfaces for the same object.
- Generate JSON Schema/OpenAPI and client types from the canonical schemas.
- Treat generated files as build artifacts; CI regenerates them and fails on drift.
- Validate golden fixtures against the same schemas used at runtime.
- Use stable evidence IDs or JSON Pointers; array positions are not durable references.
- Define canonical numeric units, rounding, precision, enums, missingness, and default-label semantics in schemas plus adjacent decision documentation.

The initial canonical objects are `ScenarioInput`, `BenchmarkSnapshotRef`, `MetricEvidence`, `FinancialPosition`, `PriorityChange`, `DecisionCondition`, `ConfidenceAssessment`, `StabilityAssessment`, `DecisionProfile`, `StructuredExplanation`, `VerifierResult`, `RenderedResult`, `ScenarioRecord`, `ScenarioResultRecord`, and `TraceRecord`.

Drizzle remains the relational persistence schema, not a second domain-contract authority. Explicit adapters map validated domain records to database rows, and round-trip tests guard those mappings.

## Alternatives Considered

### Keep OpenAPI as the authored source

This is viable, but the current code already bypasses the generated validators and uses local interfaces. For a TypeScript-first solo build, co-locating executable Zod schemas with domain logic reduces friction.

### Keep handwritten TypeScript interfaces

Interfaces disappear at runtime and cannot validate HTTP, provider, database, or fixture data.

### Generate domain contracts from database tables

Persistence rows and user-facing domain objects have different responsibilities, privacy needs, and versioning lifecycles.

## Consequences

- Existing duplicate request/evidence interfaces are removed or converted into generated imports.
- Contract-generation and no-diff checks become release gates.
- Schema changes require fixtures, API artifacts, migration mapping, and tests in the same change.
- Database adapters add a small amount of explicit code but prevent persistence concerns from shaping the public contract.

## Revisit When

The project adopts a non-TypeScript primary runtime or generated OpenAPI tooling cannot preserve required contract semantics without manual duplication.
