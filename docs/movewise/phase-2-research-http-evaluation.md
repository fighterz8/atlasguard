# Phase 2 default-off research HTTP evaluation

Status: implemented research boundary; disabled by default

## Purpose

This slice proves that the canonical `ScenarioInput` can cross an HTTP boundary, resolve the already verified Los Angeles -> Seattle ACS+NOAA benchmark, and return the same semantically verified deterministic evaluation used by the local Wizard. It does not activate a public relocation evaluator.

## Capability boundary

`POST /api/evaluate` always applies `ScenarioInputSchema` first. Its behavior then depends on a server-owned capability:

- Missing, empty, or `disabled` `MOVEWISE_EVALUATION_MODE` validates a canonical request and returns the existing 501 response.
- Exact `research` enables only the frozen Los Angeles -> Seattle comparison in a non-production process.
- Any other value fails startup rather than guessing.
- `research` with `NODE_ENV=production` fails startup. Vercel and production configuration must not set this mode.

The default exported Express application injects the disabled capability. Tests create an enabled application directly instead of changing shared process environment.

## Supported request

The enabled research capability accepts only:

- origin metro slug `los-angeles-ca`;
- destination metro slug `seattle-wa`;
- an explicit `climate_heat` priority whose lower/higher direction selects the matching checksum-verified research benchmark;
- the benchmark's complete priority set, including `commute_time`.

The response is the canonical `EvaluationResult` with `releaseStatus: research_only` and `resultMode: deterministic`. The generated OpenAPI contract exposes that release status honestly; it does not describe research evidence as user-facing evidence.

## Error semantics

- 400 `invalid_scenario_input`: malformed JSON or canonical schema/refinement failure.
- 422 `unsupported_research_scenario`: canonical input outside the exact research pair or benchmark shape. The response does not echo financial values or unsupported metro slugs.
- 501 `decision_engine_not_ready`: evaluation capability is disabled.
- 500 `evaluation_failed`: unexpected enabled-evaluator failure with no implementation detail in the response.

Operational logs contain method, path without query parameters, status, generic lifecycle messages, safe issue codes, and generic error names. They do not log request bodies or full financial payloads.

## Explicit boundaries

This slice adds no database write, scenario save, trace store, account, email, provider, AI explanation, request-time external data call, additional metro, browser API call, or production deployment. The research Wizard continues evaluating locally in memory, and its privacy/zero-API behavior is unchanged.
