import type { PreferredDirection, PriorityId } from "./primitives";

const clampBasisPoints = (value: number): number =>
  Math.min(10_000, Math.max(0, Math.round(value)));

type UtilityTransformDefinition = {
  priorityId: PriorityId;
  metricId: string;
  transformationId: string;
  transformationVersion: string;
  materialityThresholdBps: number;
  unit: string;
  supportedDirections: readonly PreferredDirection[];
  rawRange: { min: number; max: number };
  lowerIsBetterUtility: (rawValue: number) => number;
};

const UTILITY_TRANSFORM_REGISTRY: readonly UtilityTransformDefinition[] = [
  {
    priorityId: "climate_heat",
    metricId: "climate.annual_hot_days",
    transformationId: "climate_heat.utility",
    transformationVersion: "1.0.0",
    materialityThresholdBps: 500,
    unit: "days",
    supportedDirections: ["lower", "higher"],
    rawRange: { min: 0, max: 366 },
    // Phase 0 calibration anchors: 80 hot days -> 3,000 bps and 40 -> 7,000.
    lowerIsBetterUtility: (rawValue) => 11_000 - rawValue * 100,
  },
  {
    priorityId: "commute_time",
    metricId: "commute.mean_minutes",
    transformationId: "commute_time.utility",
    transformationVersion: "1.0.0",
    materialityThresholdBps: 500,
    unit: "minutes",
    supportedDirections: ["lower"],
    rawRange: { min: 0, max: 240 },
    // Phase 0 anchors: 28 minutes -> 7,200 bps and 30 -> 6,900.
    lowerIsBetterUtility: (rawValue) => 11_400 - rawValue * 150,
  },
] as const;

export const PHASE0_SUPPORTED_PRIORITY_IDS = [
  ...new Set(UTILITY_TRANSFORM_REGISTRY.map((entry) => entry.priorityId)),
] as readonly PriorityId[];

export const isPhase0PrioritySupported = (priorityId: PriorityId): boolean =>
  PHASE0_SUPPORTED_PRIORITY_IDS.includes(priorityId);

export type UtilityTransformRequest = {
  priorityId: PriorityId;
  metricId: string;
  transformationId: string;
  transformationVersion: string;
  materialityThresholdBps: number;
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
      candidate.priorityId === request.priorityId &&
      candidate.metricId === request.metricId &&
      candidate.transformationId === request.transformationId &&
      candidate.transformationVersion === request.transformationVersion &&
      candidate.materialityThresholdBps === request.materialityThresholdBps &&
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
