import {
  calculateBenchmarkComparisonChecksum,
  deriveMetricQualityGrade,
  sha256Hex,
  sortJsonKeys,
  verifyBenchmarkComparison,
} from "@workspace/contracts";
import type {
  BenchmarkComparison,
  MetricEvidence,
  VerifiedBenchmarkComparison,
} from "@workspace/contracts";

import {
  CLIMATE_HEAT_METRIC_REGISTRATION,
  deriveClimateHeatMetric,
} from "./climate-derivation";
import { loadLosAngelesToSeattleCommuteBenchmark } from "./la-seattle-commute";
import { noaa1991To2020HotDaysLaSeattleRawSnapshot } from "./raw/noaa-1991-2020-hot-days-la-seattle";
import { verifyRawClimateSnapshot } from "./raw-climate-snapshot";

export type ClimateHeatDirection = "lower" | "higher";

const SNAPSHOT_VERSION = "1.0.0" as const;
const CHECKSUM_PLACEHOLDER = "0".repeat(64);
export const LOS_ANGELES_SEATTLE_RESEARCH_RAW_SHA256 =
  "e55acaa5e0a5a0db3cb3db221a5f48bbdd04601d5c37b5c44feee85735368008";
export const LOS_ANGELES_SEATTLE_RESEARCH_COMPARISON_SHA256 = {
  lower: "f78e5eb633e69d4e9471116d3b8db04f43fe5704189e54be4f9b741d6d508ddf",
  higher: "e31415468b2de1c9acc9c5ca2a8fdbd4fc1f329d56df09eb17563ae945a305d2",
} as const;

const climateSnapshot = verifyRawClimateSnapshot(
  noaa1991To2020HotDaysLaSeattleRawSnapshot,
);

const cloneJson = <Value>(value: Value): Value =>
  JSON.parse(JSON.stringify(value)) as Value;

const calculateCompositeRawChecksum = (commuteRawSha256: string): string =>
  sha256Hex(
    JSON.stringify(
      sortJsonKeys({
        commute: {
          id: "acs1.2024.commute.la-seattle",
          sha256: commuteRawSha256,
        },
        climate: {
          id: climateSnapshot.id,
          sha256: climateSnapshot.sha256,
        },
      }),
    ),
  );

const buildClimateEvidence = (
  direction: ClimateHeatDirection,
  snapshotSha256: string,
): MetricEvidence => {
  const origin = deriveClimateHeatMetric(climateSnapshot, "origin", direction);
  const destination = deriveClimateHeatMetric(
    climateSnapshot,
    "destination",
    direction,
  );
  const grade = deriveMetricQualityGrade({
    freshness: "current",
    missingness: "complete",
    coverageBps: null,
    originGeographyMatch: "mapped_proxy",
    destinationGeographyMatch: "mapped_proxy",
    originUncertaintyBps: origin.utilityUncertaintyBps,
    destinationUncertaintyBps: destination.utilityUncertaintyBps,
  });

  return {
    kind: "benchmark_metric",
    id: "benchmark.climate_heat.noaa_normals.1991_2020.la_seattle",
    metricId: CLIMATE_HEAT_METRIC_REGISTRATION.metricId,
    definition: CLIMATE_HEAT_METRIC_REGISTRATION.definition,
    priorityId: CLIMATE_HEAT_METRIC_REGISTRATION.priorityId,
    unit: CLIMATE_HEAT_METRIC_REGISTRATION.unit,
    originValue: origin.annualDaysAbove90F,
    destinationValue: destination.annualDaysAbove90F,
    deltaValue: destination.annualDaysAbove90F - origin.annualDaysAbove90F,
    source: {
      dataset: climateSnapshot.dataset,
      publisher: climateSnapshot.publisher,
      sourceUrl: climateSnapshot.artifacts.documentation.sourceUrl,
      termsUrl: climateSnapshot.termsUrl,
    },
    observationPeriod: climateSnapshot.observationPeriod,
    releasedOn: climateSnapshot.releasedOn,
    verifiedOn: climateSnapshot.verifiedOn,
    geographies: {
      origin: {
        kind: "station",
        code: origin.referenceStationId,
        label: origin.referenceStationName,
        matchQuality: "mapped_proxy",
      },
      destination: {
        kind: "station",
        code: destination.referenceStationId,
        label: destination.referenceStationName,
        matchQuality: "mapped_proxy",
      },
    },
    snapshotVersion: SNAPSHOT_VERSION,
    snapshotSha256,
    transformation: {
      id: CLIMATE_HEAT_METRIC_REGISTRATION.transformationId,
      version: CLIMATE_HEAT_METRIC_REGISTRATION.transformationVersion,
      preferredDirection: direction,
      outputs: {
        originUtilityBps: origin.utilityBps,
        destinationUtilityBps: destination.utilityBps,
        originUncertaintyBps: origin.utilityUncertaintyBps,
        destinationUncertaintyBps: destination.utilityUncertaintyBps,
      },
    },
    materialityPolicy: {
      utilityDeltaBps: CLIMATE_HEAT_METRIC_REGISTRATION.materialityThresholdBps,
      rationale: CLIMATE_HEAT_METRIC_REGISTRATION.materialityRationale,
    },
    quality: {
      freshness: "current",
      missingness: "complete",
      marginOfError: null,
      selectionUncertainty: {
        kind: "reference_site_range",
        origin: { min: origin.envelopeMinDays, max: origin.envelopeMaxDays },
        destination: {
          min: destination.envelopeMinDays,
          max: destination.envelopeMaxDays,
        },
        rationale: climateSnapshot.selectionPolicy.uncertainty,
      },
      coverageBps: null,
      grade: { value: grade, policyVersion: "1.0.0" },
    },
  };
};

const buildDraft = (direction: ClimateHeatDirection): BenchmarkComparison => {
  const commute = loadLosAngelesToSeattleCommuteBenchmark();
  const compositeRawSha256 = calculateCompositeRawChecksum(
    commute.snapshot.rawSnapshot.sha256,
  );
  if (compositeRawSha256 !== LOS_ANGELES_SEATTLE_RESEARCH_RAW_SHA256) {
    throw new Error("Composite research raw-snapshot checksum changed.");
  }
  const commutePriority = commute.priorities[0];
  return {
    snapshot: {
      id: "movewise.research.2026-07-18.la-seattle.acs-noaa",
      version: SNAPSHOT_VERSION,
      sha256: CHECKSUM_PLACEHOLDER,
      admissionStatus: "research_only",
      rawSnapshot: {
        id: "movewise.research.raw.la-seattle.acs-noaa",
        sha256: compositeRawSha256,
      },
      sourceArtifacts: [
        ...commute.snapshot.sourceArtifacts,
        ...Object.values(climateSnapshot.artifacts).map((artifact) => ({
          id: artifact.id,
          sourceUrl: artifact.sourceUrl,
          sha256: artifact.sha256,
        })),
      ],
      derivation: {
        id: "movewise.research.compose.acs-noaa",
        version: "1.0.0",
      },
      delineationVersion:
        "OMB Bulletin 23-01 / Census July 2023; NOAA station policy 2026-07-18",
      verifiedOn: "2026-07-18",
    },
    origin: cloneJson(commute.origin),
    destination: cloneJson(commute.destination),
    priorities: [
      {
        ...cloneJson(commutePriority),
        evidence: {
          ...cloneJson(commutePriority.evidence),
          snapshotVersion: SNAPSHOT_VERSION,
          snapshotSha256: CHECKSUM_PLACEHOLDER,
        },
      },
      {
        priorityId: CLIMATE_HEAT_METRIC_REGISTRATION.priorityId,
        originUtilityBps: buildClimateEvidence(direction, CHECKSUM_PLACEHOLDER)
          .transformation.outputs.originUtilityBps,
        destinationUtilityBps: buildClimateEvidence(
          direction,
          CHECKSUM_PLACEHOLDER,
        ).transformation.outputs.destinationUtilityBps,
        materialityThresholdBps:
          CLIMATE_HEAT_METRIC_REGISTRATION.materialityThresholdBps,
        transformationId: CLIMATE_HEAT_METRIC_REGISTRATION.transformationId,
        transformationVersion:
          CLIMATE_HEAT_METRIC_REGISTRATION.transformationVersion,
        evidence: buildClimateEvidence(direction, CHECKSUM_PLACEHOLDER),
      },
    ],
  };
};

export const loadLosAngelesToSeattleResearchBenchmark = (
  direction: ClimateHeatDirection,
): VerifiedBenchmarkComparison => {
  const draft = buildDraft(direction);
  const checksum = calculateBenchmarkComparisonChecksum(draft);
  const expected = LOS_ANGELES_SEATTLE_RESEARCH_COMPARISON_SHA256[direction];
  if (!/^0+$/.test(expected) && checksum !== expected) {
    throw new Error(
      `Combined LA-to-Seattle research comparison changed: received ${checksum}.`,
    );
  }
  return verifyBenchmarkComparison({
    ...draft,
    snapshot: { ...draft.snapshot, sha256: checksum },
    priorities: draft.priorities.map((priority) => ({
      ...priority,
      evidence: { ...priority.evidence, snapshotSha256: checksum },
    })),
  });
};
