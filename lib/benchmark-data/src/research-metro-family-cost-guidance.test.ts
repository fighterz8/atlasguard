import { describe, expect, it } from "vitest";

import { getResearchMetroFamilyCostGuidance } from "./research-metro-family-cost-guidance";

describe("research metro family cost guidance", () => {
  it("turns regional price parity into household operating-cost context", () => {
    const guidance = getResearchMetroFamilyCostGuidance(
      "san-diego-ca",
      "austin-tx",
      2_100,
    );

    expect(guidance).toMatchObject({
      version: "bea-2024-family-cost-context-v1",
      role: "Context only",
      originMonthlyExpensesDollars: 2_100,
      destinationMonthlyExpensesDollars: 1_896,
      monthlyDifferenceDollars: -204,
      direction: "lower",
      source: {
        publisher: "U.S. Bureau of Economic Analysis",
        tableId: "MARPP",
        observationPeriod: "2024",
      },
    });
    expect(guidance?.summary).toContain("family operating costs");
    expect(guidance?.childcareBoundary).toContain("not childcare-price data");
    expect(guidance?.childcareBoundary).toContain("not scored");
  });

  it("fails closed when expense guidance is unavailable", () => {
    expect(
      getResearchMetroFamilyCostGuidance("san-diego-ca", "unknown", 2_100),
    ).toBeNull();
    expect(
      getResearchMetroFamilyCostGuidance("san-diego-ca", "austin-tx", 0),
    ).toBeNull();
  });
});
