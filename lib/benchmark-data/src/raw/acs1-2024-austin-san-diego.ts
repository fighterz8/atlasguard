import type { RawMetroAcsSnapshot } from "../raw-metro-acs-snapshot";

const common = {
  schemaVersion: "1.0.0",
  admissionStatus: "research_only",
  userFacingEligible: false,
  delineationVersion: "OMB Bulletin 23-01 / Census July 2023",
  observationPeriod: "2024 ACS 1-year estimates",
  releasedOn: "2025-09-11",
  verifiedOn: "2026-07-18",
  publisher: "U.S. Census Bureau",
  dataset: "2024 ACS 1-year table-based summary files",
  termsUrl:
    "https://www.census.gov/data/developers/about/terms-of-service.html",
  derivation: {
    commuteEstimateFormula: "B08013_E001 / (B08006_E001 - B08006_E017)",
    commuteMarginOfErrorMethod:
      "Zero-covariance approximation from the published component 90% margins of error; display rounding is separate from calculation",
    rentConversion: "B25064 dollars multiplied by 100",
    coveragePolicy:
      "null: no defensible population-coverage percentage is inferred from ACS survey estimates",
  },
  artifacts: {
    cbsaDelineation: {
      id: "census.cbsa-delineation.2023-07",
      title: "2023 metropolitan and micropolitan statistical-area delineation",
      sourceUrl:
        "https://www2.census.gov/programs-surveys/metro-micro/geographies/reference-files/2023/delineation-files/list1_2023.xlsx",
      sha256:
        "952c4b1e78acbb54e6ec9412434b7602fedacbf021736351a63c181bdb753629",
      retrievedOn: "2026-07-18",
    },
    acsGeographies: {
      id: "acs1.2024.geographies",
      title: "2024 ACS 1-year table-based summary-file geographies",
      sourceUrl:
        "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/documentation/Geos20241YR.txt",
      sha256:
        "2155acb3c81672eee9b0bd971cca60cd77d8b66222b34973928f57c087ea4afe",
      retrievedOn: "2026-07-18",
    },
    b08013: {
      id: "acs1.2024.b08013",
      title: "Aggregate travel time to work",
      sourceUrl:
        "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b08013.dat",
      sha256:
        "7356ea95a92afa5cb7c9e3fe8b39b13507bad424eb911b69ece6606f46aba2d3",
      retrievedOn: "2026-07-18",
    },
    b08006: {
      id: "acs1.2024.b08006",
      title: "Sex of workers by means of transportation to work",
      sourceUrl:
        "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b08006.dat",
      sha256:
        "9ef23a2e853cffc913e58c997e3cf5304e723a815eb527b5fec75dbc4a6a52e0",
      retrievedOn: "2026-07-18",
    },
    b25064: {
      id: "acs1.2024.b25064",
      title: "Median gross rent",
      sourceUrl:
        "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25064.dat",
      sha256:
        "8624f9775add1e22ac3a015a753207e0d752bc4c967dda04c22cd9e17ac94b57",
      retrievedOn: "2026-07-18",
    },
  },
} as const;

export const acs2024AustinRawSnapshot = {
  ...common,
  id: "acs1.2024.metro-profile.austin-tx.raw",
  sha256: "bfd7be4f42f6e41efebc26974544e7f1fec12ab2ae9131010e7eb1a766ff6a98",
  metroSlug: "austin-tx",
  metro: {
    selectedPlace: { city: "Austin", stateCode: "TX" },
    cbsaCode: "12420",
    cbsaLabel: "Austin-Round Rock-San Marcos, TX Metro Area",
    acsGeoId: "310M700US12420",
    aggregateTravelTimeMinutes: {
      estimate: 30_627_030,
      marginOfError90: 621_811,
    },
    workers16AndOver: { estimate: 1_413_215, marginOfError90: 12_865 },
    workedFromHome: { estimate: 327_525, marginOfError90: 12_151 },
    medianGrossRentDollars: 1_784,
    medianGrossRentMarginOfError90Dollars: 20,
  },
} satisfies RawMetroAcsSnapshot;

export const acs2024SanDiegoRawSnapshot = {
  ...common,
  id: "acs1.2024.metro-profile.san-diego-ca.raw",
  sha256: "0a4480e64d834d9dfa7fdadaf539d3d4c6d0747bf52837156f3249383a66926d",
  metroSlug: "san-diego-ca",
  metro: {
    selectedPlace: { city: "San Diego", stateCode: "CA" },
    cbsaCode: "41740",
    cbsaLabel: "San Diego-Chula Vista-Carlsbad, CA Metro Area",
    acsGeoId: "310M700US41740",
    aggregateTravelTimeMinutes: {
      estimate: 36_610_825,
      marginOfError90: 648_200,
    },
    workers16AndOver: { estimate: 1_674_562, marginOfError90: 12_717 },
    workedFromHome: { estimate: 269_795, marginOfError90: 8_695 },
    medianGrossRentDollars: 2_336,
    medianGrossRentMarginOfError90Dollars: 20,
  },
} satisfies RawMetroAcsSnapshot;
