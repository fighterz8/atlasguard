import { describe, expect, it } from "vitest";

import { APPROVED_ACS_COMMUTE_SOURCE } from "./source-registry";
import {
  AUSTIN_RESEARCH_PLACE,
  getSupportedResearchComparisonPlace,
  getSupportedResearchPlace,
  LOS_ANGELES_RESEARCH_PLACE,
  LOS_ANGELES_TO_SEATTLE_RESEARCH_COMPARISON,
  resolveSupportedResearchComparison,
  SAN_DIEGO_RESEARCH_PLACE,
  SEATTLE_RESEARCH_PLACE,
  supportedResearchComparisons,
  supportedResearchPlaces,
} from "./supported-research-locations";

describe("supported MoveWise research locations", () => {
  it("derives selected-place and CBSA display facts from the verified registry", () => {
    expect(LOS_ANGELES_RESEARCH_PLACE).toEqual({
      slug: "los-angeles-ca",
      city: APPROVED_ACS_COMMUTE_SOURCE.geographies.origin.selectedPlace.city,
      state:
        APPROVED_ACS_COMMUTE_SOURCE.geographies.origin.selectedPlace.stateCode,
      metro: APPROVED_ACS_COMMUTE_SOURCE.geographies.origin.cbsaLabel,
      cbsaCode: APPROVED_ACS_COMMUTE_SOURCE.geographies.origin.cbsaCode,
    });
    expect(SEATTLE_RESEARCH_PLACE).toEqual({
      slug: "seattle-wa",
      city: APPROVED_ACS_COMMUTE_SOURCE.geographies.destination.selectedPlace
        .city,
      state:
        APPROVED_ACS_COMMUTE_SOURCE.geographies.destination.selectedPlace
          .stateCode,
      metro: APPROVED_ACS_COMMUTE_SOURCE.geographies.destination.cbsaLabel,
      cbsaCode: APPROVED_ACS_COMMUTE_SOURCE.geographies.destination.cbsaCode,
    });
  });

  it("publishes a frozen, duplicate-free catalog", () => {
    expect(supportedResearchPlaces.map(({ slug }) => slug)).toEqual([
      "los-angeles-ca",
      "seattle-wa",
      "austin-tx",
      "san-diego-ca",
    ]);
    expect(Object.isFrozen(supportedResearchPlaces)).toBe(true);
    expect(supportedResearchPlaces.every(Object.isFrozen)).toBe(true);
    expect(new Set(supportedResearchPlaces.map(({ slug }) => slug)).size).toBe(
      supportedResearchPlaces.length,
    );
    expect(
      new Set(supportedResearchPlaces.map(({ cbsaCode }) => cbsaCode)).size,
    ).toBe(supportedResearchPlaces.length);
    expect(
      Reflect.set(LOS_ANGELES_RESEARCH_PLACE, "slug", "mutated-place"),
    ).toBe(false);
  });

  it("looks up only known places without a caller cast", () => {
    expect(getSupportedResearchPlace("los-angeles-ca")).toBe(
      LOS_ANGELES_RESEARCH_PLACE,
    );
    expect(getSupportedResearchPlace("seattle-wa")).toBe(
      SEATTLE_RESEARCH_PLACE,
    );
    expect(getSupportedResearchPlace("austin-tx")).toBe(AUSTIN_RESEARCH_PLACE);
    expect(getSupportedResearchPlace("san-diego-ca")).toBe(
      SAN_DIEGO_RESEARCH_PLACE,
    );
    expect(getSupportedResearchPlace("portland-or")).toBeNull();
    expect(getSupportedResearchPlace("")).toBeNull();
  });

  it("resolves all 12 promoted directed comparisons", () => {
    expect(getSupportedResearchComparisonPlace("origin")).toBe(
      LOS_ANGELES_RESEARCH_PLACE,
    );
    expect(getSupportedResearchComparisonPlace("destination")).toBe(
      SEATTLE_RESEARCH_PLACE,
    );
    expect(
      resolveSupportedResearchComparison("los-angeles-ca", "seattle-wa"),
    ).toBe(LOS_ANGELES_TO_SEATTLE_RESEARCH_COMPARISON);
    expect(
      resolveSupportedResearchComparison("seattle-wa", "los-angeles-ca"),
    ).toMatchObject({
      origin: { slug: "seattle-wa" },
      destination: { slug: "los-angeles-ca" },
    });
    expect(supportedResearchComparisons).toHaveLength(12);
    expect(Object.isFrozen(supportedResearchComparisons)).toBe(true);
    expect(supportedResearchComparisons.every(Object.isFrozen)).toBe(true);
    expect(
      resolveSupportedResearchComparison("seattle-wa", "seattle-wa"),
    ).toBeNull();
    expect(
      resolveSupportedResearchComparison("portland-or", "seattle-wa"),
    ).toBeNull();
  });
});
