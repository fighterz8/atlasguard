export const RESEARCH_METRO_INCOME_SOURCE = Object.freeze({
  version: "acs1-2024-median-household-income-v1",
  publisher: "U.S. Census Bureau",
  dataset: "2024 American Community Survey 1-year estimates",
  tableId: "B19013",
  observationPeriod: "2024 ACS 1-year estimates",
  releasedOn: "2025-09-11",
  verifiedOn: "2026-07-20",
  sourceUrl:
    "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b19013.dat",
  termsUrl:
    "https://www.census.gov/data/developers/about/terms-of-service.html",
  artifactSha256:
    "f78748dc0221551890494e08d8239d7aecbfff9777e96a18d24f5df6a570cd86",
  national: Object.freeze({
    geoId: "0100000US",
    annualMedianHouseholdIncomeDollars: 81_604,
    marginOfError90Dollars: 128,
  }),
  metros: Object.freeze({
    "los-angeles-ca": Object.freeze({
      geoId: "310M700US31080",
      annualMedianHouseholdIncomeDollars: 96_405,
      marginOfError90Dollars: 980,
    }),
    "seattle-wa": Object.freeze({
      geoId: "310M700US42660",
      annualMedianHouseholdIncomeDollars: 112_388,
      marginOfError90Dollars: 2_026,
    }),
    "austin-tx": Object.freeze({
      geoId: "310M700US12420",
      annualMedianHouseholdIncomeDollars: 99_897,
      marginOfError90Dollars: 2_027,
    }),
    "san-diego-ca": Object.freeze({
      geoId: "310M700US41740",
      annualMedianHouseholdIncomeDollars: 109_132,
      marginOfError90Dollars: 1_813,
    }),
  }),
});

type SupportedIncomeMetroSlug =
  keyof typeof RESEARCH_METRO_INCOME_SOURCE.metros;

const roundRatio = (numerator: number, denominator: number): number =>
  Math.round(numerator / denominator);

const directionFromRatio = (
  destinationToOriginRatioBps: number,
): ResearchMetroIncomeGuidance["direction"] => {
  if (Math.abs(destinationToOriginRatioBps - 10_000) < 100) return "similar";
  return destinationToOriginRatioBps < 10_000 ? "lower" : "higher";
};

const withNationalIndex = (
  value: (typeof RESEARCH_METRO_INCOME_SOURCE.metros)[SupportedIncomeMetroSlug],
) => ({
  ...value,
  nationalIndexBps: roundRatio(
    value.annualMedianHouseholdIncomeDollars * 10_000,
    RESEARCH_METRO_INCOME_SOURCE.national.annualMedianHouseholdIncomeDollars,
  ),
});

export type ResearchMetroIncomeGuidance = Readonly<{
  version: typeof RESEARCH_METRO_INCOME_SOURCE.version;
  role: "Context only";
  currentMonthlyTakeHomeDollars: number;
  suggestedMonthlyTakeHomeDollars: number;
  plausibleMonthlyTakeHomeRangeDollars: Readonly<{
    low: number;
    high: number;
  }>;
  destinationToOriginRatioBps: number;
  direction: "lower" | "similar" | "higher";
  summary: string;
  origin: ReturnType<typeof withNationalIndex>;
  destination: ReturnType<typeof withNationalIndex>;
  national: typeof RESEARCH_METRO_INCOME_SOURCE.national;
  method: string;
  boundary: string;
  laborMarketBoundary: string;
  source: Readonly<{
    publisher: string;
    tableId: string;
    sourceUrl: string;
    observationPeriod: string;
    artifactSha256: string;
  }>;
}>;

export const getResearchMetroIncomeGuidance = (
  originSlug: string,
  destinationSlug: string,
  currentMonthlyTakeHomeDollars: number,
): ResearchMetroIncomeGuidance | null => {
  const origin =
    RESEARCH_METRO_INCOME_SOURCE.metros[originSlug as SupportedIncomeMetroSlug];
  const destination =
    RESEARCH_METRO_INCOME_SOURCE.metros[
      destinationSlug as SupportedIncomeMetroSlug
    ];
  if (
    origin === undefined ||
    destination === undefined ||
    originSlug === destinationSlug ||
    !Number.isFinite(currentMonthlyTakeHomeDollars) ||
    currentMonthlyTakeHomeDollars <= 0
  ) {
    return null;
  }

  const estimate = roundRatio(
    currentMonthlyTakeHomeDollars *
      destination.annualMedianHouseholdIncomeDollars,
    origin.annualMedianHouseholdIncomeDollars,
  );
  const low = roundRatio(
    currentMonthlyTakeHomeDollars *
      (destination.annualMedianHouseholdIncomeDollars -
        destination.marginOfError90Dollars),
    origin.annualMedianHouseholdIncomeDollars + origin.marginOfError90Dollars,
  );
  const high = roundRatio(
    currentMonthlyTakeHomeDollars *
      (destination.annualMedianHouseholdIncomeDollars +
        destination.marginOfError90Dollars),
    origin.annualMedianHouseholdIncomeDollars - origin.marginOfError90Dollars,
  );
  const destinationToOriginRatioBps = roundRatio(
    destination.annualMedianHouseholdIncomeDollars * 10_000,
    origin.annualMedianHouseholdIncomeDollars,
  );
  const direction = directionFromRatio(destinationToOriginRatioBps);

  return Object.freeze({
    version: RESEARCH_METRO_INCOME_SOURCE.version,
    role: "Context only",
    currentMonthlyTakeHomeDollars,
    suggestedMonthlyTakeHomeDollars: estimate,
    plausibleMonthlyTakeHomeRangeDollars: Object.freeze({ low, high }),
    destinationToOriginRatioBps,
    direction,
    summary:
      direction === "similar"
        ? "ACS metro household-income context is similar between these metros."
        : `ACS metro household-income context is ${direction} in the destination metro.`,
    origin: Object.freeze(withNationalIndex(origin)),
    destination: Object.freeze(withNationalIndex(destination)),
    national: RESEARCH_METRO_INCOME_SOURCE.national,
    method:
      "Applies the destination-to-origin ACS median household-income ratio to the user's current take-home amount.",
    boundary:
      "This preserves the user's relative position against metro household-income medians. It is an editable planning estimate, not a salary prediction, paycheck forecast, job offer, tax calculation, occupational wage estimate, or claim that the household will earn the metro median.",
    laborMarketBoundary:
      "This is metro household-income context, not a salary prediction, paycheck forecast, job offer, tax calculation, employment probability, and not an occupation wage estimate.",
    source: Object.freeze({
      publisher: RESEARCH_METRO_INCOME_SOURCE.publisher,
      tableId: RESEARCH_METRO_INCOME_SOURCE.tableId,
      sourceUrl: RESEARCH_METRO_INCOME_SOURCE.sourceUrl,
      observationPeriod: RESEARCH_METRO_INCOME_SOURCE.observationPeriod,
      artifactSha256: RESEARCH_METRO_INCOME_SOURCE.artifactSha256,
    }),
  });
};
