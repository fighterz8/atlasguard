export const APPROVED_ACS_COMMUTE_SOURCE = {
  id: "acs1.2024.commute.la-seattle",
  delineationVersion: "OMB Bulletin 23-01 / Census July 2023",
  artifacts: {
    cbsaDelineation: {
      id: "census.cbsa-delineation.2023-07",
      sourceUrl:
        "https://www2.census.gov/programs-surveys/metro-micro/geographies/reference-files/2023/delineation-files/list1_2023.xlsx",
      sha256:
        "952c4b1e78acbb54e6ec9412434b7602fedacbf021736351a63c181bdb753629",
    },
    acsGeographies: {
      id: "acs1.2024.geographies",
      sourceUrl:
        "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/documentation/Geos20241YR.txt",
      sha256:
        "2155acb3c81672eee9b0bd971cca60cd77d8b66222b34973928f57c087ea4afe",
    },
    b08013: {
      id: "acs1.2024.b08013",
      sourceUrl:
        "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b08013.dat",
      sha256:
        "7356ea95a92afa5cb7c9e3fe8b39b13507bad424eb911b69ece6606f46aba2d3",
    },
    b08006: {
      id: "acs1.2024.b08006",
      sourceUrl:
        "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b08006.dat",
      sha256:
        "9ef23a2e853cffc913e58c997e3cf5304e723a815eb527b5fec75dbc4a6a52e0",
    },
  },
  geographies: {
    origin: {
      selectedPlace: { city: "Los Angeles", stateCode: "CA" },
      cbsaCode: "31080",
      cbsaLabel: "Los Angeles-Long Beach-Anaheim, CA Metro Area",
      acsGeoId: "310M700US31080",
      selectedPlaceMapping: {
        method: "official_cbsa_title_match",
        sourceArtifactId: "acs1.2024.geographies",
      },
    },
    destination: {
      selectedPlace: { city: "Seattle", stateCode: "WA" },
      cbsaCode: "42660",
      cbsaLabel: "Seattle-Tacoma-Bellevue, WA Metro Area",
      acsGeoId: "310M700US42660",
      selectedPlaceMapping: {
        method: "official_cbsa_title_match",
        sourceArtifactId: "acs1.2024.geographies",
      },
    },
  },
  extractedRows: {
    origin: {
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
    destination: {
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
  },
} as const;

export const APPROVED_ACS_RENT_SOURCE = {
  id: "acs1.2024.median-gross-rent.la-seattle",
  delineationVersion: APPROVED_ACS_COMMUTE_SOURCE.delineationVersion,
  artifacts: {
    acsGeographies: APPROVED_ACS_COMMUTE_SOURCE.artifacts.acsGeographies,
    b25064: {
      id: "acs1.2024.b25064",
      sourceUrl:
        "https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/1YRData/acsdt1y2024-b25064.dat",
      sha256:
        "8624f9775add1e22ac3a015a753207e0d752bc4c967dda04c22cd9e17ac94b57",
    },
  },
  geographies: APPROVED_ACS_COMMUTE_SOURCE.geographies,
  extractedRows: {
    origin: { estimateDollars: 2_114, marginOfError90Dollars: 13 },
    destination: { estimateDollars: 2_050, marginOfError90Dollars: 25 },
  },
} as const;
