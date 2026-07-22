type ExpenseRecord = Readonly<{
  geoId: string;
  allItemsRpp: number;
}>;

export const RESEARCH_METRO_EXPENSE_SOURCE = Object.freeze({
  version: "bea-2024-metro-rpp-v1",
  publisher: "U.S. Bureau of Economic Analysis",
  dataset: "Regional Price Parities by MSA",
  tableId: "MARPP",
  lineCode: 1,
  observationPeriod: "2024",
  releasedOn: "2025-12-11",
  verifiedOn: "2026-07-20",
  sourceUrl: "https://apps.bea.gov/regional/zip/MARPP.zip",
  artifactSha256:
    "5dbf2e6ac2af222cc9abc205586c9b480344d89392752eb689c3ec823a34c83e",
  metros: Object.freeze({
    "los-angeles-ca": Object.freeze({
      geoId: "31080",
      allItemsRpp: 113.566,
    }),
    "seattle-wa": Object.freeze({
      geoId: "42660",
      allItemsRpp: 111.133,
    }),
    "austin-tx": Object.freeze({
      geoId: "12420",
      allItemsRpp: 102.874,
    }),
    "san-diego-ca": Object.freeze({
      geoId: "41740",
      allItemsRpp: 113.936,
    }),
  } satisfies Record<string, ExpenseRecord>),
});

type SupportedExpenseMetroSlug =
  keyof typeof RESEARCH_METRO_EXPENSE_SOURCE.metros;

const roundRatio = (numerator: number, denominator: number): number =>
  Math.round(numerator / denominator);

export type ResearchMetroExpenseGuidance = Readonly<{
  version: typeof RESEARCH_METRO_EXPENSE_SOURCE.version;
  currentMonthlyExpensesDollars: number;
  suggestedMonthlyExpensesDollars: number;
  destinationToOriginRatioBps: number;
  origin: ExpenseRecord;
  destination: ExpenseRecord;
  method: string;
  boundary: string;
  source: Readonly<{
    publisher: string;
    tableId: string;
    lineCode: number;
    sourceUrl: string;
    observationPeriod: string;
    artifactSha256: string;
  }>;
}>;

export const getResearchMetroExpenseGuidance = (
  originSlug: string,
  destinationSlug: string,
  currentMonthlyExpensesDollars: number,
): ResearchMetroExpenseGuidance | null => {
  const origin =
    RESEARCH_METRO_EXPENSE_SOURCE.metros[
      originSlug as SupportedExpenseMetroSlug
    ];
  const destination =
    RESEARCH_METRO_EXPENSE_SOURCE.metros[
      destinationSlug as SupportedExpenseMetroSlug
    ];
  if (
    origin === undefined ||
    destination === undefined ||
    originSlug === destinationSlug ||
    !Number.isFinite(currentMonthlyExpensesDollars) ||
    currentMonthlyExpensesDollars <= 0
  ) {
    return null;
  }

  const destinationToOriginRatioBps = roundRatio(
    destination.allItemsRpp * 10_000,
    origin.allItemsRpp,
  );

  return Object.freeze({
    version: RESEARCH_METRO_EXPENSE_SOURCE.version,
    currentMonthlyExpensesDollars,
    suggestedMonthlyExpensesDollars: roundRatio(
      currentMonthlyExpensesDollars * destinationToOriginRatioBps,
      10_000,
    ),
    destinationToOriginRatioBps,
    origin,
    destination,
    method:
      "Applies the destination-to-origin BEA all-items regional price parity ratio to the user's current non-housing recurring expenses.",
    boundary:
      "This is a broad price-level proxy for editable planning, not a category-specific budget, lifestyle recommendation, or estimate of rent, childcare, taxes, debt, or one-time moving costs.",
    source: Object.freeze({
      publisher: RESEARCH_METRO_EXPENSE_SOURCE.publisher,
      tableId: RESEARCH_METRO_EXPENSE_SOURCE.tableId,
      lineCode: RESEARCH_METRO_EXPENSE_SOURCE.lineCode,
      sourceUrl: RESEARCH_METRO_EXPENSE_SOURCE.sourceUrl,
      observationPeriod: RESEARCH_METRO_EXPENSE_SOURCE.observationPeriod,
      artifactSha256: RESEARCH_METRO_EXPENSE_SOURCE.artifactSha256,
    }),
  });
};
