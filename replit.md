# Workspace — MoveWise (historical repository name: AtlasGuard)

## Overview

MoveWise is a pre-commitment relocation validator. Canonical Zod schemas validate user inputs and versioned benchmark evidence before the deterministic decision engine produces a verified Decision Profile. The previous AtlasGuard three-score and mandatory-AI pipeline has been retired.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/atlasguard)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API contract generation**: Zod-to-OpenAPI from `@workspace/contracts`
- **Transport client codegen**: Orval (React Query client only)
- **Build**: esbuild (CJS bundle)

## Architecture

Modular Monolith. No microservices.

```
User Input → Canonical Validation → Verified Benchmark → Deterministic Decision Engine → Verified Evaluation Result → UI
```

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/               # Express 5 API server
│   │   └── src/
│   │       └── routes/
│   │           ├── evaluate.ts   # POST /evaluate validation boundary
│   │           └── health.ts     # GET /healthz
│   └── atlasguard/               # React + Vite frontend
│       └── src/
│           ├── pages/
│           │   ├── wizard.tsx    # 4-step input wizard (stub)
│           │   └── results.tsx   # Results display (stub)
│           └── App.tsx           # Router
├── lib/
│   ├── contracts/                # Canonical runtime Zod contracts
│   ├── decision-core/            # Verified deterministic evaluation engine
│   ├── api-spec/                 # Generated structural OpenAPI + generator
│   ├── api-client-react/         # Generated React Query hooks
│   └── db/src/schema/
│       ├── metros.ts             # metros table
│       ├── scenarios.ts          # scenarios table
│       ├── scenario-results.ts   # scenario_results table
│       └── trace-runs.ts         # trace_runs table
└── scripts/                      # Utility scripts
```

## Database Schema

The checked-in Drizzle tables below are legacy persistence scaffolding and are not currently reached by the API. They remain pending a separate persistence migration and do not define MoveWise runtime or transport contracts.

- **metros**: city, state, slug, all seven scores, climateTendency, incomeTaxRegime, benchmarkVersion, staleRiskFlag
- **scenarios**: id, email, currentCity, targetCity, requestPayload (JSON), createdAt
- **scenario_results**: id, scenarioId, lifestyleFit, financialFit, moveScore, verdictBand, resultMode (enum), structuredExplanation (JSON), renderedOutput (JSON), createdAt
- **trace_runs**: id, scenarioId, scoringEvidence (JSON), rawExplanation (JSON), verifierResult (JSON), finalMode, benchmarkVersion, createdAt

## Canonical Runtime Contracts

`lib/contracts` is the sole runtime/domain contract authority. TypeScript types are inferred from Zod schemas rather than maintained by hand. The generated OpenAPI file is a structural transport projection; refinements, checksums, and semantic bundle verification still run through `@workspace/contracts` at runtime.

## API Endpoints

| Method | Path          | Description                                                                                    |
| ------ | ------------- | ---------------------------------------------------------------------------------------------- |
| GET    | /api/healthz  | Health check                                                                                   |
| POST   | /api/evaluate | Validate canonical input; currently returns 501 until the verified engine is connected to HTTP |

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all lib packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only `.d.ts` files emitted during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references`

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build`
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`
- `pnpm run transport:generate` — regenerate structural OpenAPI and the React Query client
- `pnpm run transport:check` — verify checked-in transport artifacts without modifying them
- `pnpm --filter @workspace/db run push` — push schema changes to DB

## GitHub Remote

Remote is configured as:

```
origin  https://github.com/fighterz8/atlasguard.git
```
