import {
  DeterministicModelCalibrationInputSchema,
  DETERMINISTIC_MODEL_RULE_CANDIDATE_VERSION,
} from "@workspace/contracts";
import type { DeterministicModelCalibrationInput } from "@workspace/contracts";

export type DeterministicModelCandidateResult = Readonly<{
  ruleVersion: "0.2.0";
  value: number;
  rawContribution: number;
  band:
    | "worse_fit"
    | "mixed_or_similar"
    | "better_fit"
    | "substantially_better_fit";
  condition:
    | "likely_better_move"
    | "worth_closer_look"
    | "promising_if"
    | "no_clear_advantage"
    | "high_financial_risk";
  stability: "stable" | "assumption_sensitive";
  appliedCap: number | null;
  activeBlockerCodes: readonly string[];
  rangeBlockerCodes: readonly string[];
  cautionCodes: readonly string[];
  conditionalRequirementIds: readonly string[];
  unmetRequirementIds: readonly string[];
  range: Readonly<{ min: number; max: number }> | null;
  metricContributions: Readonly<{
    financial: Readonly<{ status: string; contribution: number }>;
    commute: Readonly<{ status: string; contribution: number }>;
    climate: Readonly<{ status: string; contribution: number }>;
    household: Readonly<{ status: string; contribution: number }>;
    opportunity: Readonly<{ status: string; contribution: number }>;
  }>;
}>;

type Impact = DeterministicModelCalibrationInput["commuteImpact"];

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const roundHalfAwayFromZero = (value: number): number =>
  value < 0 ? -Math.round(Math.abs(value)) : Math.round(value);

const bandFor = (value: number): DeterministicModelCandidateResult["band"] => {
  if (value <= 39) return "worse_fit";
  if (value <= 59) return "mixed_or_similar";
  if (value <= 79) return "better_fit";
  return "substantially_better_fit";
};

const contributionForImpact = (impact: Impact, maximum = 5): number => {
  switch (impact) {
    case "strong_positive":
      return maximum;
    case "positive":
      return Math.ceil(maximum / 2);
    case "negative":
      return -Math.ceil(maximum / 2);
    case "strong_negative":
      return -maximum;
    case "neutral":
    case "excluded":
    case "unavailable":
      return 0;
  }
};

const householdContributionForImpact = (impact: Impact): number => {
  switch (impact) {
    case "strong_positive":
      return 15;
    case "positive":
      return 10;
    case "negative":
      return -10;
    case "strong_negative":
      return -15;
    case "neutral":
    case "excluded":
    case "unavailable":
      return 0;
  }
};

const statusForImpact = (
  impact: Impact,
): "available" | "excluded" | "unavailable" =>
  impact === "excluded" || impact === "unavailable" ? impact : "available";

const evaluatePoint = (
  input: DeterministicModelCalibrationInput,
): DeterministicModelCandidateResult => {
  const activeBlockerCodes: string[] = [];
  const cautionCodes: string[] = [];
  if (
    input.destinationMonthlyCushionCents !== null &&
    input.destinationMonthlyCushionCents < 0
  ) {
    activeBlockerCodes.push("negative_destination_cushion");
  }
  if (
    input.destinationHousingBurdenBps !== null &&
    input.destinationHousingBurdenBps >= 5_000
  ) {
    activeBlockerCodes.push(
      "destination_housing_burden_at_or_above_50_percent",
    );
  }
  if (
    input.destinationMonthlyCushionCents !== null &&
    input.destinationMonthlyCushionCents >= 0 &&
    input.destinationMonthlyCushionCents < input.lowCushionCautionThresholdCents
  ) {
    cautionCodes.push("low_destination_cushion");
  }
  if (
    input.destinationHousingBurdenBps !== null &&
    input.destinationHousingBurdenBps >= 4_500 &&
    input.destinationHousingBurdenBps < 5_000
  ) {
    cautionCodes.push("destination_housing_burden_at_or_above_45_percent");
  }

  const financialContribution =
    input.monthlyCushionDeltaCents === null
      ? 0
      : clamp(
          roundHalfAwayFromZero(
            (input.monthlyCushionDeltaCents * 10) /
              input.financialMaterialityThresholdCents,
          ),
          -30,
          30,
        );
  const commuteContribution = contributionForImpact(input.commuteImpact, 10);
  const climateContribution = contributionForImpact(input.climateImpact, 10);
  const householdContribution = clamp(
    input.householdSignals.reduce(
      (total, signal) => total + householdContributionForImpact(signal.impact),
      0,
    ),
    -30,
    30,
  );

  const conditionalRequirementIds = input.essentialRequirements
    .filter(({ status }) => status === "unconfirmed")
    .map(({ requirementId }) => requirementId)
    .sort();
  const unmetRequirementIds = input.essentialRequirements
    .filter(({ status }) => status === "confirmed_unmet")
    .map(({ requirementId }) => requirementId)
    .sort();

  let appliedCap: number | null = null;
  if (activeBlockerCodes.includes("negative_destination_cushion")) {
    appliedCap = 39;
  } else if (
    activeBlockerCodes.includes(
      "destination_housing_burden_at_or_above_50_percent",
    )
  ) {
    appliedCap = 59;
  } else if (
    cautionCodes.length > 0 ||
    conditionalRequirementIds.length > 0 ||
    unmetRequirementIds.length > 0 ||
    input.householdSignals.some(({ impact }) => impact === "strong_negative")
  ) {
    appliedCap = 59;
  }

  const uncappedRawValue = clamp(
    50 +
      financialContribution +
      commuteContribution +
      climateContribution +
      householdContribution,
    1,
    100,
  );
  const value =
    appliedCap === null
      ? uncappedRawValue
      : Math.min(uncappedRawValue, appliedCap);
  let condition: DeterministicModelCandidateResult["condition"];
  if (activeBlockerCodes.length > 0) {
    condition = "high_financial_risk";
  } else if (conditionalRequirementIds.length > 0) {
    condition = "promising_if";
  } else if (unmetRequirementIds.length > 0 || cautionCodes.length > 0) {
    condition = "no_clear_advantage";
  } else if (value >= 80) {
    condition = "likely_better_move";
  } else if (value >= 60) {
    condition = "worth_closer_look";
  } else {
    condition = "no_clear_advantage";
  }

  return deepFreeze({
    ruleVersion: DETERMINISTIC_MODEL_RULE_CANDIDATE_VERSION,
    value,
    rawContribution:
      financialContribution +
      commuteContribution +
      climateContribution +
      householdContribution,
    band: bandFor(value),
    condition,
    stability: "stable",
    appliedCap,
    activeBlockerCodes,
    rangeBlockerCodes: [],
    cautionCodes,
    conditionalRequirementIds,
    unmetRequirementIds,
    range: null,
    metricContributions: {
      financial: {
        status:
          input.monthlyCushionDeltaCents === null ? "unavailable" : "available",
        contribution: financialContribution,
      },
      commute: {
        status: statusForImpact(input.commuteImpact),
        contribution: commuteContribution,
      },
      climate: {
        status: statusForImpact(input.climateImpact),
        contribution: climateContribution,
      },
      household: {
        status:
          input.householdSignals.length === 0 ? "unavailable" : "available",
        contribution: householdContribution,
      },
      opportunity: { status: "unavailable", contribution: 0 },
    },
  });
};

type DeepReadonly<Value> = Value extends (...args: never[]) => unknown
  ? Value
  : Value extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : Value extends object
      ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
      : Value;

const deepFreeze = <Value>(value: Value): DeepReadonly<Value> => {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach((nested) => deepFreeze(nested));
    Object.freeze(value);
  }
  return value as DeepReadonly<Value>;
};

export class DeterministicModelPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeterministicModelPreflightError";
  }
}

export const evaluateDeterministicModelCandidate = (
  rawInput: DeterministicModelCalibrationInput,
): DeterministicModelCandidateResult => {
  const input = DeterministicModelCalibrationInputSchema.parse(rawInput);
  if (input.originMetroSlug === input.destinationMetroSlug) {
    throw new DeterministicModelPreflightError(
      "Deterministic model candidate requires different metros.",
    );
  }
  if (input.destinationMonthlyCushionRangeCents === null) {
    return evaluatePoint(input);
  }

  const endpointResults = [
    input.destinationMonthlyCushionRangeCents.min,
    input.destinationMonthlyCushionRangeCents.max,
  ].map((destinationMonthlyCushionCents) =>
    evaluatePoint({
      ...input,
      destinationMonthlyCushionCents,
      destinationMonthlyCushionRangeCents: null,
    }),
  );
  const rangeBlockerCodes = Array.from(
    new Set(
      endpointResults.flatMap(({ activeBlockerCodes }) => activeBlockerCodes),
    ),
  ).sort();
  const point = evaluatePoint({
    ...input,
    destinationMonthlyCushionCents: null,
    destinationMonthlyCushionRangeCents: null,
  });
  const values = endpointResults.map(({ value }) => value);
  const value =
    rangeBlockerCodes.length > 0 ? Math.min(point.value, 59) : point.value;
  return deepFreeze({
    ...point,
    value,
    band: bandFor(value),
    condition: rangeBlockerCodes.length > 0 ? "promising_if" : point.condition,
    stability:
      Math.min(...values) === Math.max(...values)
        ? "stable"
        : "assumption_sensitive",
    range: { min: Math.min(...values), max: Math.max(...values) },
    rangeBlockerCodes,
  });
};
