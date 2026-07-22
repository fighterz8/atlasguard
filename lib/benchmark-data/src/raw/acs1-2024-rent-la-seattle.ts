import type { RawHousingSnapshot } from "../raw-housing-snapshot";
import { APPROVED_ACS_RENT_SOURCE } from "../source-registry";

export const acs2024RentLaSeattleRawSnapshot = {
  schemaVersion: "1.0.0",
  id: "acs1.2024.median-gross-rent.la-seattle.raw",
  sha256: "a281fd6f24152a9908bf51d62119a701b653adec91d5633fc5f70c8e683608c1",
  admissionStatus: "research_only",
  userFacingEligible: false,
  delineationVersion: APPROVED_ACS_RENT_SOURCE.delineationVersion,
  observationPeriod: "2024 ACS 1-year estimates",
  releasedOn: "2025-09-11",
  verifiedOn: "2026-07-17",
  publisher: "U.S. Census Bureau",
  dataset: "2024 ACS 1-year table-based summary files",
  termsUrl:
    "https://www.census.gov/data/developers/about/terms-of-service.html",
  artifacts: {
    acsGeographies: {
      ...APPROVED_ACS_RENT_SOURCE.artifacts.acsGeographies,
      title: "2024 ACS 1-year geography inventory",
      retrievedOn: "2026-07-17",
    },
    b25064: {
      ...APPROVED_ACS_RENT_SOURCE.artifacts.b25064,
      title: "2024 ACS B25064 median gross rent table",
      retrievedOn: "2026-07-17",
    },
  },
  metros: (["origin", "destination"] as const).map((side) => ({
    side,
    selectedPlace: APPROVED_ACS_RENT_SOURCE.geographies[side].selectedPlace,
    cbsaCode: APPROVED_ACS_RENT_SOURCE.geographies[side].cbsaCode,
    cbsaLabel: APPROVED_ACS_RENT_SOURCE.geographies[side].cbsaLabel,
    acsGeoId: APPROVED_ACS_RENT_SOURCE.geographies[side].acsGeoId,
    medianGrossRentDollars:
      APPROVED_ACS_RENT_SOURCE.extractedRows[side].estimateDollars,
    marginOfError90Dollars:
      APPROVED_ACS_RENT_SOURCE.extractedRows[side].marginOfError90Dollars,
  })),
} satisfies RawHousingSnapshot;
