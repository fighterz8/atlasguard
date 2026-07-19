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
      expect(comparison.userFacingEligible).toBe(false);
      expect(Object.isFrozen(comparison.metrics.climate.traits)).toBe(true);
    });
  });

  it("composes exact profile facts with coarse climate differences", () => {
    const comparison = getInternalResearchMetroComparison(
      "los-angeles-ca",
      "austin-tx",
    );

    expect(comparison).toMatchObject({
      id: "research-metro-comparison.los-angeles-ca.to.austin-tx.1-0-0",
      origin: {
        slug: "los-angeles-ca",
        profileSha256:
          "a7cbf056c5f3eb929b9a9bf67faa43159281afee2d32b5877ad2c237955aac90",
      },
      destination: {
        slug: "austin-tx",
        profileSha256:
          "ed630549170789e57f5215d06609db9e32a57b88df026933c66a91f5c64c9dc1",
      },
      metrics: {
        commute: {
          metricId: "commute.mean_minutes",
          unit: "minutes",
          destinationValue: 28.20973758623548,
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

  it("fails closed for same or unknown metros and does not expand public support", () => {
    expect(
      getInternalResearchMetroComparison("austin-tx", "austin-tx"),
    ).toBeNull();
    expect(
      getInternalResearchMetroComparison("austin-tx", "unknown-metro"),
    ).toBeNull();
    expect(supportedResearchPlaces.map(({ slug }) => slug)).toEqual([
      "los-angeles-ca",
      "seattle-wa",
    ]);
    expect(
      resolveSupportedResearchComparison("austin-tx", "seattle-wa"),
    ).toBeNull();
  });
});
