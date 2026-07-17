import type { PreferredDirection } from "./primitives";

const clampBasisPoints = (value: number): number =>
  Math.min(10_000, Math.max(0, Math.round(value)));

type UtilityTransformDefinition = {
  metricId: string;
  transformationId: string;
  transformationVersion: string;
  unit: string;
  supportedDirections: readonly PreferredDirection[];
  rawRange: { min: number; max: number };
  lowerIsBetterUtility: (rawValue: number) => number;
};

const UTILITY_TRANSFORM_REGISTRY: readonly UtilityTransformDefinition[] = [
  {
    metricId: "climate.annual_hot_days",
    transformationId: "climate_heat.utility",
    transformationVersion: "1.0.0",
    unit: "days",
    supportedDirections: ["lower", "higher"],
    rawRange: { min: 0, max: 366 },
    // Phase 0 calibration anchors: 80 hot days -> 3,000 bps and 40 -> 7,000.
    lowerIsBetterUtility: (rawValue) => 11_000 - rawValue * 100,
  },
  {
    metricId: "commute.mean_minutes",
    transformationId: "commute_time.utility",
    transformationVersion: "1.0.0",
    unit: "minutes",
    supportedDirections: ["lower"],
    rawRange: { min: 0, max: 240 },
    // Phase 0 anchors: 28 minutes -> 7,200 bps and 30 -> 6,900.
    lowerIsBetterUtility: (rawValue) => 11_400 - rawValue * 150,
  },
] as const;

export type UtilityTransformRequest = {
  metricId: string;
  transformationId: string;
  transformationVersion: string;
  unit: string;
  preferredDirection: PreferredDirection;
  rawValue: number | null;
};

export type UtilityTransformResult =
  | { status: "ok"; utilityBps: number | null }
  | { status: "unsupported" };

export const applyRegisteredUtilityTransform = (
  request: UtilityTransformRequest,
): UtilityTransformResult => {
  const definition = UTILITY_TRANSFORM_REGISTRY.find(
    (candidate) =>
      candidate.metricId === request.metricId &&
      candidate.transformationId === request.transformationId &&
      candidate.transformationVersion === request.transformationVersion &&
      candidate.unit === request.unit &&
      candidate.supportedDirections.includes(request.preferredDirection),
  );

  if (definition === undefined) {
    return { status: "unsupported" };
  }
  if (request.rawValue === null) {
    return { status: "ok", utilityBps: null };
  }
  if (
    !Number.isFinite(request.rawValue) ||
    request.rawValue < definition.rawRange.min ||
    request.rawValue > definition.rawRange.max
  ) {
    return { status: "unsupported" };
  }

  const lowerUtility = clampBasisPoints(
    definition.lowerIsBetterUtility(request.rawValue),
  );
  return {
    status: "ok",
    utilityBps:
      request.preferredDirection === "lower"
        ? lowerUtility
        : 10_000 - lowerUtility,
  };
};
