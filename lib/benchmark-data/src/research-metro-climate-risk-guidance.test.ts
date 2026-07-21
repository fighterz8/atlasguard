import { describe, expect, it } from "vitest";

import { getResearchMetroClimateRiskGuidance } from "./research-metro-climate-risk-guidance";

describe("research metro climate risk guidance", () => {
  it("turns FEMA NRI anchor-county ratings into context-only guidance", () => {
    const guidance = getResearchMetroClimateRiskGuidance(
      "san-diego-ca",
      "austin-tx",
    );

    expect(guidance).toMatchObject({
      version: "fema-nri-county-v1.20-climate-risk-context-v1",
      role: "Context only",
      origin: {
        anchorCounty: "San Diego County, CA",
        stcofips: "06073",
        overallRiskRating: "Very High",
        expectedAnnualLossRating: "Very High",
        communityResilienceRating: "Very Low",
      },
      destination: {
        anchorCounty: "Travis County, TX",
        stcofips: "48453",
        overallRiskRating: "Relatively High",
        expectedAnnualLossRating: "Relatively High",
        communityResilienceRating: "Relatively High",
      },
      riskDirection: "lower",
      destinationProminentHazards: [
        { id: "tornado", label: "Tornado", rating: "Very High" },
        { id: "heatWave", label: "Heat wave", rating: "Relatively High" },
        {
          id: "inlandFlooding",
          label: "Inland flooding",
          rating: "Relatively High",
        },
        { id: "strongWind", label: "Strong wind", rating: "Relatively High" },
      ],
      source: {
        publisher: "Federal Emergency Management Agency",
        dataset: "National Risk Index Counties",
        datasetVersion: "December 2025 v1.20",
      },
    });
    expect(guidance?.summary).toContain("county-level baseline risk");
    expect(guidance?.boundary).toContain("not a metro-wide risk model");
    expect(guidance?.boundary).toContain("not a neighborhood or parcel rating");
    expect(guidance?.boundary).toContain("not a scored MoveWise rule");
  });

  it("treats close county-level risk scores as similar", () => {
    const guidance = getResearchMetroClimateRiskGuidance(
      "los-angeles-ca",
      "seattle-wa",
    );

    expect(guidance?.riskDirection).toBe("similar");
    expect(guidance?.summary).toContain("similar");
  });

  it("fails closed when climate risk evidence is unavailable", () => {
    expect(
      getResearchMetroClimateRiskGuidance("san-diego-ca", "unknown"),
    ).toBeNull();
    expect(
      getResearchMetroClimateRiskGuidance("san-diego-ca", "san-diego-ca"),
    ).toBeNull();
  });
});
