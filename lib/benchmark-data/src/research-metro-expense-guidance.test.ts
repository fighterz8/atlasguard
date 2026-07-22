import { describe, expect, it } from "vitest";

import {
  RESEARCH_METRO_EXPENSE_SOURCE,
  getResearchMetroExpenseGuidance,
} from "./research-metro-expense-guidance";

describe("research metro expense guidance", () => {
  it("translates current non-housing spending with official metro price levels", () => {
    const guidance = getResearchMetroExpenseGuidance(
      "los-angeles-ca",
      "seattle-wa",
      1_500,
    );

    expect(guidance).toMatchObject({
      version: "bea-2024-metro-rpp-v1",
      currentMonthlyExpensesDollars: 1_500,
      suggestedMonthlyExpensesDollars: 1_468,
      origin: { allItemsRpp: 113.566 },
      destination: { allItemsRpp: 111.133 },
      destinationToOriginRatioBps: 9_786,
    });
    expect(guidance.boundary).toContain("broad price-level proxy");
    expect(guidance.boundary).toContain("editable");
  });

  it("binds the official BEA release and fails closed for bad input", () => {
    expect(RESEARCH_METRO_EXPENSE_SOURCE).toMatchObject({
      publisher: "U.S. Bureau of Economic Analysis",
      tableId: "MARPP",
      lineCode: 1,
      observationPeriod: "2024",
      artifactSha256:
        "5dbf2e6ac2af222cc9abc205586c9b480344d89392752eb689c3ec823a34c83e",
    });
    expect(
      getResearchMetroExpenseGuidance("los-angeles-ca", "unknown", 1_500),
    ).toBeNull();
    expect(
      getResearchMetroExpenseGuidance(
        "los-angeles-ca",
        "seattle-wa",
        Number.NaN,
      ),
    ).toBeNull();
  });
});
