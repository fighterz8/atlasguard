import type { VerifiedMetroProfile } from "@workspace/contracts";

import {
  compareResearchMetroClimateRatings,
  getResearchMetroClimateRating,
} from "./climate-ratings";
import {
  getContextProfileObservation,
  getDecisionProfileObservation,
} from "./metro-profile-comparison";
import { supportedResearchMetroProfiles } from "./research-metro-profiles";

export const INTERNAL_RESEARCH_METRO_COMPARISON_VERSION = "1.0.1" as const;

const deepFreeze = <Value>(value: Value): Readonly<Value> => {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach((nested) => deepFreeze(nested));
    Object.freeze(value);
  }
  return value;
};

const assertComparable = (
  origin: ReturnType<typeof getDecisionProfileObservation>,
  destination: ReturnType<typeof getDecisionProfileObservation>,
): void => {
  const fields = [
    "metricId",
    "definition",
    "unit",
    "observationPeriod",
  ] as const;
  fields.forEach((field) => {
    if (origin[field] !== destination[field]) {
      throw new Error(
        `Metro profiles disagree on ${origin.metricId} ${field}.`,
      );
    }
  });
  if (
    origin.source.dataset !== destination.source.dataset ||
    origin.source.publisher !== destination.source.publisher
  ) {
    throw new Error(
      `Metro profiles disagree on ${origin.metricId} source identity.`,
    );
  }
};

const assertComparableContext = (
  origin: ReturnType<typeof getContextProfileObservation>,
  destination: ReturnType<typeof getContextProfileObservation>,
): void => {
  if (
    origin.metricId !== destination.metricId ||
    origin.definition !== destination.definition ||
    origin.unit !== destination.unit ||
    origin.observationPeriod !== destination.observationPeriod ||
    origin.source.dataset !== destination.source.dataset ||
    origin.source.publisher !== destination.source.publisher
  ) {
    throw new Error(
      `Metro profiles disagree on context metric ${origin.metricId}.`,
    );
  }
};

const requiredValue = (
  profile: VerifiedMetroProfile,
  metricId: string,
  value: number | null,
): number => {
  if (value === null) {
    throw new Error(
      `Metro profile ${profile.metro.slug} lacks required value ${metricId}.`,
    );
  }
  return value;
};

const composeInternalResearchMetroComparison = (
  originProfile: VerifiedMetroProfile,
  destinationProfile: VerifiedMetroProfile,
) => {
  if (originProfile.metro.slug === destinationProfile.metro.slug) return null;

  const originCommute = getDecisionProfileObservation(
    originProfile,
    "commute.mean_minutes",
  );
  const destinationCommute = getDecisionProfileObservation(
    destinationProfile,
    "commute.mean_minutes",
  );
  assertComparable(originCommute, destinationCommute);
  const originHousing = getContextProfileObservation(
    originProfile,
    "housing.median_gross_rent",
  );
  const destinationHousing = getContextProfileObservation(
    destinationProfile,
    "housing.median_gross_rent",
  );
  assertComparableContext(originHousing, destinationHousing);
  const climate = compareResearchMetroClimateRatings(
    originProfile.metro.slug,
    destinationProfile.metro.slug,
  );
  const originClimate = getResearchMetroClimateRating(originProfile.metro.slug);
  const destinationClimate = getResearchMetroClimateRating(
    destinationProfile.metro.slug,
  );
  if (
    climate === null ||
    originClimate === null ||
    destinationClimate === null
  ) {
    throw new Error("Promoted metro lacks a lightweight climate rating.");
  }
  const originCommuteValue = requiredValue(
    originProfile,
    originCommute.metricId,
    originCommute.value,
  );
  const destinationCommuteValue = requiredValue(
    destinationProfile,
    destinationCommute.metricId,
    destinationCommute.value,
  );
  const originHousingValue = requiredValue(
    originProfile,
    originHousing.metricId,
    originHousing.value,
  );
  const destinationHousingValue = requiredValue(
    destinationProfile,
    destinationHousing.metricId,
    destinationHousing.value,
  );

  return deepFreeze({
    id: `research-metro-comparison.${originProfile.metro.slug}.to.${destinationProfile.metro.slug}.1-0-1`,
    version: INTERNAL_RESEARCH_METRO_COMPARISON_VERSION,
    admissionStatus: "research_only" as const,
    userFacingEligible: true as const,
    origin: {
      slug: originProfile.metro.slug,
      label: originProfile.metro.label,
      profileSha256: originProfile.snapshot.sha256,
    },
    destination: {
      slug: destinationProfile.metro.slug,
      label: destinationProfile.metro.label,
      profileSha256: destinationProfile.snapshot.sha256,
    },
    metrics: {
      commute: {
        metricId: originCommute.metricId,
        unit: originCommute.unit,
        originValue: originCommuteValue,
        destinationValue: destinationCommuteValue,
        deltaValue: destinationCommuteValue - originCommuteValue,
      },
      housing: {
        metricId: originHousing.metricId,
        role: "context_only" as const,
        unit: originHousing.unit,
        originValue: originHousingValue,
        destinationValue: destinationHousingValue,
        deltaValue: destinationHousingValue - originHousingValue,
      },
      climate: {
        ...climate,
        originSummary: originClimate.summary,
        destinationSummary: destinationClimate.summary,
        originSources: originClimate.sources,
        destinationSources: destinationClimate.sources,
        limitation: originClimate.limitation,
      },
    },
  });
};

export const internalResearchMetroComparisons = deepFreeze(
  supportedResearchMetroProfiles.flatMap((originProfile) =>
    supportedResearchMetroProfiles.flatMap((destinationProfile) => {
      const comparison = composeInternalResearchMetroComparison(
        originProfile,
        destinationProfile,
      );
      return comparison === null ? [] : [comparison];
    }),
  ),
);

export type InternalResearchMetroComparison =
  (typeof internalResearchMetroComparisons)[number];

export const getInternalResearchMetroComparison = (
  originSlug: string,
  destinationSlug: string,
) =>
  internalResearchMetroComparisons.find(
    (comparison) =>
      comparison.origin.slug === originSlug &&
      comparison.destination.slug === destinationSlug,
  ) ?? null;
