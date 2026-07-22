# MoveWise Phase 0 transformation registry

## Status and scope

This registry exists to prove the deterministic trust path with synthetic fixtures. It is not a calibrated production scoring model and must not be described as one.

The Phase 2 LA -> Seattle research slice now exercises `climate_heat.utility@1.0.0` with frozen NOAA evidence. That proves source-to-decision reproducibility but does not change this transform's research-only calibration status. See `phase-2-la-seattle-climate-evidence.md`.

A benchmark cannot be promoted merely because it is schema-valid and checksum-consistent. The promotion loader independently binds the priority, metric, transformation version, materiality threshold, unit, direction, and raw origin/destination values to one registry entry. The declared utilities must match exactly.

## Registered transformations

Only `climate_heat` and `commute_time` are active Phase 0 priority IDs. Other canonical priority IDs may be retained at weight zero for forward-compatible input review, but a positive weight is rejected until a transformation is registered here.

### `climate_heat.utility@1.0.0`

- Metric: `climate.annual_hot_days`
- Unit: `days`
- Supported directions: `lower`, `higher`
- Accepted raw range: 0–366 days
- Registered materiality threshold: 500 utility bps
- Lower-is-better utility: `clamp(round(11000 - hotDays * 100), 0, 10000)`
- Higher-is-better utility: `10000 - lowerIsBetterUtility`
- Synthetic anchors: 80 hot days = 3,000 bps lower-is-better utility; 40 hot days = 7,000 bps.

### `commute_time.utility@1.0.0`

- Metric: `commute.mean_minutes`
- Unit: `minutes`
- Supported direction: `lower`
- Accepted raw range: 0–240 minutes
- Registered materiality threshold: 500 utility bps
- Utility: `clamp(round(11400 - minutes * 150), 0, 10000)`
- Synthetic anchors: 28 minutes = 7,200 bps; 30 minutes = 6,900 bps.

## Promotion rules

- Unregistered priority/metric/transformation/version/materiality/unit/direction combinations fail promotion.
- Relabeling evidence as another priority or changing its materiality threshold fails even after recomputing the snapshot checksum.
- A raw missing value must have a null transformed utility and uncertainty.
- Partial one-sided evidence may be represented structurally but cannot be promoted into a two-sided move comparison.
- The benchmark checksum covers raw values, transformation metadata and outputs, quality grade, provenance, geography, and materiality policy.
- Reversing a preference direction without recomputing utilities fails even if an attacker or bug recomputes the snapshot checksum.

## Decision-materiality rule

Transformation materiality and user importance are separate gates:

1. The signed utility delta must classify as non-similar under the metric's registered materiality threshold.
2. `abs(utilityDeltaBps * weight)` must be at least `materialityThresholdBps * 3`.

Weight three is the reference: a delta exactly at the metric threshold is material. Weight one requires three times the metric threshold, while weights four and five still cannot promote a metric-level similar change.

## Exit gate for production metrics

Every non-synthetic transformation requires a documented source definition, reference population, units, monotonicity, clipping behavior, uncertainty propagation, materiality rationale, calibration evidence, and boundary/golden tests before registry admission.
