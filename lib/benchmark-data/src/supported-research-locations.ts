import {
  supportedResearchMetroProfiles,
  type ResearchMetroProfileSlug,
} from "./research-metro-profiles";

export type SupportedResearchPlace = Readonly<{
  slug: ResearchMetroProfileSlug;
  city: string;
  state: string;
  metro: string;
  cbsaCode: string;
}>;

const defineResearchPlace = (
  profile: (typeof supportedResearchMetroProfiles)[number],
): SupportedResearchPlace =>
  Object.freeze({
    slug: profile.metro.slug as ResearchMetroProfileSlug,
    city: profile.metro.selectedPlace.city,
    state: profile.metro.selectedPlace.stateCode,
    metro: profile.metro.label,
    cbsaCode: profile.metro.cbsaCode,
  });

export const supportedResearchPlaces = Object.freeze([
  ...supportedResearchMetroProfiles.map(defineResearchPlace),
]);

export type SupportedResearchPlaceSlug = ResearchMetroProfileSlug;

export const LOS_ANGELES_RESEARCH_PLACE = supportedResearchPlaces[0];
export const SEATTLE_RESEARCH_PLACE = supportedResearchPlaces[1];
export const AUSTIN_RESEARCH_PLACE = supportedResearchPlaces[2];
export const SAN_DIEGO_RESEARCH_PLACE = supportedResearchPlaces[3];

export const getSupportedResearchPlace = (
  slug: string,
): SupportedResearchPlace | null =>
  supportedResearchPlaces.find((place) => place.slug === slug) ?? null;

export const supportedResearchComparisons = Object.freeze(
  supportedResearchPlaces.flatMap((origin) =>
    supportedResearchPlaces.flatMap((destination) =>
      origin.slug === destination.slug
        ? []
        : [
            Object.freeze({
              id: `research.${origin.slug}-to-${destination.slug}`,
              displayLabel: `${origin.city}, ${origin.state} to ${destination.city}, ${destination.state}`,
              origin,
              destination,
            }),
          ],
    ),
  ),
);

export type SupportedResearchComparison =
  (typeof supportedResearchComparisons)[number];

export const LOS_ANGELES_TO_SEATTLE_RESEARCH_COMPARISON =
  supportedResearchComparisons.find(
    ({ origin, destination }) =>
      origin.slug === "los-angeles-ca" && destination.slug === "seattle-wa",
  )!;

export const getSupportedResearchComparisonPlace = (
  side: "origin" | "destination",
): SupportedResearchPlace => LOS_ANGELES_TO_SEATTLE_RESEARCH_COMPARISON[side];

export const resolveSupportedResearchComparison = (
  originSlug: string,
  destinationSlug: string,
): SupportedResearchComparison | null =>
  supportedResearchComparisons.find(
    ({ origin, destination }) =>
      origin.slug === originSlug && destination.slug === destinationSlug,
  ) ?? null;
