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

const VERSION = "1.0.1" as const;
const ZERO_SHA = "0".repeat(64);

export const RESEARCH_METRO_BENCHMARK_SHA256 = Object.freeze({
  "los-angeles-ca:seattle-wa:lower":
    "09b56fe68a48b24ef2dcfc656e6382b5c2a4046d81f5c6933ee3f7baacc9de1a",
  "los-angeles-ca:seattle-wa:higher":
    "9f2c554f405ca0616c4ed78aac2f87ec622fe04e34b6d7335cf529f5409b43eb",
  "los-angeles-ca:austin-tx:lower":
    "e3a01ea698dcc24132775bdfa901c285055f1bf10fb28de62b96480d21610332",
  "los-angeles-ca:austin-tx:higher":
    "8bede946b344971bd175f9a737e8cc6211425b2fd6a42ebcdf04ccbc48482143",
  "los-angeles-ca:san-diego-ca:lower":
    "8a345733a65588bb45db3c71edc44bf3093a37f53c07d5bc38790c9f4184f38c",
  "los-angeles-ca:san-diego-ca:higher":
    "6048db4e383c5a0929a3deaa56482cb29e9b795bf7e850ac6787847f5e58ae86",
  "seattle-wa:los-angeles-ca:lower":
    "3b3ed8e28b3a1911eb7c111168d4b016001518d8fbad7162870e2c8ef8a2cf04",
  "seattle-wa:los-angeles-ca:higher":
    "fd47ad7e6544feb6be659845fc8b8e1962b16314106defc8703479e490fd57eb",
  "seattle-wa:austin-tx:lower":
    "abac4f6e86a4294af43528c2900788aea997e8c452fe15e968464d891777e6b3",
  "seattle-wa:austin-tx:higher":
    "64cd29ebc7d63534537db4a01daeb15c896efb2adf0fe51c8f61e99e4a5a533a",
  "seattle-wa:san-diego-ca:lower":
    "583724be602d13b70cfd0a523189cad25aeedbf6ca1a7a28b82bd8b0c9e9d4ca",
  "seattle-wa:san-diego-ca:higher":
    "e15fd06976111ee7f40b94ce116408754f8bb144ded8fb3808306d222ea7002e",
  "austin-tx:los-angeles-ca:lower":
    "63b0c666e3fa02412b5f5d74988ff824c00636f4e808132e3dcc4b2a47301871",
  "austin-tx:los-angeles-ca:higher":
    "760df7dafacd97564ecf08768db5fe85b9f76bd3e2d3f9e38ad6502e4b7944e6",
  "austin-tx:seattle-wa:lower":
    "f25e4d5d2070729aadc4420d39997a88bb2c7cec24bdc1a0078c5f2f24d70f0d",
  "austin-tx:seattle-wa:higher":
    "e2254854618439cc1d4fce6567fc15c89612068f60a4717f499af75b5228f964",
  "austin-tx:san-diego-ca:lower":
    "3d4cbc081dd74acb051af03544e084ee3f02c274e42dc7ca4d326182286ea403",
  "austin-tx:san-diego-ca:higher":
    "ae282dce957cb1d330739f25cca29f08d93e3ef1db8899347222ad0e05f34eea",
  "san-diego-ca:los-angeles-ca:lower":
    "3bb3c8fc7f7dc4700e78b839849ba22b2479566b0ac14885abfa297f3d5397b4",
  "san-diego-ca:los-angeles-ca:higher":
    "31b5996b2b6a390e4335023991642fba5d46e454d2eb4772a48bcef701929394",
  "san-diego-ca:seattle-wa:lower":
    "2a39285f5cf1a2319b001fc7952c2ddaef5ad8afd752e23646168ec3d6758b9c",
  "san-diego-ca:seattle-wa:higher":
    "7c47d021fca217352208b78641134b41268c047736fef9299b2e5b352f320a98",
  "san-diego-ca:austin-tx:lower":
    "ad075d16ba911e83c6b7eeed6ca4f1289ba07d814958eb0a20ceb2561922654d",
  "san-diego-ca:austin-tx:higher":
    "bba84f3160995e3e2a21fa123b4fa8699210e519bd3fc6e2f5fd270e48e30348",
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
  const snapshotId = `movewise.research.${pairId}.${climateDirection}.1-0-1`;
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
