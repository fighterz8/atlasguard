import {
  calculateBenchmarkComparisonChecksum,
  deriveMetricQualityGrade,
  verifyBenchmarkComparison,
} from "@workspace/contracts";
import type {
  BenchmarkComparison,
  MetricEvidence,
  VerifiedBenchmarkComparison,
} from "@workspace/contracts";

import {
  COMMUTE_METRIC_REGISTRATION,
  deriveCommuteMetric,
} from "./commute-derivation";
import { acs2024CommuteLaSeattleRawSnapshot } from "./raw/acs1-2024-commute-la-seattle";
import {
  verifyRawCommuteSnapshot,
  type VerifiedRawCommuteSnapshot,
} from "./raw-snapshot";
import { getSupportedResearchComparisonPlace } from "./supported-research-locations";

const COMPARISON_SNAPSHOT_VERSION = "1.0.0" as const;
const CHECKSUM_PLACEHOLDER = "0".repeat(64);
export const LOS_ANGELES_SEATTLE_COMMUTE_COMPARISON_SHA256 =
  "36f70b3adf17c480a766f4f47dc0de166aa075587360bcdd197666c5498ce9bb";

const metroRef = (
  record: VerifiedRawCommuteSnapshot["metros"][number],
  snapshot: VerifiedRawCommuteSnapshot,
) => {
  const place = getSupportedResearchComparisonPlace(record.side);
  if (
    record.cbsaCode !== place.cbsaCode ||
    record.cbsaLabel !== place.metro ||
    record.selectedPlace.city !== place.city ||
    record.selectedPlace.stateCode !== place.state
  ) {
    throw new Error("Verified commute geography differs from the catalog.");
  }

  return {
    slug: place.slug,
    cbsaCode: record.cbsaCode,
    label: record.cbsaLabel,
    selectedPlace: record.selectedPlace,
    selectedPlaceMapping: {
      method: "official_cbsa_title_match" as const,
      sourceArtifactId: snapshot.artifacts.acsGeographies.id,
      sourceUrl: snapshot.artifacts.acsGeographies.sourceUrl,
      sourceArtifactSha256: snapshot.artifacts.acsGeographies.sha256,
      verifiedOn: snapshot.verifiedOn,
    },
  };
};

const buildEvidence = (
  snapshot: VerifiedRawCommuteSnapshot,
  snapshotSha256: string,
): MetricEvidence => {
  const originRecord = snapshot.metros.find(
    (record) => record.side === "origin",
  );
  const destinationRecord = snapshot.metros.find(
    (record) => record.side === "destination",
  );
  if (originRecord === undefined || destinationRecord === undefined) {
    throw new Error("Verified snapshot lacks a comparison side.");
  }
  const origin = deriveCommuteMetric(originRecord);
  const destination = deriveCommuteMetric(destinationRecord);
  const grade = deriveMetricQualityGrade({
    freshness: "current",
    missingness: "complete",
    coverageBps: null,
    originGeographyMatch: "exact",
    destinationGeographyMatch: "exact",
    originUncertaintyBps: origin.utilityUncertaintyBps,
    destinationUncertaintyBps: destination.utilityUncertaintyBps,
  });

  return {
    kind: "benchmark_metric",
    id: "benchmark.commute_time.acs1.2024.la_seattle",
    metricId: COMMUTE_METRIC_REGISTRATION.metricId,
    definition: COMMUTE_METRIC_REGISTRATION.definition,
    priorityId: COMMUTE_METRIC_REGISTRATION.priorityId,
    unit: COMMUTE_METRIC_REGISTRATION.unit,
    originValue: origin.meanMinutes,
    destinationValue: destination.meanMinutes,
    deltaValue: destination.meanMinutes - origin.meanMinutes,
    source: {
      dataset: snapshot.dataset,
      publisher: snapshot.publisher,
      sourceUrl: snapshot.artifacts.b08013.sourceUrl,
      termsUrl: snapshot.termsUrl,
    },
    observationPeriod: snapshot.observationPeriod,
    releasedOn: snapshot.releasedOn,
    verifiedOn: snapshot.verifiedOn,
    geographies: {
      origin: {
        kind: "cbsa",
        code: originRecord.cbsaCode,
        label: originRecord.cbsaLabel,
        matchQuality: "exact",
      },
      destination: {
        kind: "cbsa",
        code: destinationRecord.cbsaCode,
        label: destinationRecord.cbsaLabel,
        matchQuality: "exact",
      },
    },
    snapshotVersion: COMPARISON_SNAPSHOT_VERSION,
    snapshotSha256,
    transformation: {
      id: COMMUTE_METRIC_REGISTRATION.transformationId,
      version: COMMUTE_METRIC_REGISTRATION.transformationVersion,
      preferredDirection: COMMUTE_METRIC_REGISTRATION.preferredDirection,
      outputs: {
        originUtilityBps: origin.utilityBps,
        destinationUtilityBps: destination.utilityBps,
        originUncertaintyBps: origin.utilityUncertaintyBps,
        destinationUncertaintyBps: destination.utilityUncertaintyBps,
      },
    },
    materialityPolicy: {
      utilityDeltaBps: COMMUTE_METRIC_REGISTRATION.materialityThresholdBps,
      rationale: COMMUTE_METRIC_REGISTRATION.materialityRationale,
    },
    quality: {
      freshness: "current",
      missingness: "complete",
      marginOfError: {
        origin: origin.marginOfError90Minutes,
        destination: destination.marginOfError90Minutes,
      },
      coverageBps: null,
      grade: { value: grade, policyVersion: "1.0.0" },
    },
  };
};

export const promoteLosAngelesToSeattleCommuteBenchmark = (
  snapshot: VerifiedRawCommuteSnapshot,
): VerifiedBenchmarkComparison => {
  const originRecord = snapshot.metros.find(
    (record) => record.side === "origin",
  );
  const destinationRecord = snapshot.metros.find(
    (record) => record.side === "destination",
  );
  if (originRecord === undefined || destinationRecord === undefined) {
    throw new Error("Verified snapshot lacks a comparison side.");
  }
  const placeholderEvidence = buildEvidence(snapshot, CHECKSUM_PLACEHOLDER);
  const draft = {
    snapshot: {
      id: "acs1.2024.commute.la_seattle",
      version: COMPARISON_SNAPSHOT_VERSION,
      sha256: CHECKSUM_PLACEHOLDER,
      admissionStatus: "research_only",
      rawSnapshot: {
        id: snapshot.id,
        sha256: snapshot.sha256,
      },
      sourceArtifacts: Object.values(snapshot.artifacts).map((artifact) => ({
        id: artifact.id,
        sourceUrl: artifact.sourceUrl,
        sha256: artifact.sha256,
      })),
      derivation: {
        id: "acs.commute_mean.b08013_b08006",
        version: "1.0.0",
      },
      delineationVersion: snapshot.delineationVersion,
      verifiedOn: snapshot.verifiedOn,
    },
    origin: metroRef(originRecord, snapshot),
    destination: metroRef(destinationRecord, snapshot),
    priorities: [
      {
        priorityId: COMMUTE_METRIC_REGISTRATION.priorityId,
        originUtilityBps:
          placeholderEvidence.transformation.outputs.originUtilityBps,
        destinationUtilityBps:
          placeholderEvidence.transformation.outputs.destinationUtilityBps,
        materialityThresholdBps:
          COMMUTE_METRIC_REGISTRATION.materialityThresholdBps,
        transformationId: COMMUTE_METRIC_REGISTRATION.transformationId,
        transformationVersion:
          COMMUTE_METRIC_REGISTRATION.transformationVersion,
        evidence: placeholderEvidence,
      },
    ],
  } satisfies BenchmarkComparison;
  const checksum = calculateBenchmarkComparisonChecksum(draft);
  if (checksum !== LOS_ANGELES_SEATTLE_COMMUTE_COMPARISON_SHA256) {
    throw new Error(
      `Promoted LA-to-Seattle comparison changed without a versioned checksum update: received ${checksum}.`,
    );
  }
  const evidence = buildEvidence(snapshot, checksum);

  return verifyBenchmarkComparison({
    ...draft,
    snapshot: { ...draft.snapshot, sha256: checksum },
    priorities: [{ ...draft.priorities[0], evidence }],
  });
};

export const loadLosAngelesToSeattleCommuteBenchmark = () =>
  promoteLosAngelesToSeattleCommuteBenchmark(
    verifyRawCommuteSnapshot(acs2024CommuteLaSeattleRawSnapshot),
  );
