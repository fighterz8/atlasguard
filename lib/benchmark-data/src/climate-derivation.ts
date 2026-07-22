import { applyRegisteredUtilityTransform } from "@workspace/contracts";
import type { PreferredDirection } from "@workspace/contracts";

import type { VerifiedRawClimateSnapshot } from "./raw-climate-snapshot";

export const CLIMATE_HEAT_METRIC_REGISTRATION = {
  priorityId: "climate_heat",
  metricId: "climate.annual_hot_days",
  definition:
    "Normal annual number of days with maximum temperature greater than 90 degrees Fahrenheit at the selected urban reference station.",
  unit: "days",
  transformationId: "climate_heat.utility",
  transformationVersion: "1.0.0",
  supportedDirections: ["lower", "higher"],
  materialityThresholdBps: 500,
  materialityRationale:
    "Research-only Phase 2 threshold inherited from the synthetic registry; it is not calibrated as a personal comfort or health threshold.",
  admissionStatus: "research_only",
  userFacingEligible: false,
} as const;

const applyClimateTransform = (
  rawValue: number,
  preferredDirection: PreferredDirection,
): number => {
  const result = applyRegisteredUtilityTransform({
    priorityId: CLIMATE_HEAT_METRIC_REGISTRATION.priorityId,
    metricId: CLIMATE_HEAT_METRIC_REGISTRATION.metricId,
    transformationId: CLIMATE_HEAT_METRIC_REGISTRATION.transformationId,
    transformationVersion:
      CLIMATE_HEAT_METRIC_REGISTRATION.transformationVersion,
    materialityThresholdBps:
      CLIMATE_HEAT_METRIC_REGISTRATION.materialityThresholdBps,
    unit: CLIMATE_HEAT_METRIC_REGISTRATION.unit,
    preferredDirection,
    rawValue,
  });
  if (result.status !== "ok" || result.utilityBps === null) {
    throw new Error(
      "Registered climate transformation rejected NOAA evidence.",
    );
  }
  return result.utilityBps;
};

export const deriveClimateHeatMetric = (
  snapshot: VerifiedRawClimateSnapshot,
  side: "origin" | "destination",
  preferredDirection: PreferredDirection,
) => {
  const place = snapshot.places.find((candidate) => candidate.side === side);
  if (place === undefined) throw new Error(`Climate snapshot lacks ${side}.`);
  const stations = place.envelopeStationIds.map((stationId) => {
    const station = snapshot.stations.find(
      (candidate) => candidate.stationId === stationId,
    );
    if (station === undefined) {
      throw new Error(`Climate snapshot lacks station ${stationId}.`);
    }
    return station;
  });
  const reference = stations.find(
    (station) => station.stationId === place.referenceStationId,
  );
  if (reference === undefined)
    throw new Error(`Climate snapshot lacks ${side} reference.`);

  const referenceUtilityBps = applyClimateTransform(
    reference.annualDaysAbove90F,
    preferredDirection,
  );
  const stationUtilities = stations.map((station) =>
    applyClimateTransform(station.annualDaysAbove90F, preferredDirection),
  );
  const stationValues = stations.map(
    ({ annualDaysAbove90F }) => annualDaysAbove90F,
  );

  return Object.freeze({
    referenceStationId: reference.stationId,
    referenceStationName: reference.name,
    annualDaysAbove90F: reference.annualDaysAbove90F,
    envelopeMinDays: Math.min(...stationValues),
    envelopeMaxDays: Math.max(...stationValues),
    utilityBps: referenceUtilityBps,
    utilityUncertaintyBps: Math.max(
      ...stationUtilities.map((utility) =>
        Math.abs(utility - referenceUtilityBps),
      ),
    ),
  });
};
