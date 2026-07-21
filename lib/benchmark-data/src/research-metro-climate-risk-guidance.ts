const RISK_RATING_RANK = {
  "Not Applicable": 0,
  "No Rating": 0,
  "Very Low": 1,
  "Relatively Low": 2,
  "Relatively Moderate": 3,
  "Relatively High": 4,
  "Very High": 5,
} as const;

type RiskRating = keyof typeof RISK_RATING_RANK;

type ClimateRiskRecord = Readonly<{
  selectedPlace: Readonly<{ city: string; stateCode: string }>;
  anchorCounty: string;
  stcofips: string;
  overallRiskRating: RiskRating;
  overallRiskScore: number;
  expectedAnnualLossRating: RiskRating;
  expectedAnnualLossScore: number;
  socialVulnerabilityRating: RiskRating;
  socialVulnerabilityScore: number;
  communityResilienceRating: RiskRating;
  communityResilienceScore: number;
  hazards: Readonly<{
    heatWave: RiskRating;
    wildfire: RiskRating;
    inlandFlooding: RiskRating;
    coastalFlooding: RiskRating;
    earthquake: RiskRating;
    hurricane: RiskRating;
    tornado: RiskRating;
    strongWind: RiskRating;
    lightning: RiskRating;
    drought: RiskRating;
  }>;
}>;

export const RESEARCH_METRO_CLIMATE_RISK_SOURCE = Object.freeze({
  version: "fema-nri-county-v1.20-climate-risk-context-v1",
  publisher: "Federal Emergency Management Agency",
  dataset: "National Risk Index Counties",
  datasetVersion: "December 2025 v1.20",
  serviceItemId: "39485e8035d446a5bff03259508ae355",
  layerUrl:
    "https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0",
  verifiedOn: "2026-07-21",
  scope:
    "Selected-city anchor county baseline risk context across FEMA National Risk Index natural hazards.",
  metros: Object.freeze({
    "los-angeles-ca": Object.freeze({
      selectedPlace: Object.freeze({ city: "Los Angeles", stateCode: "CA" }),
      anchorCounty: "Los Angeles County, CA",
      stcofips: "06037",
      overallRiskRating: "Very High",
      overallRiskScore: 100,
      expectedAnnualLossRating: "Very High",
      expectedAnnualLossScore: 100,
      socialVulnerabilityRating: "Relatively Moderate",
      socialVulnerabilityScore: 55.37531807,
      communityResilienceRating: "Very Low",
      communityResilienceScore: 13.549618320610687,
      hazards: Object.freeze({
        heatWave: "Relatively High",
        wildfire: "Very High",
        inlandFlooding: "Very High",
        coastalFlooding: "Relatively High",
        earthquake: "Very High",
        hurricane: "No Rating",
        tornado: "Relatively High",
        strongWind: "Relatively Moderate",
        lightning: "Very High",
        drought: "Relatively Low",
      }),
    }),
    "seattle-wa": Object.freeze({
      selectedPlace: Object.freeze({ city: "Seattle", stateCode: "WA" }),
      anchorCounty: "King County, WA",
      stcofips: "53033",
      overallRiskRating: "Very High",
      overallRiskScore: 99.681933842239189,
      expectedAnnualLossRating: "Very High",
      expectedAnnualLossScore: 99.721534653465355,
      socialVulnerabilityRating: "Very Low",
      socialVulnerabilityScore: 14.75826972,
      communityResilienceRating: "Very High",
      communityResilienceScore: 87.404580152671755,
      hazards: Object.freeze({
        heatWave: "Relatively High",
        wildfire: "Relatively Low",
        inlandFlooding: "Very High",
        coastalFlooding: "Relatively Moderate",
        earthquake: "Very High",
        hurricane: "Not Applicable",
        tornado: "Relatively Moderate",
        strongWind: "Very Low",
        lightning: "Relatively Moderate",
        drought: "Very Low",
      }),
    }),
    "austin-tx": Object.freeze({
      selectedPlace: Object.freeze({ city: "Austin", stateCode: "TX" }),
      anchorCounty: "Travis County, TX",
      stcofips: "48453",
      overallRiskRating: "Relatively High",
      overallRiskScore: 97.741730279898221,
      expectedAnnualLossRating: "Relatively High",
      expectedAnnualLossScore: 98.514851485148512,
      socialVulnerabilityRating: "Very Low",
      socialVulnerabilityScore: 14.75826972,
      communityResilienceRating: "Relatively High",
      communityResilienceScore: 73.25063613231552,
      hazards: Object.freeze({
        heatWave: "Relatively High",
        wildfire: "Relatively Moderate",
        inlandFlooding: "Relatively High",
        coastalFlooding: "Not Applicable",
        earthquake: "Very Low",
        hurricane: "Relatively Low",
        tornado: "Very High",
        strongWind: "Relatively High",
        lightning: "Relatively High",
        drought: "Relatively Low",
      }),
    }),
    "san-diego-ca": Object.freeze({
      selectedPlace: Object.freeze({ city: "San Diego", stateCode: "CA" }),
      anchorCounty: "San Diego County, CA",
      stcofips: "06073",
      overallRiskRating: "Very High",
      overallRiskScore: 99.713740458015266,
      expectedAnnualLossRating: "Very High",
      expectedAnnualLossScore: 99.690594059405953,
      socialVulnerabilityRating: "Relatively Low",
      socialVulnerabilityScore: 24.80916031,
      communityResilienceRating: "Very Low",
      communityResilienceScore: 8.3015267175572518,
      hazards: Object.freeze({
        heatWave: "Relatively High",
        wildfire: "Very High",
        inlandFlooding: "Very High",
        coastalFlooding: "Relatively Moderate",
        earthquake: "Relatively High",
        hurricane: "Very Low",
        tornado: "Relatively Low",
        strongWind: "Relatively Moderate",
        lightning: "Relatively Moderate",
        drought: "Relatively Low",
      }),
    }),
  }),
});

type SupportedClimateRiskMetroSlug =
  keyof typeof RESEARCH_METRO_CLIMATE_RISK_SOURCE.metros;

const hazardLabels = {
  heatWave: "Heat wave",
  wildfire: "Wildfire",
  inlandFlooding: "Inland flooding",
  coastalFlooding: "Coastal flooding",
  earthquake: "Earthquake",
  hurricane: "Hurricane",
  tornado: "Tornado",
  strongWind: "Strong wind",
  lightning: "Lightning",
  drought: "Drought",
} as const satisfies Record<keyof ClimateRiskRecord["hazards"], string>;

const hazardOrder = [
  "heatWave",
  "wildfire",
  "inlandFlooding",
  "coastalFlooding",
  "earthquake",
  "hurricane",
  "tornado",
  "strongWind",
  "lightning",
  "drought",
] as const satisfies readonly (keyof ClimateRiskRecord["hazards"])[];

const prominentHazards = (record: ClimateRiskRecord) =>
  hazardOrder
    .map((hazardId) => ({
      id: hazardId,
      label: hazardLabels[hazardId],
      rating: record.hazards[hazardId],
      rank: RISK_RATING_RANK[record.hazards[hazardId]],
    }))
    .filter(({ rank }) => rank >= RISK_RATING_RANK["Relatively High"])
    .sort((left, right) => right.rank - left.rank)
    .slice(0, 4)
    .map(({ id, label, rating }) => ({ id, label, rating }));

const riskDirectionFromScore = (
  destinationMinusOrigin: number,
): "lower" | "similar" | "higher" => {
  if (Math.abs(destinationMinusOrigin) < 1) return "similar";
  return destinationMinusOrigin < 0 ? "lower" : "higher";
};

export type ResearchMetroClimateRiskGuidance = Readonly<{
  version: typeof RESEARCH_METRO_CLIMATE_RISK_SOURCE.version;
  role: "Context only";
  origin: ClimateRiskRecord;
  destination: ClimateRiskRecord;
  riskScoreDifference: number;
  riskDirection: "lower" | "similar" | "higher";
  destinationProminentHazards: ReturnType<typeof prominentHazards>;
  summary: string;
  boundary: string;
  source: Readonly<{
    publisher: string;
    dataset: string;
    datasetVersion: string;
    layerUrl: string;
    serviceItemId: string;
    scope: string;
  }>;
}>;

export const getResearchMetroClimateRiskGuidance = (
  originSlug: string,
  destinationSlug: string,
): ResearchMetroClimateRiskGuidance | null => {
  const origin =
    RESEARCH_METRO_CLIMATE_RISK_SOURCE.metros[
      originSlug as SupportedClimateRiskMetroSlug
    ];
  const destination =
    RESEARCH_METRO_CLIMATE_RISK_SOURCE.metros[
      destinationSlug as SupportedClimateRiskMetroSlug
    ];
  if (
    origin === undefined ||
    destination === undefined ||
    originSlug === destinationSlug
  ) {
    return null;
  }

  const riskScoreDifference =
    destination.overallRiskScore - origin.overallRiskScore;
  const riskDirection = riskDirectionFromScore(riskScoreDifference);

  return Object.freeze({
    version: RESEARCH_METRO_CLIMATE_RISK_SOURCE.version,
    role: "Context only",
    origin,
    destination,
    riskScoreDifference,
    riskDirection,
    destinationProminentHazards: prominentHazards(destination),
    summary:
      riskDirection === "similar"
        ? "FEMA NRI county-level baseline risk is similar between these selected-city anchor counties."
        : `FEMA NRI county-level baseline risk is ${riskDirection} for the destination selected-city anchor county.`,
    boundary:
      "This is climate and natural-hazard context only. It uses FEMA National Risk Index county-level baseline risk for the selected-city anchor counties. It is not a metro-wide risk model, not a neighborhood or parcel rating, not an insurance quote, not an emergency alert, not a live forecast, not a climate-change projection, not a safety guarantee, and not a scored MoveWise rule.",
    source: Object.freeze({
      publisher: RESEARCH_METRO_CLIMATE_RISK_SOURCE.publisher,
      dataset: RESEARCH_METRO_CLIMATE_RISK_SOURCE.dataset,
      datasetVersion: RESEARCH_METRO_CLIMATE_RISK_SOURCE.datasetVersion,
      layerUrl: RESEARCH_METRO_CLIMATE_RISK_SOURCE.layerUrl,
      serviceItemId: RESEARCH_METRO_CLIMATE_RISK_SOURCE.serviceItemId,
      scope: RESEARCH_METRO_CLIMATE_RISK_SOURCE.scope,
    }),
  });
};
