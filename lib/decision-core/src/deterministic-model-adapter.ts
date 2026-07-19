import {
  DETERMINISTIC_MODEL_INPUT_SCHEMA_VERSION,
  DETERMINISTIC_MODEL_RULE_VERSION,
  DeterministicModelInputSchema,
  roundHalfAwayFromZero,
} from "@workspace/contracts";
import type {
  DeterministicModelInput,
  FinancialInputPath,
  ScenarioInput,
  VerifiedEvaluationResult,
  VerifiedMoveWiseHouseholdAnswers,
  VerifiedResearchEvaluationResult,
} from "@workspace/contracts";

import {
  applyDeterministicModelEndpointRange,
  evaluateDeterministicModel,
} from "./deterministic-model-0-2";
import type { DeterministicModelResult } from "./deterministic-model-0-2";
import { evaluateMoveDecision, evaluateResearchMoveDecision } from "./evaluate";
import { enumeratePlausibleFinancialEndpoints } from "./financial-range-endpoints";

export const MOVEWISE_DETERMINISTIC_ANALYSIS_SCHEMA_VERSION = "1.0.0" as const;

type MoveWiseEvaluation =
  | VerifiedEvaluationResult
  | VerifiedResearchEvaluationResult;
type EvaluationPriorityChange =
  MoveWiseEvaluation["decisionProfile"]["priorityChanges"][number];

export type MoveWiseDeterministicRangeEndpoint = Readonly<{
  value: number;
  inputFingerprintSha256: string;
  blockerCodes: readonly string[];
  cautionCodes: readonly string[];
}>;

export type MoveWiseDeterministicRange = Readonly<{
  min: number;
  max: number;
  variedInputPaths: readonly FinancialInputPath[];
  blockerCodes: readonly string[];
  cautionCodes: readonly string[];
  endpoints: readonly MoveWiseDeterministicRangeEndpoint[];
}>;

export type MoveWiseDeterministicAnalysis = Readonly<{
  schemaVersion: typeof MOVEWISE_DETERMINISTIC_ANALYSIS_SCHEMA_VERSION;
  ruleVersion: typeof DETERMINISTIC_MODEL_RULE_VERSION;
  input: DeterministicModelInput;
  result: DeterministicModelResult;
  range: MoveWiseDeterministicRange | null;
  reproducibility: Readonly<{
    inputFingerprintSha256: string;
    benchmarkSnapshotVersion: string;
    benchmarkSnapshotSha256: string;
    decisionProfileSchemaVersion: string;
    decisionRuleVersion: string;
    deterministicModelSchemaVersion: string;
    deterministicModelRuleVersion: typeof DETERMINISTIC_MODEL_RULE_VERSION;
    householdQuestionVersion: string;
    householdAnswerSha256: string;
    variedInputPaths: readonly FinancialInputPath[];
    endpointInputFingerprintSha256: readonly string[];
  }>;
}>;

type DeepReadonly<Value> = Value extends (...args: never[]) => unknown
  ? Value
  : Value extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : Value extends object
      ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
      : Value;

const deepFreeze = <Value>(value: Value): DeepReadonly<Value> => {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach((nestedValue) => deepFreeze(nestedValue));
    Object.freeze(value);
  }
  return value as DeepReadonly<Value>;
};

export class MoveWiseDeterministicAdapterPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoveWiseDeterministicAdapterPreflightError";
  }
}

const priorityImpact = (
  change: EvaluationPriorityChange,
): DeterministicModelInput["commuteImpact"] => {
  if (change.weight === 0) return "excluded";
  if (change.availability === "unavailable") return "unavailable";
  switch (change.classification) {
    case "similar":
      return "neutral";
    case "improves":
      return change.material ? "strong_positive" : "positive";
    case "worsens":
      return change.material ? "strong_negative" : "negative";
    case "unavailable":
      throw new MoveWiseDeterministicAdapterPreflightError(
        `Available priority ${change.priorityId} cannot be classified unavailable.`,
      );
  }
};

const requiredPriority = (
  evaluation: MoveWiseEvaluation,
  priorityId: "commute_time" | "climate_heat",
): EvaluationPriorityChange => {
  const change = evaluation.decisionProfile.priorityChanges.find(
    (candidate) => candidate.priorityId === priorityId,
  );
  if (change === undefined) {
    throw new MoveWiseDeterministicAdapterPreflightError(
      `Rule 0.2.0 requires the registered ${priorityId} priority.`,
    );
  }
  return change;
};

export const adaptVerifiedEvaluationToDeterministicModelInput = (
  evaluation: MoveWiseEvaluation,
  householdAnswers: VerifiedMoveWiseHouseholdAnswers,
): DeterministicModelInput => {
  const { decisionProfile } = evaluation;
  const { financialPosition } = decisionProfile;
  const parsed = DeterministicModelInputSchema.parse({
    originMetroSlug: decisionProfile.scenario.origin.slug,
    destinationMetroSlug: decisionProfile.scenario.destination.slug,
    monthlyCushionDeltaCents: financialPosition.change.monthlyCushionDeltaCents,
    destinationMonthlyCushionCents:
      financialPosition.destination.monthlyCushionCents,
    destinationMonthlyCushionRangeCents: null,
    financialMaterialityThresholdCents:
      financialPosition.change.materialityThresholdCents,
    lowCushionCautionThresholdCents: Math.max(
      50_000,
      roundHalfAwayFromZero(
        financialPosition.destination.monthlyTakeHomeIncomeCents / 10,
      ),
    ),
    destinationHousingBurdenBps: financialPosition.destination.housingBurdenBps,
    commuteImpact: priorityImpact(requiredPriority(evaluation, "commute_time")),
    climateImpact: priorityImpact(requiredPriority(evaluation, "climate_heat")),
    householdMode: householdAnswers.mode,
    householdSignals: householdAnswers.factors.map((answer) => ({
      signalId: answer.factorId,
      impact: answer.impact,
    })),
    essentialRequirements: householdAnswers.factors.flatMap((answer) =>
      answer.importance === "essential" && answer.essentialStatus !== null
        ? [
            {
              requirementId: answer.factorId,
              status: answer.essentialStatus,
            },
          ]
        : [],
    ),
  });

  return deepFreeze(parsed) as DeterministicModelInput;
};

const reevaluate = (
  evaluation: MoveWiseEvaluation,
  scenario: ScenarioInput,
): MoveWiseEvaluation =>
  evaluation.releaseStatus === "research_only"
    ? evaluateResearchMoveDecision(scenario, evaluation.benchmarkComparison)
    : evaluateMoveDecision(scenario, evaluation.benchmarkComparison);

const sortedUnion = (values: readonly (readonly string[])[]): string[] =>
  Array.from(new Set(values.flat())).sort();

export const evaluateMoveWiseDeterministicModel = (
  evaluation: MoveWiseEvaluation,
  householdAnswers: VerifiedMoveWiseHouseholdAnswers,
): MoveWiseDeterministicAnalysis => {
  const input = adaptVerifiedEvaluationToDeterministicModelInput(
    evaluation,
    householdAnswers,
  );
  const point = evaluateDeterministicModel(input);
  const { variedInputPaths, scenarios } = enumeratePlausibleFinancialEndpoints(
    evaluation.scenarioInput,
  );
  const endpoints = scenarios
    .map((scenario) => {
      const endpointEvaluation = reevaluate(evaluation, scenario);
      const endpointInput = adaptVerifiedEvaluationToDeterministicModelInput(
        endpointEvaluation,
        householdAnswers,
      );
      const result = evaluateDeterministicModel(endpointInput);
      return {
        result,
        value: result.value,
        inputFingerprintSha256:
          endpointEvaluation.decisionProfile.inputFingerprintSha256,
        blockerCodes: result.activeBlockerCodes,
        cautionCodes: result.cautionCodes,
      };
    })
    .sort(
      (left, right) =>
        left.value - right.value ||
        left.inputFingerprintSha256.localeCompare(right.inputFingerprintSha256),
    );
  if (
    endpoints.length > 0 &&
    (point.value < endpoints[0]!.value || point.value > endpoints.at(-1)!.value)
  ) {
    throw new MoveWiseDeterministicAdapterPreflightError(
      "The deterministic-model point fell outside its plausible endpoint range.",
    );
  }

  const result =
    endpoints.length === 0
      ? point
      : applyDeterministicModelEndpointRange(
          point,
          endpoints.map((endpoint) => endpoint.result),
        );
  const range =
    endpoints.length === 0
      ? null
      : {
          min: endpoints[0]!.value,
          max: endpoints.at(-1)!.value,
          variedInputPaths,
          blockerCodes: sortedUnion(
            endpoints.map(({ blockerCodes }) => blockerCodes),
          ),
          cautionCodes: sortedUnion(
            endpoints.map(({ cautionCodes }) => cautionCodes),
          ),
          endpoints: endpoints.map(
            ({
              value,
              inputFingerprintSha256,
              blockerCodes,
              cautionCodes,
            }) => ({
              value,
              inputFingerprintSha256,
              blockerCodes,
              cautionCodes,
            }),
          ),
        };

  return deepFreeze({
    schemaVersion: MOVEWISE_DETERMINISTIC_ANALYSIS_SCHEMA_VERSION,
    ruleVersion: DETERMINISTIC_MODEL_RULE_VERSION,
    input,
    result,
    range,
    reproducibility: {
      inputFingerprintSha256: evaluation.decisionProfile.inputFingerprintSha256,
      benchmarkSnapshotVersion: evaluation.benchmarkComparison.snapshot.version,
      benchmarkSnapshotSha256: evaluation.benchmarkComparison.snapshot.sha256,
      decisionProfileSchemaVersion: evaluation.decisionProfile.schemaVersion,
      decisionRuleVersion:
        evaluation.decisionProfile.scenario.decisionRuleVersion,
      deterministicModelSchemaVersion: DETERMINISTIC_MODEL_INPUT_SCHEMA_VERSION,
      deterministicModelRuleVersion: DETERMINISTIC_MODEL_RULE_VERSION,
      householdQuestionVersion: householdAnswers.questionVersion,
      householdAnswerSha256: householdAnswers.sha256,
      variedInputPaths,
      endpointInputFingerprintSha256: endpoints.map(
        ({ inputFingerprintSha256 }) => inputFingerprintSha256,
      ),
    },
  }) as MoveWiseDeterministicAnalysis;
};
