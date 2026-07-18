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

export const APPROVED_NOAA_HEAT_SOURCE = {
  id: "noaa.normals.1991-2020.hot-days.la-seattle",
  dataset: "U.S. Climate Normals 1991-2020 Annual/Seasonal",
  observationPeriod: "1991-2020 climate normal",
  metricColumn: "ANN-TMAX-AVGNDS-GRTH090",
  selectionPolicy: {
    reference:
      "One NOAA Standard-completeness urban station named for the selected city",
    envelope:
      "The urban reference plus the NOAA Standard-completeness primary-airport station named for the selected city",
    interpretation:
      "Selected-city station proxy with reference-site selection uncertainty; not a metro-wide or neighborhood forecast",
  },
  artifacts: {
    inventory: {
      id: "noaa.normals.1991-2020.station-inventory",
      sourceUrl:
        "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/doc/inventory_30yr.txt",
      sha256:
        "c9f5f0f3c38b89410b75d03267bf05fb53f6ba4b6623d22411be2df2bfe01bdb",
    },
    documentation: {
      id: "noaa.normals.1991-2020.annual-documentation",
      sourceUrl:
        "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/doc/Normals_ANN_Documentation_1991-2020.pdf",
      sha256:
        "5fd15ef9f513969dc360150341dfc99e43d6ffcc79ea544cd929376d9e125d15",
    },
    losAngelesUrban: {
      id: "noaa.normals.usw00093134",
      sourceUrl:
        "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00093134.csv",
      sha256:
        "decefbf60a10efa40215278aedaab955f75b43c11ef27c72bc5239de1f9717f4",
    },
    losAngelesAirport: {
      id: "noaa.normals.usw00023174",
      sourceUrl:
        "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00023174.csv",
      sha256:
        "a40a04b38ac76e3a5db75703cc1049dd3abe57bdccb3580b360ff42ab9a239ec",
    },
    seattleUrban: {
      id: "noaa.normals.usw00094290",
      sourceUrl:
        "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00094290.csv",
      sha256:
        "2872fdaf785a5bdae06a423b04b4cd55b9620491e41f1cc419fdbf07d1ebb08c",
    },
    seattleAirport: {
      id: "noaa.normals.usw00024233",
      sourceUrl:
        "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00024233.csv",
      sha256:
        "95345733f5237ceaa2c75058f82863ca6c70c960adef8b6cb34620cddb917c86",
    },
  },
  places: {
    origin: {
      city: "Los Angeles",
      stateCode: "CA",
      referenceStationId: "USW00093134",
      envelopeStationIds: ["USW00093134", "USW00023174"],
    },
    destination: {
      city: "Seattle",
      stateCode: "WA",
      referenceStationId: "USW00094290",
      envelopeStationIds: ["USW00094290", "USW00024233"],
    },
  },
  extractedStations: {
    USW00093134: {
      name: "LOS ANGELES DWTN USC CAMPUS, CA US",
      latitude: 34.0511,
      longitude: -118.2353,
      elevationMeters: 70.1,
      annualDaysAbove90F: 25.6,
      completenessFlag: "S",
      years: 26,
    },
    USW00023174: {
      name: "LOS ANGELES INTL AP, CA US",
      latitude: 33.9381,
      longitude: -118.3889,
      elevationMeters: 29.6,
      annualDaysAbove90F: 4.8,
      completenessFlag: "S",
      years: 26,
    },
    USW00094290: {
      name: "SEATTLE SAND PT WSFO, WA US",
      latitude: 47.6872,
      longitude: -122.2553,
      elevationMeters: 18.3,
      annualDaysAbove90F: 2.1,
      completenessFlag: "S",
      years: 28,
    },
    USW00024233: {
      name: "SEATTLE TACOMA INTL AP, WA US",
      latitude: 47.4444,
      longitude: -122.3139,
      elevationMeters: 112.8,
      annualDaysAbove90F: 3.8,
      completenessFlag: "S",
      years: 30,
    },
  },
} as const;
