# Phase 1 LA → Seattle commute benchmark

Status: research-only pipeline proof  
Verified: 2026-07-17  
User-facing eligible: no

## Purpose

This slice proves that MoveWise can convert frozen official-source records into a checksum-verified benchmark and a deterministic Decision Profile without request-time network access. It does not validate the current commute utility scale or its 500-basis-point materiality threshold for consumer recommendations.

The evaluation API therefore remains intentionally unavailable for otherwise valid scenarios. This comparison is exercised only through the library and test suite.

## Geography contract

MoveWise retains the selected city but compares regional evidence at the exact Core Based Statistical Area (CBSA) grain.

| Side        | Selected place  | CBSA                                                  | ACS geography ID |
| ----------- | --------------- | ----------------------------------------------------- | ---------------- |
| Origin      | Los Angeles, CA | 31080 — Los Angeles-Long Beach-Anaheim, CA Metro Area | `310M700US31080` |
| Destination | Seattle, WA     | 42660 — Seattle-Tacoma-Bellevue, WA Metro Area        | `310M700US42660` |

Delineation version: OMB Bulletin 23-01 / Census July 2023.

For this deliberately narrow pair, selected-place mapping uses an official-CBSA-title match: “Los Angeles” and “Seattle” are each named in the corresponding official CBSA title in the frozen ACS geography inventory. The verification command extracts and checks those exact rows. This is a curated regional association, not a neighborhood or city-boundary claim. The separate delineation workbook pins the July 2023 CBSA vintage. Separately, `matchQuality: exact` on the commute metric means that the ACS evidence itself is published at the resolved CBSA grain.

## Frozen sources

The minimal local snapshot preserves the extracted estimates, their published 90% margins of error, retrieval date, source URLs, and full-artifact SHA-256 values.

| Artifact                   | Official URL                                                                                                              | SHA-256                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| July 2023 CBSA delineation | `https://www2.census.gov/programs-surveys/metro-micro/geographies/reference-files/2023/delineation-files/list1_2023.xlsx` | `952c4b1e78acbb54e6ec9412434b7602fedacbf021736351a63c181bdb753629` |
| ACS geography inventory    | `https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/documentation/Geos20241YR.txt`             | `2155acb3c81672eee9b0bd971cca60cd77d8b66222b34973928f57c087ea4afe` |
| ACS B08013 detail table    | `https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b08013.dat`       | `7356ea95a92afa5cb7c9e3fe8b39b13507bad424eb911b69ece6606f46aba2d3` |
| ACS B08006 detail table    | `https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b08006.dat`       | `9ef23a2e853cffc913e58c997e3cf5304e723a815eb527b5fec75dbc4a6a52e0` |

Dataset: 2024 ACS 1-year table-based summary files. Released 2025-09-11. Census attribution and terms reference: `https://www.census.gov/data/developers/about/terms-of-service.html`.

## Reproduction method

For each CBSA:

```text
non-home workers = B08006_E001 - B08006_E017
mean commute minutes = B08013_E001 / non-home workers
```

Calculations retain the full-precision derived mean. One-decimal half-up rounding is display-only. The 90% margin of error is explicitly an approximation: MoveWise applies zero-covariance propagation to the three published component margins of error. It is neither claimed as an upper bound nor represented as the directly published DP03 margin of error.

| CBSA  | Derived mean | Approx. 90% MOE |   Utility | Utility uncertainty |
| ----- | -----------: | --------------: | --------: | ------------------: |
| 31080 |     30.7 min |        ±0.3 min | 6,802 bps |              49 bps |
| 42660 |     30.0 min |        ±0.5 min | 6,901 bps |              80 bps |

The destination-minus-origin utility change is +99 bps. Under the inherited research threshold of 500 bps, the engine classifies the change as `similar`.

Coverage is `null`, not 100%. ACS is a survey estimate, and this slice has no defensible method for converting its sampling design into a population-coverage percentage. The benchmark consequently receives `limited` confidence under quality policy 1.0.0.

## Integrity boundaries

- Raw-snapshot canonical SHA-256: `eca676ec38e93ffc771aade9125aa58d2978bee7df157b9120dd42c52a3aa9a9`.
- Promoted-comparison canonical SHA-256: `36f70b3adf17c480a766f4f47dc0de166aa075587360bcdd197666c5498ce9bb`.
- The promoted snapshot carries the raw-snapshot ID/checksum, derivation ID/version, and all four official artifact URLs/checksums into every evaluation result.
- `pnpm --filter @workspace/scripts run verify:movewise-sources` downloads and verifies all four official artifacts, extracts the two CBSA geography rows plus B08013/B08006 values by named columns and GEO_ID, and compares every code, title, estimate, and MOE with the approved registry.
- Mutation tests cover stale source checksums, locally re-signed extracted values, unapproved source substitutions, geography remapping, promoted evidence drift, research evidence crossing the user-facing evaluator, and engine confidence behavior.

## Deliberately excluded

- NOAA climate evidence: at this Phase 1 checkpoint, station selection was a mapped proxy and no representative-station policy was approved. The later research-only resolution is documented in `phase-2-la-seattle-climate-evidence.md`; it preserves the station spread as explicit selection uncertainty rather than claiming metro representativeness.
- BEA Regional Price Parities: useful descriptive context, but there is no approved affordability transformation and the data is not a household budget.
- Direct DP03 API values: no Census API key is required for this slice; the result is reproduced from official bulk detail tables.
- Public evaluation, UI rendering, scenario storage, AI explanation, or a recommendation to move.
