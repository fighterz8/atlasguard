import type { RawMetroClimateSnapshot } from "../raw-metro-climate-snapshot";

const common = {
  schemaVersion: "1.0.0",
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
      "One NOAA urban reference station named for the selected city with at least Representative completeness",
    envelope:
      "The urban reference plus the NOAA primary-airport station named for the selected city, each with at least Representative completeness",
    uncertainty:
      "Maximum absolute utility difference between the urban reference and either station in the selected-city envelope",
    interpretation:
      "Selected-city station proxy with reference-site selection and source-completeness uncertainty; not a metro-wide or neighborhood forecast",
  },
} as const;

const sharedArtifacts = {
  inventory: {
    id: "noaa.normals.1991-2020.station-inventory",
    title: "1991-2020 Climate Normals 30-year station inventory",
    sourceUrl:
      "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/doc/inventory_30yr.txt",
    sha256: "c9f5f0f3c38b89410b75d03267bf05fb53f6ba4b6623d22411be2df2bfe01bdb",
    retrievedOn: "2026-07-18",
  },
  documentation: {
    id: "noaa.normals.1991-2020.annual-documentation",
    title: "1991-2020 Annual/Seasonal Climate Normals documentation",
    sourceUrl:
      "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/doc/Normals_ANN_Documentation_1991-2020.pdf",
    sha256: "5fd15ef9f513969dc360150341dfc99e43d6ffcc79ea544cd929376d9e125d15",
    retrievedOn: "2026-07-18",
  },
} as const;

export const noaaHotDaysAustinRawSnapshot = {
  ...common,
  id: "noaa.normals.1991-2020.metro-profile.austin-tx.raw",
  sha256: "ff28337ec41a6a34849e5246c778cdd6f2fedab2c0f484edab2ccff547ea4492",
  metroSlug: "austin-tx",
  artifacts: {
    ...sharedArtifacts,
    referenceStation: {
      id: "noaa.normals.usw00013958",
      title: "Austin-Camp Mabry annual normals",
      sourceUrl:
        "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00013958.csv",
      sha256:
        "c6940c36e976545926d3ff6ce8e47ef648d25b3dc52c2e11a6c9e7869ee110e9",
      retrievedOn: "2026-07-18",
    },
    contrastStation: {
      id: "noaa.normals.usw00013904",
      title: "Austin Bergstrom Airport annual normals",
      sourceUrl:
        "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00013904.csv",
      sha256:
        "e59999d839c58964e73109984180b70e92d21ec3959d326e32ef7fc622caa90b",
      retrievedOn: "2026-07-18",
    },
  },
  place: {
    selectedPlace: { city: "Austin", stateCode: "TX" },
    referenceStationId: "USW00013958",
    envelopeStationIds: ["USW00013958", "USW00013904"],
  },
  stations: [
    {
      stationId: "USW00013958",
      role: "urban_reference",
      name: "AUSTIN-CAMP MABRY, TX US",
      latitude: 30.3208,
      longitude: -97.7603,
      elevationMeters: 204.2,
      annualDaysAbove90F: 122.8,
      measurementFlag: "",
      completenessFlag: "S",
      years: 30,
    },
    {
      stationId: "USW00013904",
      role: "primary_airport_contrast",
      name: "AUSTIN BERGSTROM AP, TX US",
      latitude: 30.1831,
      longitude: -97.68,
      elevationMeters: 146.3,
      annualDaysAbove90F: 123.5,
      measurementFlag: "",
      completenessFlag: "S",
      years: 24,
    },
  ],
} satisfies RawMetroClimateSnapshot;

export const noaaHotDaysSanDiegoRawSnapshot = {
  ...common,
  id: "noaa.normals.1991-2020.metro-profile.san-diego-ca.raw",
  sha256: "93b8b2faf459b76bf2b5876695a552cb17dce6ca388f7d9857f448c5e4295f0c",
  metroSlug: "san-diego-ca",
  artifacts: {
    ...sharedArtifacts,
    referenceStation: {
      id: "noaa.normals.usw00003131",
      title: "San Diego Montgomery Field annual normals",
      sourceUrl:
        "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00003131.csv",
      sha256:
        "7c95eda0644d21289dd617d8782b8eba71fba91bfdf9d5237f13375835343baf",
      retrievedOn: "2026-07-18",
    },
    contrastStation: {
      id: "noaa.normals.usw00023188",
      title: "San Diego Lindbergh Field annual normals",
      sourceUrl:
        "https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/access/USW00023188.csv",
      sha256:
        "2e514f5fba4de05042d2b384c22f548547cfb35e7bae70a62ff66d41f7fce887",
      retrievedOn: "2026-07-18",
    },
  },
  place: {
    selectedPlace: { city: "San Diego", stateCode: "CA" },
    referenceStationId: "USW00003131",
    envelopeStationIds: ["USW00003131", "USW00023188"],
  },
  stations: [
    {
      stationId: "USW00003131",
      role: "urban_reference",
      name: "SAN DIEGO MONTGOMERY FLD, CA US",
      latitude: 32.8158,
      longitude: -117.1394,
      elevationMeters: 127.1,
      annualDaysAbove90F: 16,
      measurementFlag: "",
      completenessFlag: "R",
      years: 22,
    },
    {
      stationId: "USW00023188",
      role: "primary_airport_contrast",
      name: "SAN DIEGO LINDBERGH FLD, CA US",
      latitude: 32.7336,
      longitude: -117.1831,
      elevationMeters: 4.6,
      annualDaysAbove90F: 3,
      measurementFlag: "",
      completenessFlag: "R",
      years: 22,
    },
  ],
} satisfies RawMetroClimateSnapshot;
