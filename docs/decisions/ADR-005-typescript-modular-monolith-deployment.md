# ADR-005: Keep a TypeScript modular monolith and defer AWS-specific infrastructure

## Status

Accepted

## Date

2026-07-17

## Context

Three architecture directions coexist in project history: Next.js/SQLite, the checked-in Vite/Express/PostgreSQL/Replit scaffold, and an AWS Lambda/S3 handoff target. There is no Lambda adapter or serverless-safe database strategy. The product's highest risk is contract and decision validity, not infrastructure scale.

## Decision

Keep one TypeScript pnpm workspace and a modular-monolith application boundary.

The logical modules are contracts, benchmark snapshots, pure decision engine, deterministic signal selection/rendering, optional explanation adapter, verifier/repair coordinator, persistence/privacy, HTTP routes, Wizard/Results UI, and evaluation fixtures.

The initial deployment shape is platform-neutral and low-complexity:

- one Node application service for the API and orchestration;
- static delivery for the Vite frontend;
- no database dependency for the pure engine or provider-off demo;
- one managed PostgreSQL database only when trace or opt-in scenario persistence is enabled;
- one optional model-provider adapter behind a feature flag.

The application must start and demonstrate the deterministic flow with AI disabled. Health checks must not require database initialization when persistence is disabled.

AWS Lambda, API Gateway, S3/CloudFront, and serverless database work are deferred. If AWS becomes a real deployment requirement, a new ADR must select the adapter, connection strategy, secrets model, and failure behavior before implementation.

## Alternatives Considered

### Rewrite scoring in Python

This duplicates contracts and adds a cross-language boundary without providing an MVP capability.

### Build AWS infrastructure first

This would spend the first implementation phase on an unproven deployment target rather than the deterministic vertical slice.

### Split into microservices or queues

The runtime is a short synchronous pipeline. Distribution would increase operations and contract drift without current scale or isolation needs.

### Keep Replit as the architectural target

The existing scaffold is useful history, but product architecture should not depend on one development host.

## Consequences

- TypeScript is the only implementation language for the MVP decision engine.
- Pure decision logic has no Express, database, or provider dependency.
- Existing Express/Vite code may be simplified rather than replaced wholesale.
- Deployment remains reversible until the vertical slice and persistence needs are proven.
- A clean clone must install, type-check, test, and build before infrastructure expansion.

## Revisit When

Measured load, isolation, organizational constraints, or an explicit hosting requirement makes the single-service shape inadequate.
