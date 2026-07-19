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

/** Independent first-cohort ACS registry; comparison-side registries above remain compatibility locks. */
export const APPROVED_ACS_METRO_SOURCE = {
  id: "acs1.2024.movewise-metro-cohort-1",
  delineationVersion: APPROVED_ACS_COMMUTE_SOURCE.delineationVersion,
  artifacts: {
    ...APPROVED_ACS_COMMUTE_SOURCE.artifacts,
    b25064: APPROVED_ACS_RENT_SOURCE.artifacts.b25064,
  },
  metros: {
    "los-angeles-ca": {
      slug: "los-angeles-ca",
      ...APPROVED_ACS_COMMUTE_SOURCE.geographies.origin,
      commute: APPROVED_ACS_COMMUTE_SOURCE.extractedRows.origin,
      rent: APPROVED_ACS_RENT_SOURCE.extractedRows.origin,
    },
    "seattle-wa": {
      slug: "seattle-wa",
      ...APPROVED_ACS_COMMUTE_SOURCE.geographies.destination,
      commute: APPROVED_ACS_COMMUTE_SOURCE.extractedRows.destination,
      rent: APPROVED_ACS_RENT_SOURCE.extractedRows.destination,
    },
    "austin-tx": {
      slug: "austin-tx",
      selectedPlace: { city: "Austin", stateCode: "TX" },
      cbsaCode: "12420",
      cbsaLabel: "Austin-Round Rock-San Marcos, TX Metro Area",
      acsGeoId: "310M700US12420",
      selectedPlaceMapping: {
        method: "official_cbsa_title_match",
        sourceArtifactId: "acs1.2024.geographies",
      },
      commute: {
        aggregateTravelTimeMinutes: {
          estimate: 30_627_030,
          marginOfError90: 621_811,
        },
        workers16AndOver: {
          estimate: 1_413_215,
          marginOfError90: 12_865,
        },
        workedFromHome: {
          estimate: 327_525,
          marginOfError90: 12_151,
        },
      },
      rent: { estimateDollars: 1_784, marginOfError90Dollars: 20 },
    },
    "san-diego-ca": {
      slug: "san-diego-ca",
      selectedPlace: { city: "San Diego", stateCode: "CA" },
      cbsaCode: "41740",
      cbsaLabel: "San Diego-Chula Vista-Carlsbad, CA Metro Area",
      acsGeoId: "310M700US41740",
      selectedPlaceMapping: {
        method: "official_cbsa_title_match",
        sourceArtifactId: "acs1.2024.geographies",
      },
      commute: {
        aggregateTravelTimeMinutes: {
          estimate: 36_610_825,
          marginOfError90: 648_200,
        },
        workers16AndOver: {
          estimate: 1_674_562,
          marginOfError90: 12_717,
        },
        workedFromHome: {
          estimate: 269_795,
          marginOfError90: 8_695,
        },
      },
      rent: { estimateDollars: 2_336, marginOfError90Dollars: 20 },
    },
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

/** Independent first-cohort NOAA registry with source completeness preserved per station. */
export const APPROVED_NOAA_METRO_SOURCE = {
  id: "noaa.normals.1991-2020.hot-days.movewise-metro-cohort-1",
  dataset: APPROVED_NOAA_HEAT_SOURCE.dataset,
  observationPeriod: APPROVED_NOAA_HEAT_SOURCE.observationPeriod,
  metricColumn: APPROVED_NOAA_HEAT_SOURCE.metricColumn,
  selectionPolicy: {
    reference:
      "One NOAA urban reference station named for the selected city with at least Representative completeness",
    envelope:
      "The urban reference plus the NOAA primary-airport station named for the selected city, each with at least Representative completeness",
    uncertainty:
      "Maximum absolute utility difference between the urban reference and either station in the selected-city envelope",
    interpretation:
      "Selected-city station proxy with reference-site selection and source-completeness uncertainty; not a metro-wide or neighborhood forecast",
  },
  artifacts: {
    inventory: APPROVED_NOAA_HEAT_SOURCE.artifacts.inventory,
    documentation: APPROVED_NOAA_HEAT_SOURCE.artifacts.documentation,
    stations: {
      USW00093134: APPROVED_NOAA_HEAT_SOURCE.artifacts.losAngelesUrban,
      USW00023174: APPROVED_NOAA_HEAT_SOURCE.artifacts.losAngelesAirport,
      USW00094290: APPROVED_NOAA_HEAT_SOURCE.artifacts.seattleUrban,
      USW00024233: APPROVED_NOAA_HEAT_SOURCE.artifacts.seattleAirport,
      USW00013958: {
        id: "noaa.normals.usw00013958",
        sourceUrl:
          "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00013958.csv",
        sha256:
          "c6940c36e976545926d3ff6ce8e47ef648d25b3dc52c2e11a6c9e7869ee110e9",
      },
      USW00013904: {
        id: "noaa.normals.usw00013904",
        sourceUrl:
          "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00013904.csv",
        sha256:
          "e59999d839c58964e73109984180b70e92d21ec3959d326e32ef7fc622caa90b",
      },
      USW00003131: {
        id: "noaa.normals.usw00003131",
        sourceUrl:
          "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00003131.csv",
        sha256:
          "7c95eda0644d21289dd617d8782b8eba71fba91bfdf9d5237f13375835343baf",
      },
      USW00023188: {
        id: "noaa.normals.usw00023188",
        sourceUrl:
          "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00023188.csv",
        sha256:
          "2e514f5fba4de05042d2b384c22f548547cfb35e7bae70a62ff66d41f7fce887",
      },
    },
  },
  metros: {
    "los-angeles-ca": {
      slug: "los-angeles-ca",
      selectedPlace: { city: "Los Angeles", stateCode: "CA" },
      referenceStationId: "USW00093134",
      envelopeStationIds: ["USW00093134", "USW00023174"],
    },
    "seattle-wa": {
      slug: "seattle-wa",
      selectedPlace: { city: "Seattle", stateCode: "WA" },
      referenceStationId: "USW00094290",
      envelopeStationIds: ["USW00094290", "USW00024233"],
    },
    "austin-tx": {
      slug: "austin-tx",
      selectedPlace: { city: "Austin", stateCode: "TX" },
      referenceStationId: "USW00013958",
      envelopeStationIds: ["USW00013958", "USW00013904"],
    },
    "san-diego-ca": {
      slug: "san-diego-ca",
      selectedPlace: { city: "San Diego", stateCode: "CA" },
      referenceStationId: "USW00003131",
      envelopeStationIds: ["USW00003131", "USW00023188"],
    },
  },
  stations: {
    ...APPROVED_NOAA_HEAT_SOURCE.extractedStations,
    USW00013958: {
      name: "AUSTIN-CAMP MABRY, TX US",
      latitude: 30.3208,
      longitude: -97.7603,
      elevationMeters: 204.2,
      annualDaysAbove90F: 122.8,
      completenessFlag: "S",
      years: 30,
    },
    USW00013904: {
      name: "AUSTIN BERGSTROM AP, TX US",
      latitude: 30.1831,
      longitude: -97.68,
      elevationMeters: 146.3,
      annualDaysAbove90F: 123.5,
      completenessFlag: "S",
      years: 24,
    },
    USW00003131: {
      name: "SAN DIEGO MONTGOMERY FLD, CA US",
      latitude: 32.8158,
      longitude: -117.1394,
      elevationMeters: 127.1,
      annualDaysAbove90F: 16,
      completenessFlag: "R",
      years: 22,
    },
    USW00023188: {
      name: "SAN DIEGO LINDBERGH FLD, CA US",
      latitude: 32.7336,
      longitude: -117.1831,
      elevationMeters: 4.6,
      annualDaysAbove90F: 3,
      completenessFlag: "R",
      years: 22,
    },
  },
} as const;
