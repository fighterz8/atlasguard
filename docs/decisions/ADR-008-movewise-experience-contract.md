# ADR-008: Govern MoveWise with the Experience Contract

## Status

Accepted — Phase 0 integrity/state foundation and the Budget vertical slice are authorized; later phases remain separately gated by their exit criteria.

## Date

2026-07-21

## Context

The verified Decision Brief improved MoveWise Results, but the Fable Ultra walkthrough found that the intake and state model still overstate certainty. Decision-bearing Daily life answers were preselected, unanswered household needs became `Not applicable`, generated estimates could be labeled confirmed, readiness undercounted open checks, and refresh or destructive actions could erase work.

The proposed MoveWise Experience Contract v0.1.0 defines stable product, semantic, state, mobile, accessibility, privacy, and extension invariants. Nick authorized implementation after reviewing the completed review and contract artifacts.

## Decision

MoveWise will adopt the Experience Contract v0.1.0 as the governing implementation structure.

- The product remains a rent-first relocation screening and verification-planning workspace.
- Phase 0 integrity and state safety precede the full visual/data-entry rebuild.
- The Budget module is the first complete user-facing vertical slice.
- Equivalent explicit inputs must preserve current deterministic evaluation outputs.
- Decision-bearing answers have no defaults.
- Unknown and `Not applicable` remain distinct.
- Value origin and evidence status remain independent.
- Gate and Results derive unresolved checks from one canonical ledger.
- Draft persistence is local-only initially, versioned, disclosed, and clearable; no account or cloud sync is authorized.
- `Verified` requires deliberate user attestation that a value was checked. Merely entering or accepting a value leaves it Estimated.
- A hard rent-ceiling breach keeps the market-rent planning calculation and displays the failed constraint beside it. A ceiling-based alternative may be introduced later only as an explicit scenario.
- Only explicit preferences plus supported evidence may affect Outlook. Unsupported household conditions affect Readiness and verification work rather than creating favorable scoring.
- Scenario, verification, sharing, route expansion, and new household domains remain gated by the contract sequence.

The canonical implementation plan is maintained at `project-state/movewise-implementation/EXPERIENCE_CONTRACT_IMPLEMENTATION_PLAN.md` in the Dawn workspace.

## Alternatives considered

### Begin with a visual Money redesign

- **Pros:** Immediate visible improvement.
- **Cons:** Would encode temporary provenance, Unknown, readiness, and persistence semantics into new UI components.
- **Rejected:** Integrity primitives must be reusable before visual recomposition.

### Preserve the five-step wizard indefinitely

- **Pros:** Lower migration cost.
- **Cons:** Direct editing, saved scenarios, return visits, and verification work remain awkward.
- **Rejected as the canonical architecture:** Current steps may migrate incrementally into modules.

### Build the whole modular workspace in one pass

- **Pros:** Faster route to the final information architecture if nothing changes.
- **Cons:** Large regression surface, difficult rollback, and weak evidence about which interaction changes help.
- **Rejected:** Thin vertical slices keep the research preview working and testable.

### Add account/cloud storage first

- **Pros:** Cross-device resume and sharing.
- **Cons:** Expands identity, privacy, security, retention, deletion, and migration scope before local semantics are stable.
- **Rejected for this phase:** Local-only persistence is sufficient to prove state recovery.

## Consequences

- Existing dirty Decision Brief work remains the baseline and must not be discarded.
- Semantic/schema changes are additive and versioned before old fields are deprecated.
- Phase exits require focused tests, full verification, responsive/accessibility evidence for UI work, and a durable handoff.
- Preview deployments remain preview-only. No push, merge, production alias, or production deployment is authorized by this ADR.
- Contract changes require an ADR impact review and version decision.
- The first implementation correction removes silent Daily life defaults while preserving explicit scenario behavior.
