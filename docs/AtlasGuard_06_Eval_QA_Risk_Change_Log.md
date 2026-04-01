**AtlasGuard  
06 · Eval, QA, Risk, and Change Log**

Process control draft for AtlasGuard MVP

**Purpose:** Define the evaluation process, QA gates, risk management
process, change management rules, defect handling, and documentation
sync rules for AtlasGuard MVP.  
**Owner / Status / Date:** Nick · Draft v0.1 · 2026-04-01

──────────────────────────────────────────────────────────────────────────────────────────

**Revision note:** Initial process-control draft aligned to AtlasGuard
MVP scope, deterministic scoring boundary, structured explanation
contract, verifier-first policy, seeded regression testing, and modular
monolith build plan.

# 1. Role of This Document

This document defines how AtlasGuard will be controlled during
implementation. Earlier documents established what the product is, how
deterministic scoring works, how explanations must be structured, how
the verifier behaves, and how the runtime architecture is organized.
This document defines how those decisions are protected during
development.

This document exists to prevent three common project failures:

- product scope drifting faster than implementation quality

- AI behavior being evaluated informally instead of systematically

- documentation and code falling out of sync

# 2. Process Philosophy

AtlasGuard is a trust-sensitive decision-support system. Quality control
therefore includes more than basic UI functionality. It also includes
score determinism, explanation faithfulness, verifier effectiveness,
safe degradation when AI output fails, and agreement between documents,
contracts, and code.

The process philosophy for MVP is:

- keep the build lean

- keep testing explicit

- keep scope reversible

- keep documentation selective but current

- prefer deterministic evidence over interpretive guesswork

# 3. Evaluation Strategy

## 3.1 Evaluation Goal

AtlasGuard’s evaluation strategy exists to prove that the explanation
layer stays grounded in deterministic truth and that the verifier
meaningfully improves output reliability.

## 3.2 Evaluation Layers

AtlasGuard MVP will be evaluated at four layers:

- Layer 1: Deterministic scoring tests — score stability, invariants,
  monotonicity, driver extraction, tradeoff extraction, verdict
  downgrade rules, and caveat/sensitivity triggers.

- Layer 2: Structured explanation contract tests — schema, required
  fields, enum values, array structures, and evidenceRef requirements.

- Layer 3: Verifier regression tests — seeded failure cases mapped to
  the appropriate verifier check IDs.

- Layer 4: End-to-end runtime tests — full flow from user input through
  scoring, explanation, verification, repair, fallback, persistence, and
  result rendering.

## 3.3 Seeded Regression Suite

The regression suite is a required MVP artifact, not a stretch goal.

Minimum MVP baseline:

- 30–40 seeded scenarios

- at least one seeded failure case per verifier check ID V-001 through
  V-010

- additional mixed scenarios combining more than one failure mode

- at least 3 climate-specific scenarios

- at least 3 downgrade-rule scenarios

- at least 3 fallback-path scenarios

## 3.4 Evaluation Categories

The seeded suite should cover at minimum:

- schema failures

- score fidelity failures

- verdict alignment failures

- driver grounding failures

- tradeoff grounding failures

- unsupported claims

- assumption integrity failures

- caveat coverage failures

- tone overreach failures

- sensitivity coverage failures

- climate-specific cases

- fallback activation cases

## 3.5 Minimum Evaluation Targets

AtlasGuard MVP should meet these minimum evaluation targets:

- flag at least 85% of seeded grounding-failure scenarios

- maintain 100% schema-valid output after repair on the seeded
  regression suite

- block or repair at least 9 out of 10 known contradiction cases before
  user-facing display

- maintain deterministic score stability for identical inputs across
  repeated runs

- successfully activate deterministic fallback whenever repair is
  exhausted or unusable output persists

## 3.6 Evaluation Cadence

Evaluation should occur on three cadences:

- Per change to scoring logic — rerun deterministic scoring tests and
  verdict/materiality tests.

- Per change to explanation or verifier logic — rerun explanation
  contract tests, verifier regression suite, and fallback-path tests.

- Per milestone checkpoint — rerun the core end-to-end suite and review
  doc/code consistency.

# 4. Quality Assurance Process

## 4.1 QA Goal

The QA process exists to ensure that AtlasGuard is not merely
functional, but trustworthy within the MVP’s stated limits.

## 4.2 QA Scope

QA covers scoring correctness, explanation contract correctness,
verifier behavior, fallback behavior, persistence behavior, trace
logging completeness, and doc/contract consistency.

QA does not attempt to simulate a full production reliability program.

## 4.3 QA Gates

A build is not considered acceptable unless all of the following hold:

- deterministic scoring tests pass

- explanation output matches required schema

- verifier regression suite meets minimum thresholds

- fallback path works on seeded failure cases

- no known contradiction bug remains unresolved in the current build

- affected docs are updated if a contract changed

## 4.4 Technical Review Process

Every meaningful system change should receive a lightweight technical
review.

Required review questions:

- Did this change alter deterministic scoring outputs?

- Did this change alter the evidence contract?

- Did this change affect verifier checks or severity behavior?

- Did this change require doc updates?

- Did this change create new regression scenarios?

If the answer to any of the first four questions is yes, the change is
not complete until tests and docs are updated.

## 4.5 Defect Severity Levels

Use four defect levels:

- Critical — incorrect deterministic score; verifier lets a severe
  contradiction pass; fallback fails when needed; corrupted saved
  scenario or unrecoverable trace failure.

- High — material tradeoff omitted; required caveat suppressed; verdict
  mismatch; unsupported claim reaches the user.

- Medium — UI validation gap; trace detail incomplete; assumption
  display issue; non-critical formatting or rendering mismatch.

- Low — wording polish; layout issue; internal naming inconsistency
  without behavior impact.

## 4.6 Defect Tracking Workflow

Each defect should track the following fields:

- defect ID

- date found

- severity

- affected module

- reproduction steps

- expected behavior

- actual behavior

- owner

- status

- linked requirement ID(s)

- linked verifier check ID(s), if relevant

Suggested statuses: Open, In Progress, Fixed, Verified, Deferred.

## 4.7 QA Exit Criteria for MVP

MVP is ready for portfolio/demo packaging when:

- major scoring flows work end-to-end

- verifier thresholds are met

- fallback is proven

- saved scenario flow is stable enough to demo

- open defects are only medium or low and non-deceptive

- Docs 01–06 are internally consistent enough to build from

# 5. Risk Management Process

## 5.1 Risk Goal

The risk process exists to identify and control the few risks most
likely to break the project’s value, credibility, or delivery timeline.

## 5.2 Active Risk Register Categories

AtlasGuard MVP should track risks in these categories:

- scope risk

- scoring/model risk

- explanation/verifier risk

- data freshness risk

- implementation/integration risk

- documentation consistency risk

- schedule risk

## 5.3 Core Risks to Track

- R-01 Scope Drift — new features are proposed that do not improve
  scoring trust, verification, or user clarity. Mitigation: apply
  scope-control rules. Contingency: cut or defer immediately.

- R-02 Under-Specified Contracts — repeated naming mismatches or unclear
  runtime ownership. Mitigation: update docs with every
  contract-affecting change. Contingency: freeze implementation until
  reconciled.

- R-03 Verifier Weakness — regression suite miss rate rises or new
  failure class appears uncaught. Mitigation: expand seeded suite,
  tighten checks, review severity boundaries. Contingency: rely more
  aggressively on deterministic fallback.

- R-04 Data Freshness Risk — stale flags trigger frequently or caveat
  language becomes routine. Mitigation: freshness metadata, caveat
  enforcement, clear labeling. Contingency: narrow supported metros or
  caveat more explicitly.

- R-05 Schedule Compression — implementation begins outrunning contract
  updates. Mitigation: use doc-change gate for contract-affecting work.
  Contingency: pause new features and reconcile the current build first.

## 5.4 Risk Review Cadence

Review risks weekly during active implementation, immediately after any
major architecture or scoring change, and before demo packaging.

# 6. Change Management Process

## 6.1 Change Goal

The change process exists to keep AtlasGuard coherent as the design
evolves. Not every idea deserves implementation, and not every
implementation deserves permanence.

## 6.2 Change Types

- Type A — Cosmetic / Non-Contract Change: UI wording, layout, styling,
  non-behavioral refactors.

- Type B — Behavioral Change: changes scoring results, explanation
  structure, verifier logic, fallback behavior, persistence behavior, or
  regression expectations.

- Type C — Scope Change: adds, removes, or materially redefines features
  or deferred items.

## 6.3 Required Handling by Change Type

- Type A — optional note in change log; no doc rewrite unless wording
  matters to requirements.

- Type B — update code, update affected docs, update tests/regression
  cases, add a change-log entry.

- Type C — evaluate against scope-control rules, decide
  approve/defer/reject, update charter/scope doc if approved, then
  update change log and deferred list.

## 6.4 Scope Change Rules

A proposed feature should be delayed or rejected if it:

- does not improve deterministic trust, explanation faithfulness, or
  user decision clarity

- introduces operational complexity not required for MVP

- weakens testability or traceability

- creates more documentation debt than product value

## 6.5 Version Control Rules

Every meaningful code change should:

- be committed with a descriptive message

- reference the affected module or requirement ID when practical

- be small enough to review intelligently

- avoid bundling unrelated scope changes together

## 6.6 Documentation Sync Rule

If a change affects scoring evidence shape, explanation schema, verifier
checks, runtime flow, persistence fields, or requirement IDs and
thresholds, then the relevant document must be updated before the change
is considered complete.

# 7. Change Log Structure

Use a lightweight structured change log with these fields:

- change ID

- date

- summary

- change type (A / B / C)

- modules affected

- docs affected

- tests added or updated

- decision (approved / deferred / rejected)

- rationale

This should remain lean. It is not meant to become project bureaucracy.

# 8. Decision Log Structure

Track important architectural or scope decisions separately from raw
change history.

Each decision entry should include:

- decision ID

- date

- decision statement

- alternatives considered

- reason chosen

- downstream implications

- revisitation trigger

Example: “Deterministic fallback will be slot-fill only, not AI-assisted
rewrite.”

# 9. Documentation Maintenance Rules

AtlasGuard uses selective documentation, not exhaustive documentation.

Always keep current:

- thesis and scope

- scoring contract

- explanation/verifier contract

- architecture/data model

- requirements/NFRs

- eval/QA/risk/change log

Update only when needed:

- lessons learned

- demo script

- portfolio case study

# 10. Immediate Build Operating Rules

- No prompt-polish work before verifier behavior is stable.

- No scoring changes without rerunning deterministic tests.

- No verifier changes without rerunning seeded regression cases.

- No contract changes without updating docs.

- No new scope item without explicit keep/defer/reject decision.

- If AI output remains unreliable, prefer deterministic fallback over
  extra cleverness.

# 11. Open Questions

## 11.1 Resolved

- MVP requires a seeded regression suite rather than ad hoc spot checks.

- QA must include fallback-path validation.

- Defect severity should distinguish contradiction failures from mere
  polish issues.

- Contract-affecting changes require doc sync before completion.

## 11.2 Remaining

- Should low-severity UI or content polish defects be tracked in the
  same log as system defects, or only when they affect demo readiness?

- How aggressively should trace records be pruned, if at all, during
  MVP?

- Should risk reviews be documented inline in this doc or in a separate
  weekly log artifact?

# 12. Immediate Next Use

This document should be used immediately to:

- create the first seeded regression suite list

- define the first defect tracker format

- start a lightweight change log

- decide which risks are actively open right now

- prevent implementation from drifting ahead of contracts

# Appendix A · Quick Reference Tables

## A.1 Defect Severity Quick Reference

| **Severity** | **Typical Examples**                                                                                         |
|--------------|--------------------------------------------------------------------------------------------------------------|
| Critical     | Incorrect deterministic score; severe contradiction passes; fallback fails when needed.                      |
| High         | Material tradeoff omitted; required caveat suppressed; verdict mismatch; unsupported claim reaches the user. |
| Medium       | UI validation gap; trace detail incomplete; assumption display issue; non-critical rendering mismatch.       |
| Low          | Wording polish; layout issue; internal naming inconsistency without behavior impact.                         |

## A.2 Change Types Quick Reference

| **Type** | **Meaning**                    | **Required Handling**                                                                  |
|----------|--------------------------------|----------------------------------------------------------------------------------------|
| A        | Cosmetic / non-contract change | Optional change-log note; no doc rewrite unless wording affects requirements.          |
| B        | Behavioral change              | Update code, affected docs, and tests; add a change-log entry.                         |
| C        | Scope change                   | Evaluate approve/defer/reject; update charter/scope if approved; update deferred list. |
