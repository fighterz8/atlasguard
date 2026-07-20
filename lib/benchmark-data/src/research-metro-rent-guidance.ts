const BEDROOM_LABELS = Object.freeze({
  studio: "studio median gross rent",
  "1": "1-bedroom median gross rent",
  "2": "2-bedroom median gross rent",
  "3": "3-bedroom median gross rent",
  "4_plus": "4-bedroom median gross rent",
});

const STOCK_LABELS = Object.freeze({
  studio: "studio renter-occupied homes",
  "1": "1-bedroom renter-occupied homes",
  "2": "2-bedroom renter-occupied homes",
  "3": "3-bedroom renter-occupied homes",
  "4_plus": "4+ bedroom renter-occupied homes",
});

type BedroomNeed = keyof typeof BEDROOM_LABELS;

type RentRecord = Readonly<{
  geoId: string;
  grossRentByBedroom: Readonly<
    Record<
      BedroomNeed,
      Readonly<{
        monthlyGrossRentDollars: number;
        marginOfError90Dollars: number | null;
      }>
    >
  >;
  renterStockShareBpsByBedroom: Readonly<Record<BedroomNeed, number>>;
}>;

export const RESEARCH_METRO_RENT_SOURCE = Object.freeze({
  version: "acs1-2024-rent-by-bedrooms-v1",
  publisher: "U.S. Census Bureau",
  dataset: "2024 American Community Survey 1-year estimates",
  observationPeriod: "2024 ACS 1-year estimates",
  releasedOn: "2025-09-11",
  verifiedOn: "2026-07-20",
  tables: Object.freeze({
    rentByBedrooms: Object.freeze({
      tableId: "B25031",
      sourceUrl:
        "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25031.dat",
      artifactSha256:
        "d8283555516e0a757a51aa8ea6164c25c58e54ba88c5e339e964160633907a80",
    }),
    tenureByBedrooms: Object.freeze({
      tableId: "B25042",
      sourceUrl:
        "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25042.dat",
      artifactSha256:
        "b0165ee0b182c92a44b8ed05251a43564c4c639f1bc424ada7124d721bd2e0c3",
    }),
  }),
  metros: Object.freeze({
    "los-angeles-ca": Object.freeze({
      geoId: "310M700US31080",
      grossRentByBedroom: Object.freeze({
        studio: Object.freeze({
          monthlyGrossRentDollars: 1_636,
          marginOfError90Dollars: 33,
        }),
        "1": Object.freeze({
          monthlyGrossRentDollars: 1_822,
          marginOfError90Dollars: 18,
        }),
        "2": Object.freeze({
          monthlyGrossRentDollars: 2_263,
          marginOfError90Dollars: 18,
        }),
        "3": Object.freeze({
          monthlyGrossRentDollars: 2_683,
          marginOfError90Dollars: 43,
        }),
        "4_plus": Object.freeze({
          monthlyGrossRentDollars: 3_083,
          marginOfError90Dollars: 113,
        }),
      }),
      renterStockShareBpsByBedroom: Object.freeze({
        studio: 1_230,
        "1": 2_865,
        "2": 3_814,
        "3": 1_544,
        "4_plus": 548,
      }),
    }),
    "seattle-wa": Object.freeze({
      geoId: "310M700US42660",
      grossRentByBedroom: Object.freeze({
        studio: Object.freeze({
          monthlyGrossRentDollars: 1_669,
          marginOfError90Dollars: 41,
        }),
        "1": Object.freeze({
          monthlyGrossRentDollars: 1_814,
          marginOfError90Dollars: 30,
        }),
        "2": Object.freeze({
          monthlyGrossRentDollars: 2_162,
          marginOfError90Dollars: 32,
        }),
        "3": Object.freeze({
          monthlyGrossRentDollars: 2_518,
          marginOfError90Dollars: 56,
        }),
        "4_plus": Object.freeze({
          monthlyGrossRentDollars: 3_068,
          marginOfError90Dollars: 129,
        }),
      }),
      renterStockShareBpsByBedroom: Object.freeze({
        studio: 1_460,
        "1": 2_924,
        "2": 3_409,
        "3": 1_490,
        "4_plus": 717,
      }),
    }),
    "austin-tx": Object.freeze({
      geoId: "310M700US12420",
      grossRentByBedroom: Object.freeze({
        studio: Object.freeze({
          monthlyGrossRentDollars: 1_526,
          marginOfError90Dollars: 75,
        }),
        "1": Object.freeze({
          monthlyGrossRentDollars: 1_556,
          marginOfError90Dollars: 39,
        }),
        "2": Object.freeze({
          monthlyGrossRentDollars: 1_859,
          marginOfError90Dollars: 33,
        }),
        "3": Object.freeze({
          monthlyGrossRentDollars: 2_177,
          marginOfError90Dollars: 48,
        }),
        "4_plus": Object.freeze({
          monthlyGrossRentDollars: 2_491,
          marginOfError90Dollars: 110,
        }),
      }),
      renterStockShareBpsByBedroom: Object.freeze({
        studio: 832,
        "1": 3_273,
        "2": 3_435,
        "3": 1_676,
        "4_plus": 785,
      }),
    }),
    "san-diego-ca": Object.freeze({
      geoId: "310M700US41740",
      grossRentByBedroom: Object.freeze({
        studio: Object.freeze({
          monthlyGrossRentDollars: 1_874,
          marginOfError90Dollars: 110,
        }),
        "1": Object.freeze({
          monthlyGrossRentDollars: 2_036,
          marginOfError90Dollars: 46,
        }),
        "2": Object.freeze({
          monthlyGrossRentDollars: 2_379,
          marginOfError90Dollars: 37,
        }),
        "3": Object.freeze({
          monthlyGrossRentDollars: 2_849,
          marginOfError90Dollars: 99,
        }),
        "4_plus": Object.freeze({
          monthlyGrossRentDollars: 3_501,
          marginOfError90Dollars: null,
        }),
      }),
      renterStockShareBpsByBedroom: Object.freeze({
        studio: 795,
        "1": 2_522,
        "2": 4_217,
        "3": 1_743,
        "4_plus": 723,
      }),
    }),
  } satisfies Record<string, RentRecord>),
});

type SupportedRentMetroSlug = keyof typeof RESEARCH_METRO_RENT_SOURCE.metros;

export type ResearchMetroRentGuidance = Readonly<{
  version: typeof RESEARCH_METRO_RENT_SOURCE.version;
  bedroomNeed: BedroomNeed;
  rentCategoryLabel: string;
  stockCategoryLabel: string;
  origin: RentRecord["grossRentByBedroom"][BedroomNeed] &
    Readonly<{ renterStockShareBps: number }>;
  destination: RentRecord["grossRentByBedroom"][BedroomNeed] &
    Readonly<{ renterStockShareBps: number }>;
  monthlyDifferenceDollars: number;
  renterStockShareDifferenceBps: number;
  method: string;
  boundary: string;
  source: Readonly<{
    publisher: string;
    rentTableId: string;
    stockTableId: string;
    observationPeriod: string;
  }>;
}>;

const isBedroomNeed = (value: string): value is BedroomNeed =>
  value in BEDROOM_LABELS;

const bedroomRecord = (record: RentRecord, bedroomNeed: BedroomNeed) =>
  Object.freeze({
    ...record.grossRentByBedroom[bedroomNeed],
    renterStockShareBps: record.renterStockShareBpsByBedroom[bedroomNeed],
  });

export const getResearchMetroRentGuidance = (
  originSlug: string,
  destinationSlug: string,
  bedroomNeed: string,
): ResearchMetroRentGuidance | null => {
  const origin =
    RESEARCH_METRO_RENT_SOURCE.metros[originSlug as SupportedRentMetroSlug];
  const destination =
    RESEARCH_METRO_RENT_SOURCE.metros[
      destinationSlug as SupportedRentMetroSlug
    ];
  if (
    origin === undefined ||
    destination === undefined ||
    originSlug === destinationSlug ||
    !isBedroomNeed(bedroomNeed)
  ) {
    return null;
  }

  const originBedroom = bedroomRecord(origin, bedroomNeed);
  const destinationBedroom = bedroomRecord(destination, bedroomNeed);

  return Object.freeze({
    version: RESEARCH_METRO_RENT_SOURCE.version,
    bedroomNeed,
    rentCategoryLabel: BEDROOM_LABELS[bedroomNeed],
    stockCategoryLabel: STOCK_LABELS[bedroomNeed],
    origin: originBedroom,
    destination: destinationBedroom,
    monthlyDifferenceDollars:
      destinationBedroom.monthlyGrossRentDollars -
      originBedroom.monthlyGrossRentDollars,
    renterStockShareDifferenceBps:
      destinationBedroom.renterStockShareBps -
      originBedroom.renterStockShareBps,
    method:
      "Compares ACS median gross rent and renter-occupied housing stock share for the user's requested bedroom count.",
    boundary:
      "This is requirement-aware occupied rental stock evidence, not listing availability, lease approval, neighborhood quality, deposit cost, or a guarantee that a matching home is available.",
    source: Object.freeze({
      publisher: RESEARCH_METRO_RENT_SOURCE.publisher,
      rentTableId: RESEARCH_METRO_RENT_SOURCE.tables.rentByBedrooms.tableId,
      stockTableId:
        RESEARCH_METRO_RENT_SOURCE.tables.tenureByBedrooms.tableId,
      observationPeriod: RESEARCH_METRO_RENT_SOURCE.observationPeriod,
    }),
  });
};
