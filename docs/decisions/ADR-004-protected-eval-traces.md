# ADR-004: Separate protected evaluation traces from opt-in saved scenarios

## Status

Accepted

## Date

2026-07-17

## Context

Evaluation traces are required for deterministic debugging, verifier regression work, and proof that no unverified language reached the UI. User scenarios contain sensitive financial assumptions and serve a different purpose: user retrieval and sharing. Combining these records, retaining them indefinitely, or exposing them through list-by-ID routes creates unnecessary privacy and enumeration risk.

## Decision

MoveWise will maintain three distinct data planes:

1. **Operational logs** contain request ID, route/status, timing, version IDs, mode, verifier codes, and redacted error category. They never contain email, raw inputs, prompts, or unredacted model output.
2. **Protected evaluation traces** record each attempted evaluation for quality and debugging. After validation, a trace may contain the minimized validated input projection, benchmark and transformation versions, Decision Profile, optional raw structured explanation, verifier result, repair output, final mode, and safe failure metadata. Validation failures record field/error codes without rejected values.
3. **Saved scenarios** are optional user artifacts created only after a successful evaluation and an explicit save action. They are never created as a side effect of evaluation.

Protected traces are not reachable through public scenario APIs. Access is limited to the application operator, auditable, and purpose-bound. Raw/minimized traces use a 30-day default retention window and are deleted automatically; longer-lived aggregate metrics contain no scenario payload. Trace records are append-only within that window, while expiry and privacy deletion still remove them.

Saved scenarios, when implemented, use opaque tokens with at least 128 bits of entropy, default to a 30-day expiry, support revocation/deletion, and render with `noindex`. Email is not part of the evaluation contract. A later account system requires a new decision.

Trace persistence and saved-scenario persistence have separate tables, access paths, and lifecycle policies. A trace-store failure must not make a safe deterministic result unsafe; the result may still be returned, saving is disabled for that run, and a redacted operational alert is emitted.

## Alternatives Considered

### Store full scenarios and traces together indefinitely

This is simple initially but couples user utility to internal evaluation, increases sensitive-data exposure, and makes deletion semantics unclear.

### Store no traces

This reduces retention risk but makes verifier claims, regression debugging, and production incident analysis difficult to substantiate.

### Require email for retrieval

Email does not provide meaningful authentication by itself and adds identity data that the core decision task does not need.

## Consequences

- Public global scenario listing and sequential lookup routes are removed.
- Evaluation code validates before persistence and avoids partial saved scenarios.
- Model-provider projections exclude identity and unnecessary expense detail.
- Automated retention and deletion are deployment gates for trace/scenario persistence.
- Save/reopen remains deferred until transaction, token, expiry, and reproduction tests pass.

## Revisit When

Real users require durable accounts, legal retention duties apply, or the 30-day window is demonstrably insufficient for verifier debugging.
