import {
  calculateBenchmarkComparisonChecksum,
  sha256Hex,
  sortJsonKeys,
  verifyBenchmarkComparison,
} from "@workspace/contracts";
import type {
  BenchmarkComparison,
  VerifiedBenchmarkComparison,
  VerifiedMetroProfile,
} from "@workspace/contracts";

import { CLIMATE_HEAT_METRIC_REGISTRATION } from "./climate-derivation";
import { promoteLosAngelesToSeattleCommuteBenchmarkFromProfiles } from "./la-seattle-commute";
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

export type ClimateHeatDirection = "lower" | "higher";

const SNAPSHOT_VERSION = "1.0.1" as const;
const CHECKSUM_PLACEHOLDER = "0".repeat(64);
const CLIMATE_RAW_SNAPSHOT_ID = "noaa.normals.1991-2020.hot-days.la-seattle";
const CLIMATE_SOURCE_ARTIFACT_ORDER = [
  "noaa.normals.1991-2020.station-inventory",
  "noaa.normals.1991-2020.annual-documentation",
  "noaa.normals.usw00093134",
  "noaa.normals.usw00023174",
  "noaa.normals.usw00094290",
  "noaa.normals.usw00024233",
] as const;

export const LOS_ANGELES_SEATTLE_RESEARCH_RAW_SHA256 =
  "e55acaa5e0a5a0db3cb3db221a5f48bbdd04601d5c37b5c44feee85735368008";
export const LOS_ANGELES_SEATTLE_RESEARCH_COMPARISON_SHA256 = {
  lower: "09b56fe68a48b24ef2dcfc656e6382b5c2a4046d81f5c6933ee3f7baacc9de1a",
  higher: "9f2c554f405ca0616c4ed78aac2f87ec622fe04e34b6d7335cf529f5409b43eb",
} as const;

const calculateCompositeRawChecksum = (
  commuteRawSha256: string,
  climateRawSha256: string,
): string =>
  sha256Hex(
    JSON.stringify(
      sortJsonKeys({
        commute: {
          id: "acs1.2024.commute.la-seattle",
          sha256: commuteRawSha256,
        },
        climate: {
          id: CLIMATE_RAW_SNAPSHOT_ID,
          sha256: climateRawSha256,
        },
      }),
    ),
  );

const orderedClimateSourceArtifacts = (
  originProfile: VerifiedMetroProfile,
  destinationProfile: VerifiedMetroProfile,
) => {
  const artifacts = composeProfileSourceArtifacts(
    [originProfile, destinationProfile],
    CLIMATE_RAW_SNAPSHOT_ID,
  );
  return CLIMATE_SOURCE_ARTIFACT_ORDER.map((id) => {
    const artifact = artifacts.find((candidate) => candidate.id === id);
    if (artifact === undefined) {
      throw new Error(`Metro profiles lack climate artifact ${id}.`);
    }
    return artifact;
  });
};

const buildDraft = (direction: ClimateHeatDirection): BenchmarkComparison => {
  const originProfile = loadLosAngelesResearchMetroProfile();
  const destinationProfile = loadSeattleResearchMetroProfile();
  const commute = promoteLosAngelesToSeattleCommuteBenchmarkFromProfiles(
    originProfile,
    destinationProfile,
  );
  const climateRawSnapshot = getProfileRawSnapshot(
    originProfile,
    CLIMATE_RAW_SNAPSHOT_ID,
  );
  const destinationClimateRawSnapshot = getProfileRawSnapshot(
    destinationProfile,
    CLIMATE_RAW_SNAPSHOT_ID,
  );
  if (climateRawSnapshot.sha256 !== destinationClimateRawSnapshot.sha256) {
    throw new Error("Metro profiles disagree on the climate raw snapshot.");
  }
  const compositeRawSha256 = calculateCompositeRawChecksum(
    commute.snapshot.rawSnapshot.sha256,
    climateRawSnapshot.sha256,
  );
  if (compositeRawSha256 !== LOS_ANGELES_SEATTLE_RESEARCH_RAW_SHA256) {
    throw new Error("Composite research raw-snapshot checksum changed.");
  }
  const commutePriority = commute.priorities[0];
  const climateEvidence = composeMetricEvidenceFromProfiles({
    originProfile,
    destinationProfile,
    metricId: CLIMATE_HEAT_METRIC_REGISTRATION.metricId,
    evidenceId: "benchmark.climate_heat.noaa_normals.1991_2020.la_seattle",
    preferredDirection: direction,
    snapshotVersion: SNAPSHOT_VERSION,
    snapshotSha256: CHECKSUM_PLACEHOLDER,
  });

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
        ...commute.snapshot.sourceArtifacts.map(cloneJson),
        ...orderedClimateSourceArtifacts(originProfile, destinationProfile),
      ],
      derivation: {
        id: "movewise.research.compose.acs-noaa",
        version: SNAPSHOT_VERSION,
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
        priorityId: climateEvidence.priorityId,
        originUtilityBps:
          climateEvidence.transformation.outputs.originUtilityBps,
        destinationUtilityBps:
          climateEvidence.transformation.outputs.destinationUtilityBps,
        materialityThresholdBps:
          climateEvidence.materialityPolicy.utilityDeltaBps,
        transformationId: climateEvidence.transformation.id,
        transformationVersion: climateEvidence.transformation.version,
        evidence: climateEvidence,
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
  if (checksum !== expected) {
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
