# Workspace — AtlasGuard

## Overview

AtlasGuard is a relocation decision-support application. Users input their current city, target city, finances, and lifestyle preferences; a synchronous pipeline (Scorer → Explainer → Verifier → Fallback) produces a structured verdict and explanation. Business logic is scaffolded as `// TODO` stubs for implementation in Cursor.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/atlasguard)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Architecture

Modular Monolith. No microservices.

```
User Input → Scorer → Explainer → Verifier → (Optional Repair) → Fallback Renderer → Persistence → UI
```

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/               # Express 5 API server
│   │   └── src/
│   │       ├── core/             # Pipeline modules (all stub, implement in Cursor)
│   │       │   ├── contracts/types.ts   # All TypeScript interfaces
│   │       │   ├── scorer/index.ts      # Deterministic scoring engine
│   │       │   ├── explainer/index.ts   # AI explanation generator
│   │       │   ├── verifier/index.ts    # Verifier (V-001 through V-010)
│   │       │   └── fallback/index.ts    # Deterministic fallback renderer
│   │       └── routes/
│   │           ├── evaluate.ts   # POST /evaluate + scenario routes
│   │           └── health.ts     # GET /healthz
│   └── atlasguard/               # React + Vite frontend
│       └── src/
│           ├── pages/
│           │   ├── wizard.tsx    # 4-step input wizard (stub)
│           │   └── results.tsx   # Results display (stub)
│           └── App.tsx           # Router
├── lib/
│   ├── api-spec/openapi.yaml     # OpenAPI contract
│   ├── api-client-react/         # Generated React Query hooks
│   ├── api-zod/                  # Generated Zod schemas
│   └── db/src/schema/
│       ├── metros.ts             # metros table
│       ├── scenarios.ts          # scenarios table
│       ├── scenario-results.ts   # scenario_results table
│       └── trace-runs.ts         # trace_runs table
└── scripts/                      # Utility scripts
```

## Database Schema

- **metros**: city, state, slug, all seven scores, climateTendency, incomeTaxRegime, benchmarkVersion, staleRiskFlag
- **scenarios**: id, email, currentCity, targetCity, requestPayload (JSON), createdAt
- **scenario_results**: id, scenarioId, lifestyleFit, financialFit, moveScore, verdictBand, resultMode (enum), structuredExplanation (JSON), renderedOutput (JSON), createdAt
- **trace_runs**: id, scenarioId, scoringEvidence (JSON), rawExplanation (JSON), verifierResult (JSON), finalMode, benchmarkVersion, createdAt

## Core TypeScript Interfaces

All defined in `artifacts/api-server/src/core/contracts/types.ts`:
- `ScenarioInput` — user's complete evaluation request
- `ScoringEvidence` — full scoring output with nested evidence objects and derivedSignals
- `StructuredExplanation` — AI/fallback explanation with verdict, scores, drivers, tradeoffs, assumptions, sensitivity, caveats, next step
- `VerifierResult` — verifier output (PASS / PARTIAL / FAIL) with per-check details
- `PipelineOutput` — complete pipeline result

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/healthz | Health check |
| POST | /api/evaluate | Run evaluation pipeline |
| GET | /api/scenarios | List past scenarios |
| GET | /api/scenarios/:id | Get scenario + result |
| GET | /api/metros | List all metros |

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all lib packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only `.d.ts` files emitted during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references`

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build`
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`
- `pnpm --filter @workspace/api-spec run codegen` — regenerate types from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push schema changes to DB

## GitHub Remote

Remote is configured as:
```
origin  https://github.com/fighterz8/atlasguard.git
```
