# MoveWise Phase 0 transformation registry

## Status and scope

This registry exists to prove the deterministic trust path with synthetic fixtures. It is not a calibrated production scoring model and must not be described as one.

A benchmark cannot be promoted merely because it is schema-valid and checksum-consistent. The promotion loader independently applies the registered transformation to each raw origin/destination value, unit, version, and user preference direction. The declared utilities must match exactly.

## Registered transformations

### `climate_heat.utility@1.0.0`

- Metric: `climate.annual_hot_days`
- Unit: `days`
- Supported directions: `lower`, `higher`
- Accepted raw range: 0–366 days
- Lower-is-better utility: `clamp(round(11000 - hotDays * 100), 0, 10000)`
- Higher-is-better utility: `10000 - lowerIsBetterUtility`
- Synthetic anchors: 80 hot days = 3,000 bps lower-is-better utility; 40 hot days = 7,000 bps.

### `commute_time.utility@1.0.0`

- Metric: `commute.mean_minutes`
- Unit: `minutes`
- Supported direction: `lower`
- Accepted raw range: 0–240 minutes
- Utility: `clamp(round(11400 - minutes * 150), 0, 10000)`
- Synthetic anchors: 28 minutes = 7,200 bps; 30 minutes = 6,900 bps.

## Promotion rules

- Unregistered metric/transformation/version/unit/direction combinations fail promotion.
- A raw missing value must have a null transformed utility and uncertainty.
- Partial one-sided evidence may be represented structurally but cannot be promoted into a two-sided move comparison.
- The benchmark checksum covers raw values, transformation metadata and outputs, quality grade, provenance, geography, and materiality policy.
- Reversing a preference direction without recomputing utilities fails even if an attacker or bug recomputes the snapshot checksum.

## Exit gate for production metrics

Every non-synthetic transformation requires a documented source definition, reference population, units, monotonicity, clipping behavior, uncertainty propagation, materiality rationale, calibration evidence, and boundary/golden tests before registry admission.
