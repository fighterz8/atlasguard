import { APPROVED_ACS_COMMUTE_SOURCE } from "./source-registry";

type ApprovedGeography =
  (typeof APPROVED_ACS_COMMUTE_SOURCE.geographies)[keyof typeof APPROVED_ACS_COMMUTE_SOURCE.geographies];

const defineResearchPlace = <
  const Slug extends string,
  const Geography extends ApprovedGeography,
>(
  slug: Slug,
  geography: Geography,
) =>
  Object.freeze({
    slug,
    city: geography.selectedPlace.city,
    state: geography.selectedPlace.stateCode,
    metro: geography.cbsaLabel,
    cbsaCode: geography.cbsaCode,
  });

export const LOS_ANGELES_RESEARCH_PLACE = defineResearchPlace(
  "los-angeles-ca",
  APPROVED_ACS_COMMUTE_SOURCE.geographies.origin,
);

export const SEATTLE_RESEARCH_PLACE = defineResearchPlace(
  "seattle-wa",
  APPROVED_ACS_COMMUTE_SOURCE.geographies.destination,
);

export const supportedResearchPlaces = Object.freeze([
  LOS_ANGELES_RESEARCH_PLACE,
  SEATTLE_RESEARCH_PLACE,
] as const);

export type SupportedResearchPlace = (typeof supportedResearchPlaces)[number];
export type SupportedResearchPlaceSlug = SupportedResearchPlace["slug"];

export const getSupportedResearchPlace = (
  slug: string,
): SupportedResearchPlace | null =>
  supportedResearchPlaces.find((place) => place.slug === slug) ?? null;

export const LOS_ANGELES_TO_SEATTLE_RESEARCH_COMPARISON = Object.freeze({
  id: "research.los-angeles-ca-to-seattle-wa",
  displayLabel: `${LOS_ANGELES_RESEARCH_PLACE.city}, ${LOS_ANGELES_RESEARCH_PLACE.state} to ${SEATTLE_RESEARCH_PLACE.city}, ${SEATTLE_RESEARCH_PLACE.state}`,
  origin: LOS_ANGELES_RESEARCH_PLACE,
  destination: SEATTLE_RESEARCH_PLACE,
});

export type SupportedResearchComparison =
  typeof LOS_ANGELES_TO_SEATTLE_RESEARCH_COMPARISON;

export const getSupportedResearchComparisonPlace = (
  side: "origin" | "destination",
): SupportedResearchPlace => LOS_ANGELES_TO_SEATTLE_RESEARCH_COMPARISON[side];

export const resolveSupportedResearchComparison = (
  originSlug: string,
  destinationSlug: string,
): SupportedResearchComparison | null =>
  originSlug === LOS_ANGELES_TO_SEATTLE_RESEARCH_COMPARISON.origin.slug &&
  destinationSlug ===
    LOS_ANGELES_TO_SEATTLE_RESEARCH_COMPARISON.destination.slug
    ? LOS_ANGELES_TO_SEATTLE_RESEARCH_COMPARISON
    : null;
