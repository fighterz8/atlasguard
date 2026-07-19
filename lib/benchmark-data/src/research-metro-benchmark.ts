import {
  calculateBenchmarkComparisonChecksum,
  verifyBenchmarkComparison,
} from "@workspace/contracts";
import type {
  BenchmarkComparison,
  PreferredDirection,
  VerifiedBenchmarkComparison,
  VerifiedMetroProfile,
} from "@workspace/contracts";

import { CLIMATE_HEAT_METRIC_REGISTRATION } from "./climate-derivation";
import { COMMUTE_METRIC_REGISTRATION } from "./commute-derivation";
import { loadLosAngelesToSeattleResearchBenchmark } from "./la-seattle-research";
import {
  cloneJson,
  composeMetricEvidenceFromProfiles,
  composeProfileArtifactUnion,
  composeProfilePairRawSnapshot,
} from "./metro-profile-comparison";
import {
  getSupportedResearchMetroProfile,
  supportedResearchMetroProfiles,
  type ResearchMetroProfileSlug,
} from "./research-metro-profiles";

export type ResearchClimateDirection = Extract<
  PreferredDirection,
  "lower" | "higher"
>;

const VERSION = "1.0.0" as const;
const ZERO_SHA = "0".repeat(64);

export const RESEARCH_METRO_BENCHMARK_SHA256 = Object.freeze({
  "los-angeles-ca:seattle-wa:lower":
    "f78e5eb633e69d4e9471116d3b8db04f43fe5704189e54be4f9b741d6d508ddf",
  "los-angeles-ca:seattle-wa:higher":
    "e31415468b2de1c9acc9c5ca2a8fdbd4fc1f329d56df09eb17563ae945a305d2",
  "los-angeles-ca:austin-tx:lower":
    "a73a6785c1caf88611402c80281da6515c9a07c7b0561bdaab3c9d3cfb92bea2",
  "los-angeles-ca:austin-tx:higher":
    "f897907b9c88ca8d3766a575996faf55da1dad8172bf3661701ba4f65f5ec863",
  "los-angeles-ca:san-diego-ca:lower":
    "c010ffe7666a9439156e91daeb0051cede83e7861c12546ee5e9c5382f4a3a22",
  "los-angeles-ca:san-diego-ca:higher":
    "317131fa68a33d4c65a3d7aa7ebcba5378cc22e1653b44d459e3f12ba7933fe0",
  "seattle-wa:los-angeles-ca:lower":
    "a7d1b807bcd019312485d038abed08d38310c0e4b6c15c434b28b3687637497d",
  "seattle-wa:los-angeles-ca:higher":
    "21726b5c5832a71ca9d756c0a8d2656ee1d123134405ebcd53093b1eaae23fbf",
  "seattle-wa:austin-tx:lower":
    "bc2e40a23bed8857b480c1e74a2e798bac0c507ac96f159704ddfaf577e01296",
  "seattle-wa:austin-tx:higher":
    "e816fe4e897b9e41231a94731de8131534b283b5307be8c4f4ed0912fef05804",
  "seattle-wa:san-diego-ca:lower":
    "5d1d9bbc4f861f18075e11f6b226aea766406ce9e6151b845ccd5b35b9f01f13",
  "seattle-wa:san-diego-ca:higher":
    "7876a3ca8945abef90c403653c58db1b151bb3ed826c50214a9f7693b285b6c8",
  "austin-tx:los-angeles-ca:lower":
    "7ccffd525b4e4818c10bdff7e7229f12f5b8586511e52982288452f4dad87e20",
  "austin-tx:los-angeles-ca:higher":
    "332f9f5c1dd84d7d5e624b0baa0de1616c1bfda41dc47baa0c4e5def9b26195e",
  "austin-tx:seattle-wa:lower":
    "bce0e88e473ffb32393ab4f65ed11d4f80295f5c7ad3aa5a8e44fd129d2fa57d",
  "austin-tx:seattle-wa:higher":
    "a8e31f39f45bbc7f6567648b5783396c334b1373f1e1fb9ec77552d918e243b1",
  "austin-tx:san-diego-ca:lower":
    "a1a25744152dd88c6779fa1f7ee2c6785f549a606d250fc1be4ff2ada069b92f",
  "austin-tx:san-diego-ca:higher":
    "0fb563e28e56d2f03d5fc7f1a9a6a9b7027afad916eba6367c96f2889a601beb",
  "san-diego-ca:los-angeles-ca:lower":
    "4d6ca75e76729b2093c94d6cf15d47dfb74b74c8f5c43aba3f07a7216a6732f8",
  "san-diego-ca:los-angeles-ca:higher":
    "110578283ab404a592bfacb50dbb5e1ca5fb52cd01303014d07f8116416d2245",
  "san-diego-ca:seattle-wa:lower":
    "ec2990ea0f1f70854ae152be9468b3a79b4bc0d71f076434daf6930eb0aefaa4",
  "san-diego-ca:seattle-wa:higher":
    "bcd4f00be2d7c4688baeeb6d820b15dd7ec096668252cd939ef09b068e7e9f8f",
  "san-diego-ca:austin-tx:lower":
    "8b170abfec65319ed4de924b4b8c852a8abefd9a76ba723f806ab2b3aaa221c0",
  "san-diego-ca:austin-tx:higher":
    "905624276834fe1e3244af82d818522abb2b66085e16ce99f7d36478f9d4d8e3",
} as const);

const priorityFromEvidence = (
  evidence: ReturnType<typeof composeMetricEvidenceFromProfiles>,
) => ({
  priorityId: evidence.priorityId,
  originUtilityBps: evidence.transformation.outputs.originUtilityBps,
  destinationUtilityBps: evidence.transformation.outputs.destinationUtilityBps,
  materialityThresholdBps: evidence.materialityPolicy.utilityDeltaBps,
  transformationId: evidence.transformation.id,
  transformationVersion: evidence.transformation.version,
  evidence,
});

const assertSharedSnapshotMetadata = (
  originProfile: VerifiedMetroProfile,
  destinationProfile: VerifiedMetroProfile,
) => {
  if (
    originProfile.snapshot.delineationVersion !==
      destinationProfile.snapshot.delineationVersion ||
    originProfile.snapshot.verifiedOn !== destinationProfile.snapshot.verifiedOn
  ) {
    throw new Error("Metro profiles disagree on comparison snapshot metadata.");
  }
};

const composeResearchMetroBenchmark = (
  originProfile: VerifiedMetroProfile,
  destinationProfile: VerifiedMetroProfile,
  climateDirection: ResearchClimateDirection,
): VerifiedBenchmarkComparison => {
  assertSharedSnapshotMetadata(originProfile, destinationProfile);
  const pairId = `${originProfile.metro.slug}.to.${destinationProfile.metro.slug}`;
  const snapshotId = `movewise.research.${pairId}.${climateDirection}.1-0-0`;
  const comparisonVerifiedOn = [
    originProfile.snapshot.verifiedOn,
    destinationProfile.snapshot.verifiedOn,
  ].sort()[1];
  const evidenceInput = {
    originProfile,
    destinationProfile,
    snapshotVersion: VERSION,
    snapshotSha256: ZERO_SHA,
    comparisonVerifiedOn,
  } as const;
  const commuteEvidence = composeMetricEvidenceFromProfiles({
    ...evidenceInput,
    metricId: COMMUTE_METRIC_REGISTRATION.metricId,
    evidenceId: `benchmark.commute-time.${pairId}`,
    preferredDirection: COMMUTE_METRIC_REGISTRATION.preferredDirection,
  });
  const climateEvidence = composeMetricEvidenceFromProfiles({
    ...evidenceInput,
    metricId: CLIMATE_HEAT_METRIC_REGISTRATION.metricId,
    evidenceId: `benchmark.climate-heat.${pairId}`,
    preferredDirection: climateDirection,
  });
  const draft = {
    snapshot: {
      id: snapshotId,
      version: VERSION,
      sha256: ZERO_SHA,
      admissionStatus: "research_only",
      rawSnapshot: composeProfilePairRawSnapshot(
        originProfile,
        destinationProfile,
        `movewise.research.raw.${pairId}`,
      ),
      sourceArtifacts: composeProfileArtifactUnion([
        originProfile,
        destinationProfile,
      ]),
      derivation: {
        id: "movewise.research.compose.metro-profiles",
        version: VERSION,
      },
      delineationVersion: originProfile.snapshot.delineationVersion,
      verifiedOn: comparisonVerifiedOn,
    },
    origin: cloneJson(originProfile.metro),
    destination: cloneJson(destinationProfile.metro),
    priorities: [
      priorityFromEvidence(commuteEvidence),
      priorityFromEvidence(climateEvidence),
    ],
  } satisfies BenchmarkComparison;
  const checksum = calculateBenchmarkComparisonChecksum(draft);
  const checksumKey = `${originProfile.metro.slug}:${destinationProfile.metro.slug}:${climateDirection}`;
  const expected =
    RESEARCH_METRO_BENCHMARK_SHA256[
      checksumKey as keyof typeof RESEARCH_METRO_BENCHMARK_SHA256
    ];
  if (expected === undefined || checksum !== expected) {
    throw new Error(
      `Generated research benchmark ${checksumKey} changed without a versioned checksum update: received ${checksum}.`,
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

export const getResearchMetroBenchmark = (
  originSlug: string,
  destinationSlug: string,
  climateDirection: ResearchClimateDirection,
): VerifiedBenchmarkComparison | null => {
  if (originSlug === destinationSlug) return null;
  if (originSlug === "los-angeles-ca" && destinationSlug === "seattle-wa") {
    return loadLosAngelesToSeattleResearchBenchmark(climateDirection);
  }
  const originProfile = getSupportedResearchMetroProfile(originSlug);
  const destinationProfile = getSupportedResearchMetroProfile(destinationSlug);
  if (originProfile === null || destinationProfile === null) return null;
  return composeResearchMetroBenchmark(
    originProfile,
    destinationProfile,
    climateDirection,
  );
};

export const researchMetroBenchmarkPairs = Object.freeze(
  supportedResearchMetroProfiles.flatMap((originProfile) =>
    supportedResearchMetroProfiles.flatMap((destinationProfile) =>
      originProfile.metro.slug === destinationProfile.metro.slug
        ? []
        : (["lower", "higher"] as const).map((climateDirection) => ({
            originSlug: originProfile.metro.slug as ResearchMetroProfileSlug,
            destinationSlug: destinationProfile.metro
              .slug as ResearchMetroProfileSlug,
            climateDirection,
            benchmark: getResearchMetroBenchmark(
              originProfile.metro.slug,
              destinationProfile.metro.slug,
              climateDirection,
            )!,
          })),
    ),
  ),
);
