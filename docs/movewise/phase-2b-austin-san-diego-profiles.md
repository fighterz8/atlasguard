# MoveWise Phase 2B Austin and San Diego Profiles

**Status:** Implemented; research-only profiles (subsequently activated on 2026-07-19)

**Date:** 2026-07-18

**Requirements:** `MW2-BEN-01`, `MW2-BEN-02`, `MW2-BEN-04`

## Outcome

Austin and San Diego now have independently verified, checksum-bound metro profiles. This completes the four-profile internal research cohort without changing the public Los Angeles-to-Seattle route catalog, Wizard, Results, API, score, persistence, or deployment behavior.

| Metro     | Slug           | CBSA  | Profile checksum                                                   |
| --------- | -------------- | ----- | ------------------------------------------------------------------ |
| Austin    | `austin-tx`    | 12420 | `ed630549170789e57f5215d06609db9e32a57b88df026933c66a91f5c64c9dc1` |
| San Diego | `san-diego-ca` | 41740 | `8c5c7426d680ec3e0b13c4633719a2c2d26b369b622c70d7b9f4a16c7b8f16f1` |

Both profiles remain `research_only`. Profile availability is not route activation: `supportedResearchPlaces` and `resolveSupportedResearchComparison` still expose only Los Angeles to Seattle.

> Historical boundary: this was true when Phase 2B landed. The later four-metro activation now makes Austin and San Diego selectable and generates all different-metro routes from the promoted profiles; the profiles themselves remain `research_only`.

## Verified observations

| Metro     | Mean commute | 90% modeled MOE | Median gross rent | Rent 90% MOE | Reference hot days | Station range |
| --------- | -----------: | --------------: | ----------------: | -----------: | -----------------: | ------------: |
| Austin    |  28.2097 min |      0.7345 min |            $1,784 |          $20 |              122.8 |   122.8–123.5 |
| San Diego |  26.0618 min |      0.5428 min |            $2,336 |          $20 |               16.0 |      3.0–16.0 |

Commute and rent use exact 2024 ACS 1-year CBSA rows. Mean commute excludes people working from home and uses the existing zero-covariance approximation for the published component margins of error. Rent remains `context_only`; it is not silently introduced into scoring.

Climate uses selected-city NOAA station proxies from the 1991–2020 Climate Normals, not metro-wide or neighborhood forecasts. The stored range is the urban reference plus the named primary-airport contrast station.

## NOAA completeness disclosure

The profile contract now optionally preserves NOAA source completeness for the reference station:

- Austin Camp Mabry is **Standard** (`S`), with 30 observed years. Austin Bergstrom is also Standard, with 24 observed years.
- San Diego Montgomery Field is **Representative** (`R`), with 22 observed years. San Diego Lindbergh Field is also Representative, with 22 observed years.

NOAA defines Standard as at least 24 observed years and Representative as 10–23 observed years, with missing periods filled using surrounding-station estimates. The schema rejects relabeling a 22-year Representative station as Standard. San Diego's lower evidence class is therefore explicit in the profile rather than normalized away.

## Reproducibility and rejection gates

The source-verification command downloads and hashes 15 official artifacts: five ACS cohort artifacts, the NOAA inventory and documentation, and eight NOAA station files. It re-extracts four CBSA mappings, sixteen ACS estimate/MOE values, and all eight station normals.

Independent raw-snapshot validators reject:

- unapproved metro, CBSA, station, selected-place, or artifact mappings;
- changed extracted values even when a checksum is recomputed;
- stale snapshot or profile checksums;
- NOAA completeness labels inconsistent with observed years;
- duplicate or unresolved lineage and mutation after verification.

## Deliberate boundary

This slice does not create Austin/San Diego comparisons, activate either metro in user input, infer a quality-of-life conclusion, or implement the 1–100 MoveWise Score. Those steps require separate comparison, product-input, score, and user-facing activation gates.

## Implementation references

- `lib/contracts/src/metro-profile.ts`
- `lib/benchmark-data/src/source-registry.ts`
- `lib/benchmark-data/src/raw-metro-acs-snapshot.ts`
- `lib/benchmark-data/src/raw-metro-climate-snapshot.ts`
- `lib/benchmark-data/src/expanded-research-metro-profiles.ts`
- `lib/benchmark-data/src/research-metro-profiles.ts`
- `scripts/src/verify-movewise-commute-sources.ts`
