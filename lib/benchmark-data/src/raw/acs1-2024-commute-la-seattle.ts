import type { RawCommuteSnapshot } from "../raw-snapshot";

export const acs2024CommuteLaSeattleRawSnapshot = {
  schemaVersion: "1.0.0",
  id: "acs1.2024.commute.la-seattle",
  sha256: "eca676ec38e93ffc771aade9125aa58d2978bee7df157b9120dd42c52a3aa9a9",
  admissionStatus: "research_only",
  userFacingEligible: false,
  delineationVersion: "OMB Bulletin 23-01 / Census July 2023",
  observationPeriod: "2024 ACS 1-year estimates",
  releasedOn: "2025-09-11",
  verifiedOn: "2026-07-17",
  publisher: "U.S. Census Bureau",
  dataset: "2024 ACS 1-year table-based summary files",
  termsUrl:
    "https://www.census.gov/data/developers/about/terms-of-service.html",
  derivation: {
    estimateFormula: "B08013_E001 / (B08006_E001 - B08006_E017)",
    marginOfErrorMethod:
      "Zero-covariance approximation from the published component 90% margins of error; display rounding is separate from calculation",
    displayRounding: "one_decimal_half_up",
    coveragePolicy:
      "null: no defensible population-coverage percentage is inferred from ACS survey estimates",
  },
  artifacts: {
    cbsaDelineation: {
      id: "census.cbsa-delineation.2023-07",
      title:
        "2023 delineation file for metropolitan and micropolitan statistical areas",
      sourceUrl:
        "https://www2.census.gov/programs-surveys/metro-micro/geographies/reference-files/2023/delineation-files/list1_2023.xlsx",
      sha256:
        "952c4b1e78acbb54e6ec9412434b7602fedacbf021736351a63c181bdb753629",
      retrievedOn: "2026-07-17",
    },
    acsGeographies: {
      id: "acs1.2024.geographies",
      title: "2024 ACS 1-year table-based summary-file geographies",
      sourceUrl:
        "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/documentation/Geos20241YR.txt",
      sha256:
        "2155acb3c81672eee9b0bd971cca60cd77d8b66222b34973928f57c087ea4afe",
      retrievedOn: "2026-07-17",
    },
    b08013: {
      id: "acs1.2024.b08013",
      title: "Aggregate travel time to work",
      sourceUrl:
        "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b08013.dat",
      sha256:
        "7356ea95a92afa5cb7c9e3fe8b39b13507bad424eb911b69ece6606f46aba2d3",
      retrievedOn: "2026-07-17",
    },
    b08006: {
      id: "acs1.2024.b08006",
      title: "Sex of workers by means of transportation to work",
      sourceUrl:
        "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b08006.dat",
      sha256:
        "9ef23a2e853cffc913e58c997e3cf5304e723a815eb527b5fec75dbc4a6a52e0",
      retrievedOn: "2026-07-17",
    },
  },
  metros: [
    {
      side: "origin",
      selectedPlace: { city: "Los Angeles", stateCode: "CA" },
      cbsaCode: "31080",
      cbsaLabel: "Los Angeles-Long Beach-Anaheim, CA Metro Area",
      acsGeoId: "310M700US31080",
      aggregateTravelTimeMinutes: {
        estimate: 167_900_745,
        marginOfError90: 1_472_822,
      },
      workers16AndOver: {
        estimate: 6_439_157,
        marginOfError90: 25_869,
      },
      workedFromHome: {
        estimate: 962_126,
        marginOfError90: 19_480,
      },
    },
    {
      side: "destination",
      selectedPlace: { city: "Seattle", stateCode: "WA" },
      cbsaCode: "42660",
      cbsaLabel: "Seattle-Tacoma-Bellevue, WA Metro Area",
      acsGeoId: "310M700US42660",
      aggregateTravelTimeMinutes: {
        estimate: 53_404_365,
        marginOfError90: 740_838,
      },
      workers16AndOver: {
        estimate: 2_184_959,
        marginOfError90: 15_654,
      },
      workedFromHome: {
        estimate: 404_495,
        marginOfError90: 12_400,
      },
    },
  ],
} satisfies RawCommuteSnapshot;
