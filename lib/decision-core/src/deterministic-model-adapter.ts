import {
  calculateHousingBurdenBps,
  DETERMINISTIC_MODEL_INPUT_SCHEMA_VERSION,
  DETERMINISTIC_MODEL_RULE_VERSION,
  DeterministicModelInputSchema,
  FINANCIAL_INPUT_EVIDENCE_IDS,
  MAX_MONTHLY_CENTS,
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

export const MOVEWISE_DETERMINISTIC_ANALYSIS_SCHEMA_VERSION = "1.1.0" as const;

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

export type MoveWiseDeterministicDecisionChange = Readonly<{
  inputPath: FinancialInputPath;
  operator: "at_or_above" | "at_or_below";
  currentValueCents: number;
  thresholdCents: number;
  distanceCents: number;
  changesConditionTo: DeterministicModelResult["condition"];
  withinPlausibleRange: boolean;
  evidenceRefs: readonly string[];
}>;

export type MoveWiseDeterministicAnalysis = Readonly<{
  schemaVersion: typeof MOVEWISE_DETERMINISTIC_ANALYSIS_SCHEMA_VERSION;
  ruleVersion: typeof DETERMINISTIC_MODEL_RULE_VERSION;
  input: DeterministicModelInput;
  result: DeterministicModelResult;
  range: MoveWiseDeterministicRange | null;
  decisionChanges: readonly MoveWiseDeterministicDecisionChange[];
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

const DETERMINISTIC_DECISION_CHANGE_PATHS = [
  "finances.destination.takeHomeIncome.monthlyCents",
  "finances.destination.grossIncome.monthlyCents",
  "finances.destination.housingCost.monthlyCents",
  "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
  "finances.destination.retainedPropertyNet.monthlyCents",
] as const satisfies readonly FinancialInputPath[];

type DeterministicDecisionChangePath =
  (typeof DETERMINISTIC_DECISION_CHANGE_PATHS)[number];

const assumptionForDecisionChange = (
  scenario: ScenarioInput | DeepReadonly<ScenarioInput>,
  path: DeterministicDecisionChangePath,
) => {
  const destination = scenario.finances.destination;
  switch (path) {
    case "finances.destination.takeHomeIncome.monthlyCents":
      return destination.takeHomeIncome;
    case "finances.destination.grossIncome.monthlyCents":
      return destination.grossIncome;
    case "finances.destination.housingCost.monthlyCents":
      return destination.housingCost;
    case "finances.destination.recurringExpensesExcludingHousing.monthlyCents":
      return destination.recurringExpensesExcludingHousing;
    case "finances.destination.retainedPropertyNet.monthlyCents":
      return destination.retainedPropertyNet;
  }
};

const inputAtDecisionChangeValue = (
  input: DeterministicModelInput,
  scenario: ScenarioInput | DeepReadonly<ScenarioInput>,
  path: DeterministicDecisionChangePath,
  value: number,
): DeterministicModelInput => {
  if (
    input.monthlyCushionDeltaCents === null ||
    input.destinationMonthlyCushionCents === null
  ) {
    throw new MoveWiseDeterministicAdapterPreflightError(
      "Rule 0.2.0 decision-change analysis requires exact financial cushions.",
    );
  }
  const destination = scenario.finances.destination;
  const assumption = assumptionForDecisionChange(scenario, path);
  if (assumption === null) {
    throw new MoveWiseDeterministicAdapterPreflightError(
      `Cannot vary unavailable input ${path}.`,
    );
  }
  const change = value - assumption.monthlyCents;
  const addsToCushion =
    path === "finances.destination.takeHomeIncome.monthlyCents" ||
    path === "finances.destination.retainedPropertyNet.monthlyCents";
  const changesCushion =
    path !== "finances.destination.grossIncome.monthlyCents";
  const cushionChange = changesCushion ? (addsToCushion ? change : -change) : 0;
  const housingCents =
    path === "finances.destination.housingCost.monthlyCents"
      ? value
      : destination.housingCost.monthlyCents;
  const grossIncomeCents =
    path === "finances.destination.grossIncome.monthlyCents"
      ? value
      : (destination.grossIncome?.monthlyCents ?? null);
  const takeHomeCents =
    path === "finances.destination.takeHomeIncome.monthlyCents"
      ? value
      : destination.takeHomeIncome.monthlyCents;

  const housingBurdenBps = calculateHousingBurdenBps(
    housingCents,
    grossIncomeCents,
  );

  return {
    ...input,
    monthlyCushionDeltaCents: input.monthlyCushionDeltaCents + cushionChange,
    destinationMonthlyCushionCents:
      input.destinationMonthlyCushionCents + cushionChange,
    lowCushionCautionThresholdCents: Math.max(
      50_000,
      roundHalfAwayFromZero(takeHomeCents / 10),
    ),
    destinationHousingBurdenBps:
      housingBurdenBps === null ? null : Math.min(10_000, housingBurdenBps),
  };
};

const deriveDecisionChanges = (
  scenario: ScenarioInput | DeepReadonly<ScenarioInput>,
  input: DeterministicModelInput,
  baseline: DeterministicModelResult,
): MoveWiseDeterministicDecisionChange[] =>
  DETERMINISTIC_DECISION_CHANGE_PATHS.flatMap((path) => {
    const assumption = assumptionForDecisionChange(scenario, path);
    if (assumption === null) return [];
    const currentValueCents = assumption.monthlyCents;
    const minimum =
      path === "finances.destination.retainedPropertyNet.monthlyCents"
        ? -MAX_MONTHLY_CENTS
        : path === "finances.destination.grossIncome.monthlyCents"
          ? 1
          : 0;
    const maximum =
      path === "finances.destination.retainedPropertyNet.monthlyCents" &&
      input.destinationMonthlyCushionCents !== null &&
      input.monthlyCushionDeltaCents !== null
        ? Math.min(
            MAX_MONTHLY_CENTS,
            currentValueCents +
              (MAX_MONTHLY_CENTS - input.destinationMonthlyCushionCents),
            currentValueCents +
              (MAX_MONTHLY_CENTS - input.monthlyCushionDeltaCents),
          )
        : MAX_MONTHLY_CENTS;
    const cache = new Map<number, DeterministicModelResult["condition"]>();
    const conditionAt = (value: number) => {
      const cached = cache.get(value);
      if (cached !== undefined) return cached;
      const condition = evaluateDeterministicModel(
        inputAtDecisionChangeValue(input, scenario, path, value),
      ).condition;
      cache.set(value, condition);
      return condition;
    };
    const thresholdForRight = () => {
      if (
        currentValueCents >= maximum ||
        conditionAt(maximum) === baseline.condition
      ) {
        return null;
      }
      let low = currentValueCents + 1;
      let high = maximum;
      while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if (conditionAt(middle) === baseline.condition) low = middle + 1;
        else high = middle;
      }
      return low;
    };
    const thresholdForLeft = () => {
      if (
        currentValueCents <= minimum ||
        conditionAt(minimum) === baseline.condition
      ) {
        return null;
      }
      let low = minimum;
      let high = currentValueCents;
      while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if (conditionAt(middle) === baseline.condition) high = middle;
        else low = middle + 1;
      }
      return low - 1;
    };
    const plausibleRange = assumption.plausibleRangeCents;
    return [
      { thresholdCents: thresholdForLeft(), operator: "at_or_below" as const },
      { thresholdCents: thresholdForRight(), operator: "at_or_above" as const },
    ].flatMap(({ thresholdCents, operator }) =>
      thresholdCents === null
        ? []
        : [
            {
              inputPath: path,
              operator,
              currentValueCents,
              thresholdCents,
              distanceCents: Math.abs(thresholdCents - currentValueCents),
              changesConditionTo: conditionAt(thresholdCents),
              withinPlausibleRange:
                plausibleRange !== null &&
                thresholdCents >= plausibleRange.min &&
                thresholdCents <= plausibleRange.max,
              evidenceRefs: [FINANCIAL_INPUT_EVIDENCE_IDS[path]],
            },
          ],
    );
  }).sort(
    (left, right) =>
      Number(right.withinPlausibleRange) - Number(left.withinPlausibleRange) ||
      left.distanceCents - right.distanceCents ||
      left.inputPath.localeCompare(right.inputPath) ||
      left.operator.localeCompare(right.operator),
  );

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
  const lastEndpoint = endpoints[endpoints.length - 1];
  if (
    lastEndpoint !== undefined &&
    (point.value < endpoints[0]!.value || point.value > lastEndpoint.value)
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
          max: lastEndpoint!.value,
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
  const decisionChanges = deriveDecisionChanges(
    evaluation.scenarioInput,
    input,
    point,
  );

  return deepFreeze({
    schemaVersion: MOVEWISE_DETERMINISTIC_ANALYSIS_SCHEMA_VERSION,
    ruleVersion: DETERMINISTIC_MODEL_RULE_VERSION,
    input,
    result,
    range,
    decisionChanges,
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
