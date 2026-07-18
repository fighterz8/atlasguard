import type { RawClimateSnapshot } from "../raw-climate-snapshot";

export const noaa1991To2020HotDaysLaSeattleRawSnapshot = {
  schemaVersion: "1.0.0",
  id: "noaa.normals.1991-2020.hot-days.la-seattle",
  sha256: "81685716052413640b9808048e200de0e2ad4aa9483a41bfca4c7c3c29ff5083",
  admissionStatus: "research_only",
  userFacingEligible: false,
  observationPeriod: "1991-2020 climate normal",
  releasedOn: "2023-06-27",
  verifiedOn: "2026-07-18",
  publisher: "NOAA National Centers for Environmental Information",
  dataset: "U.S. Climate Normals 1991-2020 Annual/Seasonal",
  termsUrl: "https://www.weather.gov/disclaimer",
  metric: {
    column: "ANN-TMAX-AVGNDS-GRTH090",
    definition:
      "Normal annual number of days with maximum temperature greater than 90 degrees Fahrenheit",
    unit: "days",
  },
  selectionPolicy: {
    reference:
      "One NOAA Standard-completeness urban station named for the selected city",
    envelope:
      "The urban reference plus the NOAA Standard-completeness primary-airport station named for the selected city",
    uncertainty:
      "Maximum absolute utility difference between the urban reference and either station in the selected-city envelope",
    interpretation:
      "Selected-city station proxy with reference-site selection uncertainty; not a metro-wide or neighborhood forecast",
  },
  artifacts: {
    inventory: {
      id: "noaa.normals.1991-2020.station-inventory",
      title: "1991-2020 Climate Normals 30-year station inventory",
      sourceUrl:
        "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/doc/inventory_30yr.txt",
      sha256:
        "c9f5f0f3c38b89410b75d03267bf05fb53f6ba4b6623d22411be2df2bfe01bdb",
      retrievedOn: "2026-07-18",
    },
    documentation: {
      id: "noaa.normals.1991-2020.annual-documentation",
      title: "1991-2020 Annual/Seasonal Climate Normals documentation",
      sourceUrl:
        "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/doc/Normals_ANN_Documentation_1991-2020.pdf",
      sha256:
        "5fd15ef9f513969dc360150341dfc99e43d6ffcc79ea544cd929376d9e125d15",
      retrievedOn: "2026-07-18",
    },
    losAngelesUrban: {
      id: "noaa.normals.usw00093134",
      title: "Los Angeles Downtown USC Campus annual normals",
      sourceUrl:
        "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00093134.csv",
      sha256:
        "decefbf60a10efa40215278aedaab955f75b43c11ef27c72bc5239de1f9717f4",
      retrievedOn: "2026-07-18",
    },
    losAngelesAirport: {
      id: "noaa.normals.usw00023174",
      title: "Los Angeles International Airport annual normals",
      sourceUrl:
        "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00023174.csv",
      sha256:
        "a40a04b38ac76e3a5db75703cc1049dd3abe57bdccb3580b360ff42ab9a239ec",
      retrievedOn: "2026-07-18",
    },
    seattleUrban: {
      id: "noaa.normals.usw00094290",
      title: "Seattle Sand Point annual normals",
      sourceUrl:
        "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00094290.csv",
      sha256:
        "2872fdaf785a5bdae06a423b04b4cd55b9620491e41f1cc419fdbf07d1ebb08c",
      retrievedOn: "2026-07-18",
    },
    seattleAirport: {
      id: "noaa.normals.usw00024233",
      title: "Seattle-Tacoma International Airport annual normals",
      sourceUrl:
        "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00024233.csv",
      sha256:
        "95345733f5237ceaa2c75058f82863ca6c70c960adef8b6cb34620cddb917c86",
      retrievedOn: "2026-07-18",
    },
  },
  stations: [
    {
      stationId: "USW00093134",
      role: "urban_reference",
      name: "LOS ANGELES DWTN USC CAMPUS, CA US",
      latitude: 34.0511,
      longitude: -118.2353,
      elevationMeters: 70.1,
      annualDaysAbove90F: 25.6,
      measurementFlag: "",
      completenessFlag: "S",
      years: 26,
    },
    {
      stationId: "USW00023174",
      role: "airport_contrast",
      name: "LOS ANGELES INTL AP, CA US",
      latitude: 33.9381,
      longitude: -118.3889,
      elevationMeters: 29.6,
      annualDaysAbove90F: 4.8,
      measurementFlag: "",
      completenessFlag: "S",
      years: 26,
    },
    {
      stationId: "USW00094290",
      role: "urban_reference",
      name: "SEATTLE SAND PT WSFO, WA US",
      latitude: 47.6872,
      longitude: -122.2553,
      elevationMeters: 18.3,
      annualDaysAbove90F: 2.1,
      measurementFlag: "",
      completenessFlag: "S",
      years: 28,
    },
    {
      stationId: "USW00024233",
      role: "airport_contrast",
      name: "SEATTLE TACOMA INTL AP, WA US",
      latitude: 47.4444,
      longitude: -122.3139,
      elevationMeters: 112.8,
      annualDaysAbove90F: 3.8,
      measurementFlag: "",
      completenessFlag: "S",
      years: 30,
    },
  ],
  places: [
    {
      side: "origin",
      selectedPlace: { city: "Los Angeles", stateCode: "CA" },
      referenceStationId: "USW00093134",
      envelopeStationIds: ["USW00093134", "USW00023174"],
    },
    {
      side: "destination",
      selectedPlace: { city: "Seattle", stateCode: "WA" },
      referenceStationId: "USW00094290",
      envelopeStationIds: ["USW00094290", "USW00024233"],
    },
  ],
} satisfies RawClimateSnapshot;
