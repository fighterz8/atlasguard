import {
  calculateContextMetricComparisonChecksum,
  verifyContextMetricComparison,
} from "@workspace/contracts";
import type {
  ContextMetricComparison,
  VerifiedContextMetricComparison,
  VerifiedMetroProfile,
} from "@workspace/contracts";

import { loadLosAngelesToSeattleHousingContext } from "./la-seattle-housing-context";
import {
  cloneJson,
  composeProfileArtifactUnion,
  composeProfilePairRawSnapshot,
  getContextProfileObservation,
} from "./metro-profile-comparison";
import { getSupportedResearchMetroProfile } from "./research-metro-profiles";

const SCHEMA_VERSION = "1.0.0" as const;
const SNAPSHOT_VERSION = "1.0.1" as const;
const ZERO_SHA = "0".repeat(64);
const METRIC_ID = "housing.median_gross_rent";

export const RESEARCH_METRO_HOUSING_CONTEXT_SHA256 = Object.freeze({
  "los-angeles-ca:seattle-wa":
    "8becaa3c5daf2f8e40c37e220279ed09ee3b7f6ba4abb9088b6e11412dfe52eb",
  "los-angeles-ca:austin-tx":
    "9eda9d046b62a126864951bb5618082e9da8c6ff0bae5ca99857c881bce86691",
  "los-angeles-ca:san-diego-ca":
    "f2959a66456a9a17beb9684542c7373d084a84dfb0ceb8e7c9946248fbf3c7ec",
  "seattle-wa:los-angeles-ca":
    "054e3671a29d6e748e86ee78d42565f37cf3f9ebd5b8fc9dc180ab49fcad801a",
  "seattle-wa:austin-tx":
    "1aa537a21589b7ac63a7f24c9761eab3643cab9915a688008617ba5a35df506c",
  "seattle-wa:san-diego-ca":
    "e99609a7c4a22d81777bc91e364ae5787457f1d056d01fc726868ad66219fce6",
  "austin-tx:los-angeles-ca":
    "9f978f77a1d494dc2685eb284bd6c285b06a3cc19819fef9c9b0fdae6ecfd370",
  "austin-tx:seattle-wa":
    "f380e8ce853459791984b45197cf116921a236159e0c8961ec2a41251113ccd4",
  "austin-tx:san-diego-ca":
    "1c43fd307bad0ba2b8773c11902792c9698ceb9731233b3475a5d00e51ac0aae",
  "san-diego-ca:los-angeles-ca":
    "83ef0987acd46536001761aaeff55acbe4ac79dbeeca24316ab62c8669ee4e48",
  "san-diego-ca:seattle-wa":
    "6c3c9d1c2ff39470d733ed38ae7df7fcc1092a9f577ef6358d343c38dbb4c46b",
  "san-diego-ca:austin-tx":
    "ea323866b850ab2ff79276e90cdf5f7a350290ba2ec00d995b4fada38af94835",
} as const);

const composeResearchMetroHousingContext = (
  originProfile: VerifiedMetroProfile,
  destinationProfile: VerifiedMetroProfile,
): VerifiedContextMetricComparison => {
  const origin = getContextProfileObservation(originProfile, METRIC_ID);
  const destination = getContextProfileObservation(
    destinationProfile,
    METRIC_ID,
  );
  const compatibleFields = [
    "definition",
    "unit",
    "observationPeriod",
    "releasedOn",
  ] as const;
  compatibleFields.forEach((field) => {
    if (origin[field] !== destination[field]) {
      throw new Error(`Metro housing profiles disagree on ${field}.`);
    }
  });
  if (
    origin.value === null ||
    destination.value === null ||
    origin.quality.marginOfError === null ||
    destination.quality.marginOfError === null ||
    origin.source.termsUrl === null ||
    origin.source.dataset !== destination.source.dataset ||
    origin.source.publisher !== destination.source.publisher ||
    origin.source.sourceUrl !== destination.source.sourceUrl
  ) {
    throw new Error("Metro housing profiles lack comparable ACS evidence.");
  }
  const artifacts = composeProfileArtifactUnion([
    originProfile,
    destinationProfile,
  ]);
  const metricArtifactId = origin.source.artifactIds[0];
  const metricArtifact = artifacts.find(({ id }) => id === metricArtifactId);
  if (metricArtifact === undefined) {
    throw new Error("Metro housing profiles lack the source artifact.");
  }
  const pairId = `${originProfile.metro.slug}.to.${destinationProfile.metro.slug}`;
  const comparisonVerifiedOn = [
    origin.verifiedOn,
    destination.verifiedOn,
  ].sort()[1];
  const draft = {
    schemaVersion: SCHEMA_VERSION,
    decisionUse: "context_only",
    interpretationBoundary: "descriptive_not_user_budget",
    snapshot: {
      id: `housing-context.${pairId}.1-0-1`,
      version: SNAPSHOT_VERSION,
      sha256: ZERO_SHA,
      admissionStatus: "research_only",
      rawSnapshot: composeProfilePairRawSnapshot(
        originProfile,
        destinationProfile,
        `housing-context.raw.${pairId}`,
      ),
      sourceArtifacts: artifacts,
      derivation: {
        id: "movewise.context.compose.metro-profiles",
        version: SNAPSHOT_VERSION,
      },
      delineationVersion: originProfile.snapshot.delineationVersion,
      verifiedOn: comparisonVerifiedOn,
    },
    origin: cloneJson(originProfile.metro),
    destination: cloneJson(destinationProfile.metro),
    metric: {
      id: "housing.median-gross-rent.acs1.2024",
      definition: origin.definition,
      unit: origin.unit,
      originValue: origin.value,
      destinationValue: destination.value,
      deltaValue: destination.value - origin.value,
      marginOfError90: {
        origin: origin.quality.marginOfError,
        destination: destination.quality.marginOfError,
      },
      source: {
        artifactId: metricArtifact.id,
        artifactSha256: metricArtifact.sha256,
        dataset: origin.source.dataset,
        publisher: origin.source.publisher,
        tableId: "b25064",
        sourceUrl: origin.source.sourceUrl,
        termsUrl: origin.source.termsUrl,
      },
      sourceRows: {
        origin: `GEO_ID=310M700US${originProfile.metro.cbsaCode}`,
        destination: `GEO_ID=310M700US${destinationProfile.metro.cbsaCode}`,
      },
      observationPeriod: origin.observationPeriod,
      releasedOn: origin.releasedOn,
      verifiedOn: comparisonVerifiedOn,
      geographies: {
        origin: cloneJson(origin.geography),
        destination: cloneJson(destination.geography),
      },
      snapshotVersion: SNAPSHOT_VERSION,
      snapshotSha256: ZERO_SHA,
    },
    caveats: [
      "This is a 2024 area median, not current asking rent, a listing, or a forecast.",
      "It is not substituted into the household financial scenario or the decision condition.",
      "A metro median cannot describe a specific neighborhood, unit type, or household's expected housing cost.",
    ],
  } satisfies ContextMetricComparison;
  const checksum = calculateContextMetricComparisonChecksum(draft);
  const checksumKey = `${originProfile.metro.slug}:${destinationProfile.metro.slug}`;
  const expected =
    RESEARCH_METRO_HOUSING_CONTEXT_SHA256[
      checksumKey as keyof typeof RESEARCH_METRO_HOUSING_CONTEXT_SHA256
    ];
  if (expected === undefined || checksum !== expected) {
    throw new Error(
      `Generated housing context ${checksumKey} changed without a versioned checksum update: received ${checksum}.`,
    );
  }
  return verifyContextMetricComparison({
    ...draft,
    snapshot: { ...draft.snapshot, sha256: checksum },
    metric: { ...draft.metric, snapshotSha256: checksum },
  });
};

export const getResearchMetroHousingContext = (
  originSlug: string,
  destinationSlug: string,
): VerifiedContextMetricComparison | null => {
  if (originSlug === destinationSlug) return null;
  if (originSlug === "los-angeles-ca" && destinationSlug === "seattle-wa") {
    return loadLosAngelesToSeattleHousingContext();
  }
  const originProfile = getSupportedResearchMetroProfile(originSlug);
  const destinationProfile = getSupportedResearchMetroProfile(destinationSlug);
  if (originProfile === null || destinationProfile === null) return null;
  return composeResearchMetroHousingContext(originProfile, destinationProfile);
};
