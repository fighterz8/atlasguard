import {
  calculateContextMetricComparisonChecksum,
  verifyContextMetricComparison,
} from "@workspace/contracts";
import type {
  ContextMetricComparison,
  VerifiedContextMetricComparison,
  VerifiedMetroProfile,
} from "@workspace/contracts";

import {
  cloneJson,
  composeProfileSourceArtifacts,
  getContextProfileObservation,
  getProfileRawSnapshot,
} from "./metro-profile-comparison";
import {
  loadLosAngelesResearchMetroProfile,
  loadSeattleResearchMetroProfile,
} from "./research-metro-profiles";
import type { VerifiedRawHousingSnapshot } from "./raw-housing-snapshot";

const COMPARISON_VERSION = "1.0.0" as const;
const ZERO_SHA = "0".repeat(64);
const RAW_SNAPSHOT_ID = "acs1.2024.median-gross-rent.la-seattle.raw";
const METRIC_ID = "housing.median_gross_rent";
const SOURCE_ARTIFACT_ORDER = [
  "acs1.2024.geographies",
  "acs1.2024.b25064",
] as const;

export const LOS_ANGELES_SEATTLE_HOUSING_CONTEXT_SHA256 =
  "8becaa3c5daf2f8e40c37e220279ed09ee3b7f6ba4abb9088b6e11412dfe52eb";

export const promoteLosAngelesToSeattleHousingContextFromProfiles = (
  originProfile: VerifiedMetroProfile,
  destinationProfile: VerifiedMetroProfile,
): VerifiedContextMetricComparison => {
  const origin = getContextProfileObservation(originProfile, METRIC_ID);
  const destination = getContextProfileObservation(
    destinationProfile,
    METRIC_ID,
  );
  if (
    origin.value === null ||
    destination.value === null ||
    origin.quality.marginOfError === null ||
    destination.quality.marginOfError === null ||
    origin.source.termsUrl === null
  ) {
    throw new Error("Housing context profiles lack complete ACS values.");
  }
  const originRawSnapshot = getProfileRawSnapshot(
    originProfile,
    RAW_SNAPSHOT_ID,
  );
  const destinationRawSnapshot = getProfileRawSnapshot(
    destinationProfile,
    RAW_SNAPSHOT_ID,
  );
  if (originRawSnapshot.sha256 !== destinationRawSnapshot.sha256) {
    throw new Error("Metro profiles disagree on the housing raw snapshot.");
  }
  const artifacts = composeProfileSourceArtifacts(
    [originProfile, destinationProfile],
    RAW_SNAPSHOT_ID,
  );
  const orderedArtifacts = SOURCE_ARTIFACT_ORDER.map((id) => {
    const artifact = artifacts.find((candidate) => candidate.id === id);
    if (artifact === undefined) {
      throw new Error(`Metro profiles lack housing artifact ${id}.`);
    }
    return artifact;
  });
  const metricArtifact = orderedArtifacts[1];
  const draft: ContextMetricComparison = {
    schemaVersion: "1.0.0",
    decisionUse: "context_only",
    interpretationBoundary: "descriptive_not_user_budget",
    snapshot: {
      id: "acs1.2024.median-gross-rent.la-seattle",
      version: COMPARISON_VERSION,
      sha256: ZERO_SHA,
      admissionStatus: "research_only",
      rawSnapshot: cloneJson(originRawSnapshot),
      sourceArtifacts: orderedArtifacts,
      derivation: { id: "acs.usd-to-cents", version: "1.0.0" },
      delineationVersion: "OMB Bulletin 23-01 / Census July 2023",
      verifiedOn: origin.verifiedOn,
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
      verifiedOn: origin.verifiedOn,
      geographies: {
        origin: cloneJson(origin.geography),
        destination: cloneJson(destination.geography),
      },
      snapshotVersion: COMPARISON_VERSION,
      snapshotSha256: ZERO_SHA,
    },
    caveats: [
      "This is a 2024 area median, not current asking rent, a listing, or a forecast.",
      "It is not substituted into the illustrative financial scenario or the decision condition.",
      "A metro median cannot describe a specific neighborhood, unit type, or household's expected housing cost.",
    ],
  };

  const checksum = calculateContextMetricComparisonChecksum(draft);
  if (checksum !== LOS_ANGELES_SEATTLE_HOUSING_CONTEXT_SHA256) {
    throw new Error(
      `Promoted LA-to-Seattle housing context changed without a versioned checksum update: received ${checksum}.`,
    );
  }
  return verifyContextMetricComparison({
    ...draft,
    snapshot: { ...draft.snapshot, sha256: checksum },
    metric: { ...draft.metric, snapshotSha256: checksum },
  });
};

/** Compatibility wrapper for the original raw-snapshot promotion API. */
export const promoteLosAngelesToSeattleHousingContext = (
  snapshot: VerifiedRawHousingSnapshot,
): VerifiedContextMetricComparison => {
  const originProfile = loadLosAngelesResearchMetroProfile();
  const destinationProfile = loadSeattleResearchMetroProfile();
  const profileSnapshot = getProfileRawSnapshot(originProfile, snapshot.id);
  if (profileSnapshot.sha256 !== snapshot.sha256) {
    throw new Error("Raw housing snapshot differs from the promoted profiles.");
  }
  return promoteLosAngelesToSeattleHousingContextFromProfiles(
    originProfile,
    destinationProfile,
  );
};

export const loadLosAngelesToSeattleHousingContext = () =>
  promoteLosAngelesToSeattleHousingContextFromProfiles(
    loadLosAngelesResearchMetroProfile(),
    loadSeattleResearchMetroProfile(),
  );
