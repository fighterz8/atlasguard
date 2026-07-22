import { describe, expect, it } from "vitest";

import {
  getInternalResearchMetroComparison,
  internalResearchMetroComparisons,
} from "./research-metro-comparisons";
import {
  resolveSupportedResearchComparison,
  supportedResearchPlaces,
} from "./supported-research-locations";

describe("internal four-metro comparisons", () => {
  it("generates all 12 directed pairs from four promoted profiles", () => {
    expect(internalResearchMetroComparisons).toHaveLength(12);
    expect(
      new Set(internalResearchMetroComparisons.map(({ id }) => id)).size,
    ).toBe(12);
    internalResearchMetroComparisons.forEach((comparison) => {
      expect(comparison.origin.slug).not.toBe(comparison.destination.slug);
      expect(comparison.admissionStatus).toBe("research_only");
      expect(comparison.userFacingEligible).toBe(true);
      expect(Object.isFrozen(comparison.metrics.climate.traits)).toBe(true);
    });
  });

  it("composes exact profile facts with coarse climate differences", () => {
    const comparison = getInternalResearchMetroComparison(
      "los-angeles-ca",
      "austin-tx",
    );

    expect(comparison).toMatchObject({
      id: "research-metro-comparison.los-angeles-ca.to.austin-tx.1-0-1",
      origin: {
        slug: "los-angeles-ca",
        profileSha256:
          "f7490594b6f53de0b62f5c9af115e700a4300118fc69abd0f870a328dd350d96",
      },
      destination: {
        slug: "austin-tx",
        profileSha256:
          "1f3196ab46a4c78f0270f7de7156c993eec4abb08e1cdb16ec5e2ec66c0bb0a0",
      },
      metrics: {
        commute: {
          metricId: "commute.mean_minutes",
          unit: "minutes",
          destinationValue: 28.209737586235,
        },
        housing: {
          metricId: "housing.median_gross_rent",
          role: "context_only",
          unit: "usd_cents",
          originValue: 211_400,
          destinationValue: 178_400,
          deltaValue: -33_000,
        },
        climate: {
          ratingVersion: "1.0.0",
          originSlug: "los-angeles-ca",
          destinationSlug: "austin-tx",
        },
      },
    });
    expect(comparison?.metrics.commute.deltaValue).toBeCloseTo(
      -2.4456932485,
      9,
    );
    expect(
      comparison?.metrics.climate.traits.find(
        ({ traitId }) => traitId === "summerHeat",
      ),
    ).toMatchObject({ delta: 1, description: "slightly hotter summers" });
    expect(JSON.stringify(comparison)).not.toMatch(
      /winner|recommendation|overallScore|MoveWiseScore/,
    );
  });

  it("keeps reverse comparisons arithmetically symmetric", () => {
    const forward = getInternalResearchMetroComparison(
      "seattle-wa",
      "san-diego-ca",
    );
    const reverse = getInternalResearchMetroComparison(
      "san-diego-ca",
      "seattle-wa",
    );
    expect(forward).not.toBeNull();
    expect(reverse).not.toBeNull();

    expect(forward!.metrics.commute.deltaValue).toBeCloseTo(
      -reverse!.metrics.commute.deltaValue,
      12,
    );
    expect(forward!.metrics.housing.deltaValue).toBe(
      -reverse!.metrics.housing.deltaValue,
    );
    forward!.metrics.climate.traits.forEach((trait) => {
      const reversedTrait = reverse!.metrics.climate.traits.find(
        ({ traitId }) => traitId === trait.traitId,
      );
      expect(reversedTrait?.delta).toBe(trait.delta === 0 ? 0 : -trait.delta);
    });
  });

  it("fails closed for same or unknown metros and exposes only the cohort", () => {
    expect(
      getInternalResearchMetroComparison("austin-tx", "austin-tx"),
    ).toBeNull();
    expect(
      getInternalResearchMetroComparison("austin-tx", "unknown-metro"),
    ).toBeNull();
    expect(supportedResearchPlaces.map(({ slug }) => slug)).toEqual([
      "los-angeles-ca",
      "seattle-wa",
      "austin-tx",
      "san-diego-ca",
    ]);
    expect(
      resolveSupportedResearchComparison("austin-tx", "seattle-wa"),
    ).toMatchObject({
      origin: { slug: "austin-tx" },
      destination: { slug: "seattle-wa" },
    });
  });
});
