import {
  calculateBenchmarkComparisonChecksum,
  verifyBenchmarkComparison,
} from "@workspace/contracts";
import type {
  BenchmarkComparison,
  VerifiedBenchmarkComparison,
  VerifiedMetroProfile,
} from "@workspace/contracts";

import { COMMUTE_METRIC_REGISTRATION } from "./commute-derivation";
import {
  cloneJson,
  composeMetricEvidenceFromProfiles,
  composeProfileSourceArtifacts,
  getProfileRawSnapshot,
} from "./metro-profile-comparison";
import {
  loadLosAngelesResearchMetroProfile,
  loadSeattleResearchMetroProfile,
} from "./research-metro-profiles";
import type { VerifiedRawCommuteSnapshot } from "./raw-snapshot";

const COMPARISON_SNAPSHOT_VERSION = "1.0.1" as const;
const CHECKSUM_PLACEHOLDER = "0".repeat(64);
const RAW_SNAPSHOT_ID = "acs1.2024.commute.la-seattle";
const SOURCE_ARTIFACT_ORDER = [
  "census.cbsa-delineation.2023-07",
  "acs1.2024.geographies",
  "acs1.2024.b08013",
  "acs1.2024.b08006",
] as const;

export const LOS_ANGELES_SEATTLE_COMMUTE_COMPARISON_SHA256 =
  "1b2a3bea4d80a7018e74d65d738791f7b017c2969f67668c824acf0f0003019f";

const orderedSourceArtifacts = (
  originProfile: VerifiedMetroProfile,
  destinationProfile: VerifiedMetroProfile,
) => {
  const artifacts = composeProfileSourceArtifacts(
    [originProfile, destinationProfile],
    RAW_SNAPSHOT_ID,
  );
  return SOURCE_ARTIFACT_ORDER.map((id) => {
    const artifact = artifacts.find((candidate) => candidate.id === id);
    if (artifact === undefined) {
      throw new Error(`Metro profiles lack commute artifact ${id}.`);
    }
    return artifact;
  });
};

export const promoteLosAngelesToSeattleCommuteBenchmarkFromProfiles = (
  originProfile: VerifiedMetroProfile,
  destinationProfile: VerifiedMetroProfile,
): VerifiedBenchmarkComparison => {
  const originRawSnapshot = getProfileRawSnapshot(
    originProfile,
    RAW_SNAPSHOT_ID,
  );
  const destinationRawSnapshot = getProfileRawSnapshot(
    destinationProfile,
    RAW_SNAPSHOT_ID,
  );
  if (originRawSnapshot.sha256 !== destinationRawSnapshot.sha256) {
    throw new Error("Metro profiles disagree on the commute raw snapshot.");
  }

  const placeholderEvidence = composeMetricEvidenceFromProfiles({
    originProfile,
    destinationProfile,
    metricId: COMMUTE_METRIC_REGISTRATION.metricId,
    evidenceId: "benchmark.commute_time.acs1.2024.la_seattle",
    preferredDirection: COMMUTE_METRIC_REGISTRATION.preferredDirection,
    snapshotVersion: COMPARISON_SNAPSHOT_VERSION,
    snapshotSha256: CHECKSUM_PLACEHOLDER,
  });
  const draft = {
    snapshot: {
      id: "acs1.2024.commute.la_seattle",
      version: COMPARISON_SNAPSHOT_VERSION,
      sha256: CHECKSUM_PLACEHOLDER,
      admissionStatus: "research_only",
      rawSnapshot: cloneJson(originRawSnapshot),
      sourceArtifacts: orderedSourceArtifacts(
        originProfile,
        destinationProfile,
      ),
      derivation: {
        id: "acs.commute_mean.b08013_b08006",
        version: COMPARISON_SNAPSHOT_VERSION,
      },
      delineationVersion: "OMB Bulletin 23-01 / Census July 2023",
      verifiedOn: "2026-07-17",
    },
    origin: cloneJson(originProfile.metro),
    destination: cloneJson(destinationProfile.metro),
    priorities: [
      {
        priorityId: placeholderEvidence.priorityId,
        originUtilityBps:
          placeholderEvidence.transformation.outputs.originUtilityBps,
        destinationUtilityBps:
          placeholderEvidence.transformation.outputs.destinationUtilityBps,
        materialityThresholdBps:
          placeholderEvidence.materialityPolicy.utilityDeltaBps,
        transformationId: placeholderEvidence.transformation.id,
        transformationVersion: placeholderEvidence.transformation.version,
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
  const evidence = composeMetricEvidenceFromProfiles({
    originProfile,
    destinationProfile,
    metricId: COMMUTE_METRIC_REGISTRATION.metricId,
    evidenceId: "benchmark.commute_time.acs1.2024.la_seattle",
    preferredDirection: COMMUTE_METRIC_REGISTRATION.preferredDirection,
    snapshotVersion: COMPARISON_SNAPSHOT_VERSION,
    snapshotSha256: checksum,
  });

  return verifyBenchmarkComparison({
    ...draft,
    snapshot: { ...draft.snapshot, sha256: checksum },
    priorities: [{ ...draft.priorities[0], evidence }],
  });
};

/** Compatibility wrapper for the original raw-snapshot promotion API. */
export const promoteLosAngelesToSeattleCommuteBenchmark = (
  snapshot: VerifiedRawCommuteSnapshot,
): VerifiedBenchmarkComparison => {
  const originProfile = loadLosAngelesResearchMetroProfile();
  const destinationProfile = loadSeattleResearchMetroProfile();
  const profileSnapshot = getProfileRawSnapshot(originProfile, snapshot.id);
  if (profileSnapshot.sha256 !== snapshot.sha256) {
    throw new Error("Raw commute snapshot differs from the promoted profiles.");
  }
  return promoteLosAngelesToSeattleCommuteBenchmarkFromProfiles(
    originProfile,
    destinationProfile,
  );
};

export const loadLosAngelesToSeattleCommuteBenchmark = () =>
  promoteLosAngelesToSeattleCommuteBenchmarkFromProfiles(
    loadLosAngelesResearchMetroProfile(),
    loadSeattleResearchMetroProfile(),
  );
