import { describe, expect, it } from "vitest";

import {
  RESEARCH_METRO_RENT_SOURCE,
  getResearchMetroRentGuidance,
} from "./research-metro-rent-guidance";

describe("research metro rent guidance", () => {
  it("compares the requested bedroom count instead of a generic metro rent", () => {
    const guidance = getResearchMetroRentGuidance(
      "los-angeles-ca",
      "seattle-wa",
      "4_plus",
    );

    expect(guidance).toMatchObject({
      version: "acs1-2024-rent-by-bedrooms-v1",
      bedroomNeed: "4_plus",
      rentCategoryLabel: "4-bedroom median gross rent",
      stockCategoryLabel: "4+ bedroom renter-occupied homes",
      origin: {
        monthlyGrossRentDollars: 3_083,
        marginOfError90Dollars: 113,
        renterStockShareBps: 548,
      },
      destination: {
        monthlyGrossRentDollars: 3_068,
        marginOfError90Dollars: 129,
        renterStockShareBps: 717,
      },
      monthlyDifferenceDollars: -15,
      renterStockShareDifferenceBps: 169,
    });
    expect(guidance?.boundary).toContain("occupied rental stock");
    expect(guidance?.boundary).toContain("not listing availability");
  });

  it("binds the official tables and fails closed for unsupported inputs", () => {
    expect(RESEARCH_METRO_RENT_SOURCE).toMatchObject({
      publisher: "U.S. Census Bureau",
      observationPeriod: "2024 ACS 1-year estimates",
      tables: {
        rentByBedrooms: {
          tableId: "B25031",
          artifactSha256:
            "d8283555516e0a757a51aa8ea6164c25c58e54ba88c5e339e964160633907a80",
        },
        tenureByBedrooms: {
          tableId: "B25042",
          artifactSha256:
            "b0165ee0b182c92a44b8ed05251a43564c4c639f1bc424ada7124d721bd2e0c3",
        },
      },
    });
    expect(
      getResearchMetroRentGuidance("unknown", "seattle-wa", "2"),
    ).toBeNull();
    expect(
      getResearchMetroRentGuidance(
        "los-angeles-ca",
        "seattle-wa",
        "unknown",
      ),
    ).toBeNull();
  });
});
