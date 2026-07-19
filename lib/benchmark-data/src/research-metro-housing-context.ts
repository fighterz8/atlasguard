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

const VERSION = "1.0.0" as const;
const ZERO_SHA = "0".repeat(64);
const METRIC_ID = "housing.median_gross_rent";

export const RESEARCH_METRO_HOUSING_CONTEXT_SHA256 = Object.freeze({
  "los-angeles-ca:seattle-wa":
    "8becaa3c5daf2f8e40c37e220279ed09ee3b7f6ba4abb9088b6e11412dfe52eb",
  "los-angeles-ca:austin-tx":
    "25f7257e299123f0f837a3584acf5ee3c3bfc96b66a7ecc7db4ca42b63fe0a8b",
  "los-angeles-ca:san-diego-ca":
    "e4d96f7408fa5f6c88867efd90817558230fe09db3d6eaedcb1a289a6c161c6b",
  "seattle-wa:los-angeles-ca":
    "f13e2b861891a8c232a8cf62bcc4cf220a95c81c88058769227a3b13afdd2e97",
  "seattle-wa:austin-tx":
    "de17bf9d62e554082b67a25b8bac2b78e7f453fd81e9754ac55cf7ad369fff67",
  "seattle-wa:san-diego-ca":
    "17d45147f2198278442631ef10c946a5ed58399e8d1ec2a2188c1b623d1a2377",
  "austin-tx:los-angeles-ca":
    "1fae84a703220e4fc2e34d343d8904c4e87ced5758801162b218f8fa22547726",
  "austin-tx:seattle-wa":
    "ea5fd4587fb3e95636074e2c0cb34373778ac32d46ddc7535ca7bad8e7a7a584",
  "austin-tx:san-diego-ca":
    "7793e598d7bec3adb44b0083185778f6196cd1967f79f184abb53fbac1d54191",
  "san-diego-ca:los-angeles-ca":
    "e10ae25ecfa869ff9d80b7d46bfc14659509919b0d3bd3bf0dccaf581ed3cc41",
  "san-diego-ca:seattle-wa":
    "f922ee9f64b3f615cd377fe386f9f19eb17ab81c404e5c854ea3372b772a83c0",
  "san-diego-ca:austin-tx":
    "1c69abdc2991769387f8ee0717d707a22e90760c00da4d9a43621de9bea368fc",
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
    schemaVersion: VERSION,
    decisionUse: "context_only",
    interpretationBoundary: "descriptive_not_user_budget",
    snapshot: {
      id: `housing-context.${pairId}.1-0-0`,
      version: VERSION,
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
        version: VERSION,
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
      snapshotVersion: VERSION,
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
