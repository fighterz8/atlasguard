import { describe, expect, it } from "vitest";

import { getResearchMetroMobilityGuidance } from "./research-metro-mobility-guidance";

describe("research metro mobility guidance", () => {
  it("compares commute duration and commuting-away-from-home share", () => {
    const guidance = getResearchMetroMobilityGuidance(
      "san-diego-ca",
      "austin-tx",
    );

    expect(guidance).toMatchObject({
      version: "acs1-2024-mobility-v1",
      origin: {
        displayMeanCommuteMinutes: 26.1,
        workFromHomeShareBps: 1_611,
        commuteAwayShareBps: 8_389,
      },
      destination: {
        displayMeanCommuteMinutes: 28.2,
        workFromHomeShareBps: 2_318,
        commuteAwayShareBps: 7_682,
      },
      displayCommuteDifferenceMinutes: 2.1,
      commuteAwayShareDifferenceBps: -707,
    });
    expect(guidance?.boundary).toContain("metro-level daily-life context");
    expect(guidance?.boundary).toContain("Check the actual route");
  });

  it("fails closed for unsupported or same-metro comparisons", () => {
    expect(getResearchMetroMobilityGuidance("unknown", "austin-tx")).toBeNull();
    expect(
      getResearchMetroMobilityGuidance("austin-tx", "austin-tx"),
    ).toBeNull();
  });
});
