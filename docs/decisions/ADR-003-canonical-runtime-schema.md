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
- Generate OpenAPI 3.1 with `@asteasolutions/zod-to-openapi` from the canonical Zod 4 schemas, then run Orval only for the React Query transport client.
- Treat generated OpenAPI as a structural projection. Zod transforms, cross-field refinements, checksum promotion, and semantic bundle verification are not delegated to OpenAPI; the API route still parses `unknown` with `@workspace/contracts`.
- Keep health and transport-error schemas local to the generator when they do not represent domain data. Do not create a second runtime validator package for canonical evaluation inputs or results.
- Validate golden fixtures against the same schemas used at runtime.
- Use stable evidence IDs or JSON Pointers; array positions are not durable references.
- Reserve `benchmark.*`, `input.*`, and `derived.*` evidence-ID namespaces by evidence kind, and reject cross-namespace records before semantic evaluation.
- Define canonical numeric units, rounding, precision, enums, missingness, and default-label semantics in schemas plus adjacent decision documentation.
- Canonicalize semantically unordered input priorities, promoted benchmark priorities, findings, next steps, and referenced-input lists so equivalent inputs cannot produce different verified bytes.
- Canonically serialize and SHA-256 fingerprint every accepted `ScenarioInput`.
- Promote benchmark content only through a checksum-verifying loader that returns an immutable branded `VerifiedBenchmarkComparison`; plain schema parsing is structural validation, not promotion.
- Treat `verifyEvaluationResult(ScenarioInput + VerifiedBenchmarkComparison + DecisionProfile)` as the Phase 0 semantic trust boundary. It binds every financial value, provenance label, plausible range, metro, priority, transformed utility, registered derived metric, evidence record, finding, next step, condition, and confidence grade before a result is trusted.
- Reject sensitivity breakpoints from trusted Phase 0 results until the deterministic engine can prove them by reevaluating both sides of the claimed threshold.

The initial canonical objects are `ScenarioInput`, `BenchmarkSnapshotRef`, `MetricEvidence`, `VerifiedBenchmarkComparison`, `FinancialPosition`, `PriorityChange`, `DecisionCondition`, `ConfidenceAssessment`, `StabilityAssessment`, `NextStep`, `DecisionProfile`, `VerifiedEvaluationResult`, `StructuredExplanation`, `VerifierResult`, `RenderedResult`, `ScenarioRecord`, `ScenarioResultRecord`, and `TraceRecord`.

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
- The duplicate `@workspace/api-zod` package and the unused AtlasGuard scorer/explainer/verifier/fallback stubs are removed; the generated React client contains transport types only and is never a runtime trust boundary.
- Contract-generation and no-diff checks become release gates.
- `pnpm run transport:check` generates into an isolated temporary directory, compares bytes, and reports drift without overwriting checked-in or user-edited files.
- Schema changes require fixtures, API artifacts, migration mapping, and tests in the same change.
- Database adapters add a small amount of explicit code but prevent persistence concerns from shaping the public contract.
- A syntactically valid checksum string, profile, or benchmark object is not trusted on its own; callers must use the branded verification loaders.
- Registered benchmark transformations are documented in [the Phase 0 transformation registry](../movewise/phase-0-transformation-registry.md); synthetic calibration values are test infrastructure, not product claims.

## Revisit When

The project adopts a non-TypeScript primary runtime or generated OpenAPI tooling cannot preserve required contract semantics without manual duplication.
