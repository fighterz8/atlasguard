export const RESEARCH_METRO_OWNERSHIP_SOURCE = Object.freeze({
  version: "acs1-2024-owner-cost-context-v1",
  publisher: "U.S. Census Bureau",
  dataset: "2024 American Community Survey 1-year estimates",
  observationPeriod: "2024 ACS 1-year estimates",
  releasedOn: "2025-09-11",
  verifiedOn: "2026-07-21",
  tables: Object.freeze({
    ownerValue: Object.freeze({
      tableId: "B25077",
      sourceUrl:
        "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25077.dat",
      artifactSha256:
        "27120d5d8a5fd1c91619e86dad921179c8ae170d1fa5ee33ec357da4528c7cb3",
    }),
    selectedOwnerCosts: Object.freeze({
      tableId: "B25088",
      sourceUrl:
        "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25088.dat",
      artifactSha256:
        "d0513f61f78c05ba9feb4750ee017ab02d6cce47033b707be69331a1546b9fa6",
    }),
  }),
  metros: Object.freeze({
    "los-angeles-ca": Object.freeze({
      geoId: "310M700US31080",
      medianOwnerOccupiedValueDollars: 908_500,
      medianOwnerOccupiedValueMarginOfError90Dollars: 4_270,
      monthlySelectedOwnerCostsWithMortgageDollars: 3_255,
      monthlySelectedOwnerCostsWithMortgageMarginOfError90Dollars: 27,
      monthlySelectedOwnerCostsWithoutMortgageDollars: 896,
      monthlySelectedOwnerCostsWithoutMortgageMarginOfError90Dollars: 12,
    }),
    "seattle-wa": Object.freeze({
      geoId: "310M700US42660",
      medianOwnerOccupiedValueDollars: 743_000,
      medianOwnerOccupiedValueMarginOfError90Dollars: 6_997,
      monthlySelectedOwnerCostsWithMortgageDollars: 2_989,
      monthlySelectedOwnerCostsWithMortgageMarginOfError90Dollars: 36,
      monthlySelectedOwnerCostsWithoutMortgageDollars: 1_007,
      monthlySelectedOwnerCostsWithoutMortgageMarginOfError90Dollars: 18,
    }),
    "austin-tx": Object.freeze({
      geoId: "310M700US12420",
      medianOwnerOccupiedValueDollars: 482_800,
      medianOwnerOccupiedValueMarginOfError90Dollars: 6_029,
      monthlySelectedOwnerCostsWithMortgageDollars: 2_610,
      monthlySelectedOwnerCostsWithMortgageMarginOfError90Dollars: 51,
      monthlySelectedOwnerCostsWithoutMortgageDollars: 931,
      monthlySelectedOwnerCostsWithoutMortgageMarginOfError90Dollars: 22,
    }),
    "san-diego-ca": Object.freeze({
      geoId: "310M700US41740",
      medianOwnerOccupiedValueDollars: 914_700,
      medianOwnerOccupiedValueMarginOfError90Dollars: 6_686,
      monthlySelectedOwnerCostsWithMortgageDollars: 3_243,
      monthlySelectedOwnerCostsWithMortgageMarginOfError90Dollars: 42,
      monthlySelectedOwnerCostsWithoutMortgageDollars: 892,
      monthlySelectedOwnerCostsWithoutMortgageMarginOfError90Dollars: 20,
    }),
  }),
});

type SupportedOwnershipMetroSlug =
  keyof typeof RESEARCH_METRO_OWNERSHIP_SOURCE.metros;

type OwnershipRecord =
  (typeof RESEARCH_METRO_OWNERSHIP_SOURCE.metros)[SupportedOwnershipMetroSlug];

export type ResearchMetroOwnershipGuidance = Readonly<{
  version: typeof RESEARCH_METRO_OWNERSHIP_SOURCE.version;
  role: "Context only";
  origin: OwnershipRecord;
  destination: OwnershipRecord;
  ownerValueDifferenceDollars: number;
  monthlyOwnerCostWithMortgageDifferenceDollars: number;
  ownerValueDirection: "lower" | "similar" | "higher";
  ownerCostDirection: "lower" | "similar" | "higher";
  summary: string;
  boundary: string;
  source: Readonly<{
    publisher: string;
    ownerValueTableId: string;
    selectedOwnerCostsTableId: string;
    observationPeriod: string;
  }>;
}>;

const directionFromDifference = (
  differenceDollars: number,
  similarThresholdDollars: number,
): ResearchMetroOwnershipGuidance["ownerValueDirection"] => {
  if (Math.abs(differenceDollars) <= similarThresholdDollars) {
    return "similar";
  }
  return differenceDollars < 0 ? "lower" : "higher";
};

export const getResearchMetroOwnershipGuidance = (
  originSlug: string,
  destinationSlug: string,
): ResearchMetroOwnershipGuidance | null => {
  const origin =
    RESEARCH_METRO_OWNERSHIP_SOURCE.metros[
      originSlug as SupportedOwnershipMetroSlug
    ];
  const destination =
    RESEARCH_METRO_OWNERSHIP_SOURCE.metros[
      destinationSlug as SupportedOwnershipMetroSlug
    ];
  if (
    origin === undefined ||
    destination === undefined ||
    originSlug === destinationSlug
  ) {
    return null;
  }

  const ownerValueDifferenceDollars =
    destination.medianOwnerOccupiedValueDollars -
    origin.medianOwnerOccupiedValueDollars;
  const monthlyOwnerCostWithMortgageDifferenceDollars =
    destination.monthlySelectedOwnerCostsWithMortgageDollars -
    origin.monthlySelectedOwnerCostsWithMortgageDollars;
  const ownerValueDirection = directionFromDifference(
    ownerValueDifferenceDollars,
    10_000,
  );
  const ownerCostDirection = directionFromDifference(
    monthlyOwnerCostWithMortgageDifferenceDollars,
    50,
  );

  return Object.freeze({
    version: RESEARCH_METRO_OWNERSHIP_SOURCE.version,
    role: "Context only",
    origin,
    destination,
    ownerValueDifferenceDollars,
    monthlyOwnerCostWithMortgageDifferenceDollars,
    ownerValueDirection,
    ownerCostDirection,
    summary:
      ownerValueDirection === "similar" && ownerCostDirection === "similar"
        ? "ACS ownership context is similar between these metros."
        : `ACS ownership context shows ${ownerValueDirection} owner-occupied home values and ${ownerCostDirection} selected monthly owner costs with a mortgage in the destination metro.`,
    boundary:
      "Use this as a buying-later checkpoint. A real buying plan still needs price range, down payment, rates, taxes, insurance, and lender-specific approval.",
    source: Object.freeze({
      publisher: RESEARCH_METRO_OWNERSHIP_SOURCE.publisher,
      ownerValueTableId:
        RESEARCH_METRO_OWNERSHIP_SOURCE.tables.ownerValue.tableId,
      selectedOwnerCostsTableId:
        RESEARCH_METRO_OWNERSHIP_SOURCE.tables.selectedOwnerCosts.tableId,
      observationPeriod: RESEARCH_METRO_OWNERSHIP_SOURCE.observationPeriod,
    }),
  });
};
