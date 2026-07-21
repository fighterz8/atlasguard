import { describe, expect, it } from "vitest";

import { getResearchMetroOwnershipGuidance } from "./research-metro-ownership-guidance";

describe("research metro ownership guidance", () => {
  it("turns ACS owner value and selected owner costs into context-only guidance", () => {
    const guidance = getResearchMetroOwnershipGuidance(
      "san-diego-ca",
      "austin-tx",
    );

    expect(guidance).toMatchObject({
      version: "acs1-2024-owner-cost-context-v1",
      role: "Context only",
      origin: {
        geoId: "310M700US41740",
        medianOwnerOccupiedValueDollars: 914_700,
        monthlySelectedOwnerCostsWithMortgageDollars: 3_243,
      },
      destination: {
        geoId: "310M700US12420",
        medianOwnerOccupiedValueDollars: 482_800,
        monthlySelectedOwnerCostsWithMortgageDollars: 2_610,
      },
      ownerValueDifferenceDollars: -431_900,
      monthlyOwnerCostWithMortgageDifferenceDollars: -633,
      ownerValueDirection: "lower",
      ownerCostDirection: "lower",
      source: {
        publisher: "U.S. Census Bureau",
        ownerValueTableId: "B25077",
        selectedOwnerCostsTableId: "B25088",
        observationPeriod: "2024 ACS 1-year estimates",
      },
    });
    expect(guidance?.summary).toContain("ownership context");
    expect(guidance?.boundary).toContain("not a mortgage quote");
    expect(guidance?.boundary).toContain("not a purchase budget");
    expect(guidance?.boundary).toContain("approved ownership rules");
  });

  it("fails closed when ownership evidence is unavailable", () => {
    expect(
      getResearchMetroOwnershipGuidance("san-diego-ca", "unknown"),
    ).toBeNull();
    expect(
      getResearchMetroOwnershipGuidance("san-diego-ca", "san-diego-ca"),
    ).toBeNull();
  });
});
