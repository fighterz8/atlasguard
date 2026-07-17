import type { BenchmarkComparison, MetricEvidence } from "../benchmark";

export const PHASE0_BENCHMARK_SNAPSHOT_SHA256 =
  "76c4055687097dbbed9c1c8112180abd9e69fa10dd93131ff21f4e5fbb169f36";

const benchmarkEvidence = (
  values: Pick<
    MetricEvidence,
    | "id"
    | "metricId"
    | "definition"
    | "priorityId"
    | "unit"
    | "originValue"
    | "destinationValue"
    | "deltaValue"
  > & {
    transformationId: string;
    originUtilityBps: number;
    destinationUtilityBps: number;
    materialityThresholdBps: number;
  },
): MetricEvidence => ({
  kind: "benchmark_metric",
  id: values.id,
  metricId: values.metricId,
  definition: values.definition,
  priorityId: values.priorityId,
  unit: values.unit,
  originValue: values.originValue,
  destinationValue: values.destinationValue,
  deltaValue: values.deltaValue,
  source: {
    dataset: "Synthetic Phase 0 benchmark",
    publisher: "MoveWise",
    sourceUrl: "https://example.com/movewise/phase-0-benchmark",
    termsUrl: null,
  },
  observationPeriod: "Phase 0 synthetic fixture",
  releasedOn: "2026-07-17",
  verifiedOn: "2026-07-17",
  geographies: {
    origin: {
      kind: "cbsa",
      code: "00001",
      label: "River Metro",
      matchQuality: "exact",
    },
    destination: {
      kind: "cbsa",
      code: "00002",
      label: "Pine Metro",
      matchQuality: "exact",
    },
  },
  snapshotVersion: "1.0.0",
  snapshotSha256: PHASE0_BENCHMARK_SNAPSHOT_SHA256,
  transformation: {
    id: values.transformationId,
    version: "1.0.0",
    preferredDirection: "lower",
    outputs: {
      originUtilityBps: values.originUtilityBps,
      destinationUtilityBps: values.destinationUtilityBps,
      originUncertaintyBps: 0,
      destinationUncertaintyBps: 0,
    },
  },
  materialityPolicy: {
    utilityDeltaBps: values.materialityThresholdBps,
    rationale:
      "Synthetic Phase 0 materiality boundary for deterministic tests.",
  },
  quality: {
    freshness: "current",
    missingness: "complete",
    marginOfError: null,
    coverageBps: 10_000,
    grade: {
      value: "high",
      policyVersion: "1.0.0",
    },
  },
});

export const financialAndClimateUpsideBenchmark = {
  snapshot: {
    id: "fixture.phase0.2026-07-17",
    version: "1.0.0",
    sha256: PHASE0_BENCHMARK_SNAPSHOT_SHA256,
    delineationVersion: "fixture-2026",
    verifiedOn: "2026-07-17",
  },
  origin: {
    slug: "fixture-river",
    cbsaCode: "00001",
    label: "River Metro",
    selectedPlace: {
      city: "River City",
      stateCode: "RV",
    },
  },
  destination: {
    slug: "fixture-pine",
    cbsaCode: "00002",
    label: "Pine Metro",
    selectedPlace: {
      city: "Pine City",
      stateCode: "PN",
    },
  },
  priorities: [
    {
      priorityId: "climate_heat",
      originUtilityBps: 3_000,
      destinationUtilityBps: 7_000,
      materialityThresholdBps: 500,
      transformationId: "climate_heat.utility",
      transformationVersion: "1.0.0",
      evidence: benchmarkEvidence({
        id: "benchmark.climate_heat.fixture",
        metricId: "climate.annual_hot_days",
        definition:
          "Annual count of synthetic days above the Phase 0 heat threshold.",
        priorityId: "climate_heat",
        unit: "days",
        originValue: 80,
        destinationValue: 40,
        deltaValue: -40,
        transformationId: "climate_heat.utility",
        originUtilityBps: 3_000,
        destinationUtilityBps: 7_000,
        materialityThresholdBps: 500,
      }),
    },
    {
      priorityId: "commute_time",
      originUtilityBps: 7_200,
      destinationUtilityBps: 6_900,
      materialityThresholdBps: 500,
      transformationId: "commute_time.utility",
      transformationVersion: "1.0.0",
      evidence: benchmarkEvidence({
        id: "benchmark.commute_time.fixture",
        metricId: "commute.mean_minutes",
        definition: "Synthetic mean one-way commute time in minutes.",
        priorityId: "commute_time",
        unit: "minutes",
        originValue: 28,
        destinationValue: 30,
        deltaValue: 2,
        transformationId: "commute_time.utility",
        originUtilityBps: 7_200,
        destinationUtilityBps: 6_900,
        materialityThresholdBps: 500,
      }),
    },
  ],
} satisfies BenchmarkComparison;
