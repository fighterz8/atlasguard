# MoveWise Phase 2A Independent Metro Profiles

**Status:** Implemented; research-only

**Date:** 2026-07-18

**Requirements:** `MW2-BEN-01`, `MW2-BEN-02`, partial `MW2-BEN-04`

## Purpose

Phase 2A replaces pair-owned source truth with independently promoted metro profiles while preserving the verified Los Angeles-to-Seattle research path. It establishes the data boundary needed for later metro expansion without adding or activating Austin, San Diego, reverse-route, or arbitrary-metro evidence.

The implemented flow is:

```text
verified raw snapshots
  -> VerifiedMetroProfile(Los Angeles)
  -> VerifiedMetroProfile(Seattle)
  -> generated LA-to-Seattle compatibility comparisons
```

The existing commute, climate, and housing comparison contracts remain available to current consumers. Their declared checksums did not change during migration.

## Canonical profile boundary

`MetroProfile` represents one resolved metro and contains:

- a stable profile snapshot ID, version, admission status, derivation version, delineation statement, verification date, and SHA-256 checksum;
- one exact selected-place-to-CBSA mapping;
- immutable raw-snapshot references and source artifacts, including each artifact's raw-snapshot ownership;
- independently addressable metric observations with definition, role, value, unit, source, dates, geography, freshness, missingness, coverage, and uncertainty inputs;
- transformation and materiality metadata for decision-input observations;
- explicit `context_only` observations with no scoring transformation.

Canonical serialization sorts raw snapshots, artifacts, and observations by stable ID before checksum calculation. Promotion parses the complete schema, verifies the declared checksum, brands the result as `VerifiedMetroProfile`, and deeply freezes it.

Schema invariants reject:

- duplicate metric, raw-snapshot, or artifact IDs;
- unresolved or inconsistent raw-snapshot and source-artifact lineage;
- selected-place mappings not backed by a declared artifact;
- exact CBSA observations for a different metro;
- missingness inconsistent with value availability;
- reference-site ranges that exclude the stored value;
- duplicate or empty supported preference directions;
- scoring metadata on context-only observations.

## What profiles own

Profiles own raw per-metro observations and the evidence needed to interpret them. They do not own:

- origin or destination roles;
- origin-to-destination deltas;
- a selected climate preference direction;
- transformed comparison utilities or quality grades;
- a user-specific conclusion, Decision Profile, or MoveWise Score.

Those values are created only when two verified profiles are composed for a scenario. This prevents route count from multiplying authored truth and permits a later reverse comparison to be generated from the same two profiles after that capability passes its own activation gates.

## Promoted research profiles

Only two profiles are promoted in this slice:

| Metro       | Slug             | CBSA  | Profile checksum                                                   |
| ----------- | ---------------- | ----- | ------------------------------------------------------------------ |
| Los Angeles | `los-angeles-ca` | 31080 | `a7cbf056c5f3eb929b9a9bf67faa43159281afee2d32b5877ad2c237955aac90` |
| Seattle     | `seattle-wa`     | 42660 | `e79ddcc0222e06be479d8bfa858f0de590151e214bc134b5ed8e103956a2ad80` |

Each profile contains the same three already verified observations:

| Metric                      | Role             | Geography                   | Source snapshot                   |
| --------------------------- | ---------------- | --------------------------- | --------------------------------- |
| `commute.mean_minutes`      | `decision_input` | exact CBSA                  | 2024 ACS 1-year commute           |
| `climate.annual_hot_days`   | `decision_input` | selected-city station proxy | 1991–2020 NOAA Climate Normals    |
| `housing.median_gross_rent` | `context_only`   | exact CBSA                  | 2024 ACS 1-year median gross rent |

The frozen pair-shaped raw snapshots remain unchanged as historical source artifacts. Profile assembly verifies them first and then extracts each metro's observation. A future source-ingestion slice may replace pair-shaped raw files, but it must preserve or explicitly version the admitted observation lineage.

## Compatibility proof

The profile-backed composers reproduce the previous comparison snapshots exactly:

| Existing output                  | Preserved checksum                                                 |
| -------------------------------- | ------------------------------------------------------------------ |
| LA→Seattle commute               | `36f70b3adf17c480a766f4f47dc0de166aa075587360bcdd197666c5498ce9bb` |
| LA→Seattle research, lower heat  | `f78e5eb633e69d4e9471116d3b8db04f43fe5704189e54be4f9b741d6d508ddf` |
| LA→Seattle research, higher heat | `e31415468b2de1c9acc9c5ca2a8fdbd4fc1f329d56df09eb17563ae945a305d2` |
| LA→Seattle housing context       | `8becaa3c5daf2f8e40c37e220279ed09ee3b7f6ba4abb9088b6e11412dfe52eb` |

The compatibility layer preserves the current snapshot IDs, artifact order, evidence IDs, source rows, derivation metadata, and public loader signatures used by current runtime consumers. Direction-specific heat utilities and comparison quality grades are recomputed from profile observations under the existing registered transforms and policies.

The version-1 comparison payloads do not add profile-reference fields because doing so would invalidate their admitted checksums. The composer accepts only checksum-verified profiles, and profile assembly locks both expected profile checksums. A later comparison-contract version may expose explicit origin/destination profile references when its transport and consumer migration is approved.

## Deliberate exclusions

Phase 2A does not:

- add Austin, San Diego, or placeholder metro records;
- make reverse or arbitrary profile comparisons selectable;
- change Wizard, Results, API, or transport behavior;
- implement or activate the 1–100 MoveWise Score;
- change persistence, providers, AI behavior, or deployment configuration;
- promote any profile beyond `research_only`.

Austin and San Diego remain required by Product Contract 2.0, but they must enter through verified source snapshots and the same profile-promotion gates in a separate evidence slice.

## Verification

Focused coverage proves profile checksum determinism, deep immutability, canonical ordering, lineage, geography, missingness, reference ranges, exactly two supported profiles, exact admitted values, unsupported-slug rejection, byte-stable compatibility comparisons, and preservation of the original raw-snapshot promotion APIs.

At slice close, the full repository gate passed with generated transport current, formatting clean, 30 test files and 258 tests passing, all type-checks and builds passing, and no known production dependency vulnerabilities.

## Implementation references

- `lib/contracts/src/metro-profile.ts`
- `lib/benchmark-data/src/research-metro-profiles.ts`
- `lib/benchmark-data/src/metro-profile-comparison.ts`
- `lib/benchmark-data/src/la-seattle-commute.ts`
- `lib/benchmark-data/src/la-seattle-research.ts`
- `lib/benchmark-data/src/la-seattle-housing-context.ts`
