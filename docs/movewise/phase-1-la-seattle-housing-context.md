# Phase 1 LA → Seattle housing context

## Purpose

This slice adds one regional housing reference without turning an area median into a household assumption or a decision score. It uses the 2024 ACS 1-year B25064 table at the exact CBSA grain already resolved for the LA → Seattle research comparison.

## Frozen evidence

| Metro                          | B25064 median gross rent | 90% margin of error |
| ------------------------------ | -----------------------: | ------------------: |
| Los Angeles-Long Beach-Anaheim |             $2,114/month |                ±$13 |
| Seattle-Tacoma-Bellevue        |             $2,050/month |                ±$25 |

Official artifact:

- `acsdt1y2024-b25064.dat`
- SHA-256: `8624f9775add1e22ac3a015a753207e0d752bc4c967dda04c22cd9e17ac94b57`
- Source: <https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25064.dat>

The source verifier downloads the full official file, checks its content hash, and re-extracts the exact `GEO_ID`, estimate, and margin-of-error fields. Evaluation and rendering use only the frozen verified snapshot; there is no request-time data dependency.

## Enforced interpretation boundary

The promoted record is a branded `VerifiedContextMetricComparison` with:

- `decisionUse: context_only`
- `interpretationBoundary: descriptive_not_user_budget`
- research-only admission
- raw/source/promoted checksums
- exact source-row and CBSA lineage

It is not a `VerifiedBenchmarkComparison`, is never passed to `evaluateMoveDecision`, and cannot change the Decision Profile’s finances, priority contributions, condition, confidence, stability, findings, or next steps.

ACS median gross rent is an area median for renter-occupied units under the ACS definition. It is not current asking rent, a listing, a neighborhood estimate, a unit-type estimate, or the user’s expected housing cost. The preview keeps the fixed illustrative housing input at $2,000 for both metros while displaying the separate ACS context values.
