import { applyRegisteredUtilityTransform } from "@workspace/contracts";

import type { VerifiedRawCommuteSnapshot } from "./raw-snapshot";

export const COMMUTE_METRIC_REGISTRATION = {
  priorityId: "commute_time",
  metricId: "commute.mean_minutes",
  definition:
    "Mean one-way travel time to work among workers age 16 and over who did not work from home.",
  unit: "minutes",
  transformationId: "commute_time.utility",
  transformationVersion: "1.0.0",
  preferredDirection: "lower",
  materialityThresholdBps: 500,
  materialityRationale:
    "Research-only Phase 1 threshold inherited from the synthetic Phase 0 registry; it is not yet calibrated for user-facing recommendations.",
  admissionStatus: "research_only",
  userFacingEligible: false,
} as const;

type MetroRecord = Pick<
  VerifiedRawCommuteSnapshot["metros"][number],
  | "cbsaCode"
  | "aggregateTravelTimeMinutes"
  | "workers16AndOver"
  | "workedFromHome"
>;

export type DerivedCommuteMetric = Readonly<{
  cbsaCode: string;
  meanMinutes: number;
  marginOfError90Minutes: number;
  displayMeanMinutes: number;
  displayMarginOfError90Minutes: number;
  utilityBps: number;
  utilityUncertaintyBps: number;
}>;

const roundOneDecimalHalfUp = (value: number): number =>
  Math.round((value + Number.EPSILON) * 10) / 10;

/**
 * Computes a scaled Euclidean norm using only specified IEEE-754 operations.
 * Native Math.hypot implementations may differ by one final bit across JS
 * engines, which is enough to invalidate checksum-bound derived profiles.
 */
const calculatePortableHypot = (...values: readonly number[]): number => {
  let sum = 0;
  let largest = 0;

  for (const value of values) {
    const magnitude = Math.abs(value);
    if (largest < magnitude) {
      const ratio = largest / magnitude;
      sum = sum * ratio * ratio + 1;
      largest = magnitude;
    } else if (magnitude > 0) {
      const ratio = magnitude / largest;
      sum += ratio * ratio;
    }
  }

  return largest === Infinity ? Infinity : largest * Math.sqrt(sum);
};

const DERIVED_DECIMAL_PLACES = 12;
const DERIVED_DECIMAL_SCALE = 10 ** DERIVED_DECIMAL_PLACES;

/**
 * Normalizes derived floating-point evidence before it enters a checksum-bound
 * profile. Twelve decimal places are far more precise than the ACS source and
 * displayed MOE while removing engine-specific libm differences.
 */
export const normalizeDerivedDecimal = (value: number): number =>
  Math.round(value * DERIVED_DECIMAL_SCALE) / DERIVED_DECIMAL_SCALE;

const applyCommuteTransform = (rawValue: number): number => {
  const result = applyRegisteredUtilityTransform({
    priorityId: COMMUTE_METRIC_REGISTRATION.priorityId,
    metricId: COMMUTE_METRIC_REGISTRATION.metricId,
    transformationId: COMMUTE_METRIC_REGISTRATION.transformationId,
    transformationVersion: COMMUTE_METRIC_REGISTRATION.transformationVersion,
    materialityThresholdBps:
      COMMUTE_METRIC_REGISTRATION.materialityThresholdBps,
    unit: COMMUTE_METRIC_REGISTRATION.unit,
    preferredDirection: COMMUTE_METRIC_REGISTRATION.preferredDirection,
    rawValue,
  });
  if (result.status !== "ok" || result.utilityBps === null) {
    throw new Error("Registered commute transformation rejected source data.");
  }
  return result.utilityBps;
};

/**
 * Reproduces the ACS profile-table mean from its published detail-table
 * components. The MOE is a zero-covariance approximation because the bulk
 * files do not expose covariance terms; it is not claimed as an upper bound.
 */
export const deriveCommuteMetric = (
  record: MetroRecord,
): DerivedCommuteMetric => {
  const nonHomeWorkers =
    record.workers16AndOver.estimate - record.workedFromHome.estimate;
  const nonHomeWorkersMoe = calculatePortableHypot(
    record.workers16AndOver.marginOfError90,
    record.workedFromHome.marginOfError90,
  );
  const unroundedMean =
    record.aggregateTravelTimeMinutes.estimate / nonHomeWorkers;
  const unroundedMoe =
    calculatePortableHypot(
      record.aggregateTravelTimeMinutes.marginOfError90,
      unroundedMean * nonHomeWorkersMoe,
    ) / nonHomeWorkers;
  const meanMinutes = normalizeDerivedDecimal(unroundedMean);
  const marginOfError90Minutes = normalizeDerivedDecimal(unroundedMoe);
  const utilityBps = applyCommuteTransform(meanMinutes);
  const lowerBoundUtility = applyCommuteTransform(
    Math.max(0, meanMinutes - marginOfError90Minutes),
  );
  const upperBoundUtility = applyCommuteTransform(
    meanMinutes + marginOfError90Minutes,
  );

  return Object.freeze({
    cbsaCode: record.cbsaCode,
    meanMinutes,
    marginOfError90Minutes,
    displayMeanMinutes: roundOneDecimalHalfUp(meanMinutes),
    displayMarginOfError90Minutes: roundOneDecimalHalfUp(
      marginOfError90Minutes,
    ),
    utilityBps,
    utilityUncertaintyBps: Math.max(
      Math.abs(lowerBoundUtility - utilityBps),
      Math.abs(upperBoundUtility - utilityBps),
    ),
  });
};
