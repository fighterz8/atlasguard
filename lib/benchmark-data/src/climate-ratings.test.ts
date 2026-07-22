import { describe, expect, it } from "vitest";

import {
  CLIMATE_RATING_VERSION,
  compareResearchMetroClimateRatings,
  getResearchMetroClimateRating,
  researchMetroClimateRatings,
} from "./climate-ratings";

describe("lightweight research climate ratings", () => {
  it("defines one preference-neutral rating for each promoted metro", () => {
    expect(CLIMATE_RATING_VERSION).toBe("1.0.0");
    expect(
      researchMetroClimateRatings.map(({ metroSlug }) => metroSlug),
    ).toEqual(["los-angeles-ca", "seattle-wa", "austin-tx", "san-diego-ca"]);
    researchMetroClimateRatings.forEach((profile) => {
      expect(Object.keys(profile.traits).sort()).toEqual([
        "humidity",
        "raininess",
        "summerHeat",
        "sunshine",
        "winterCold",
      ]);
      expect(
        Object.values(profile.traits).every(
          (value) => value >= 1 && value <= 5,
        ),
      ).toBe(true);
      expect(profile.sources.length).toBeGreaterThan(0);
      expect(Object.isFrozen(profile.traits)).toBe(true);
      expect(profile).not.toHaveProperty("overallScore");
    });
  });

  it("locks obvious relative relationships instead of pretending false precision", () => {
    const losAngeles = getResearchMetroClimateRating("los-angeles-ca");
    const seattle = getResearchMetroClimateRating("seattle-wa");
    const austin = getResearchMetroClimateRating("austin-tx");
    const sanDiego = getResearchMetroClimateRating("san-diego-ca");

    expect(austin?.traits.summerHeat).toBeGreaterThan(
      losAngeles?.traits.summerHeat ?? 5,
    );
    expect(austin?.traits.summerHeat).toBeGreaterThan(
      seattle?.traits.summerHeat ?? 5,
    );
    expect(austin?.traits.summerHeat).toBeGreaterThan(
      sanDiego?.traits.summerHeat ?? 5,
    );
    expect(seattle?.traits.raininess).toBeGreaterThan(
      losAngeles?.traits.raininess ?? 5,
    );
    expect(seattle?.traits.sunshine).toBeLessThan(
      sanDiego?.traits.sunshine ?? 1,
    );
    expect(sanDiego?.traits.winterCold).toBe(1);
  });

  it("compares traits directionally without deciding whether they are good", () => {
    const comparison = compareResearchMetroClimateRatings(
      "seattle-wa",
      "austin-tx",
    );

    expect(comparison).toMatchObject({
      originSlug: "seattle-wa",
      destinationSlug: "austin-tx",
      ratingVersion: "1.0.0",
    });
    expect(comparison?.traits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          traitId: "summerHeat",
          originValue: 2,
          destinationValue: 5,
          delta: 3,
          direction: "more",
          description: "much hotter summers",
        }),
        expect.objectContaining({
          traitId: "humidity",
          delta: 0,
          direction: "similar",
        }),
      ]),
    );
    expect(comparison).not.toHaveProperty("winner");
    expect(
      compareResearchMetroClimateRatings("seattle-wa", "seattle-wa"),
    ).toBeNull();
    expect(
      compareResearchMetroClimateRatings("seattle-wa", "unknown-metro"),
    ).toBeNull();
  });
});
