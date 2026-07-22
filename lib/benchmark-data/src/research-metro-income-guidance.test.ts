import { describe, expect, it } from "vitest";

import {
  RESEARCH_METRO_INCOME_SOURCE,
  getResearchMetroIncomeGuidance,
} from "./research-metro-income-guidance";

describe("research metro income guidance", () => {
  it("translates current take-home by official metro household-income indices", () => {
    const guidance = getResearchMetroIncomeGuidance(
      "los-angeles-ca",
      "seattle-wa",
      5_000,
    );

    expect(guidance).toMatchObject({
      version: "acs1-2024-median-household-income-v1",
      currentMonthlyTakeHomeDollars: 5_000,
      suggestedMonthlyTakeHomeDollars: 5_829,
      plausibleMonthlyTakeHomeRangeDollars: { low: 5_666, high: 5_995 },
      origin: {
        annualMedianHouseholdIncomeDollars: 96_405,
        nationalIndexBps: 11_814,
      },
      destination: {
        annualMedianHouseholdIncomeDollars: 112_388,
        nationalIndexBps: 13_772,
      },
      national: { annualMedianHouseholdIncomeDollars: 81_604 },
      destinationToOriginRatioBps: 11_658,
      direction: "higher",
      role: "Context only",
    });
    expect(guidance.summary).toContain(
      "metro household-income context is higher",
    );
    expect(guidance.boundary).toContain("editable starting point");
    expect(guidance.laborMarketBoundary).toContain(
      "Confirm job, remote-work, or occupation-specific pay",
    );
  });

  it("binds the frozen public source and fails closed for unsupported input", () => {
    expect(RESEARCH_METRO_INCOME_SOURCE).toMatchObject({
      publisher: "U.S. Census Bureau",
      tableId: "B19013",
      observationPeriod: "2024 ACS 1-year estimates",
      artifactSha256:
        "f78748dc0221551890494e08d8239d7aecbfff9777e96a18d24f5df6a570cd86",
    });
    expect(
      getResearchMetroIncomeGuidance("unknown", "seattle-wa", 5_000),
    ).toBeNull();
    expect(
      getResearchMetroIncomeGuidance(
        "los-angeles-ca",
        "seattle-wa",
        Number.NaN,
      ),
    ).toBeNull();
  });
});
