import {
  calculateMoveWiseScorePoint,
  verifyMoveWiseScore,
} from "@workspace/contracts";
import type {
  FinancialInputPath,
  ScenarioInput,
  VerifiedEvaluationResult,
  VerifiedMoveWiseScore,
  VerifiedResearchEvaluationResult,
} from "@workspace/contracts";

import { evaluateMoveDecision, evaluateResearchMoveDecision } from "./evaluate";

export type MoveWiseScoreEvaluation =
  | VerifiedEvaluationResult
  | VerifiedResearchEvaluationResult;

type MutableScenarioRange = Readonly<{
  min: number;
  max: number;
}>;

type RangeDescriptor = Readonly<{
  inputPath: FinancialInputPath;
  read: (scenario: ScenarioInput) => Readonly<{
    plausibleRangeCents: MutableScenarioRange | null;
  }> | null;
  write: (scenario: ScenarioInput, value: number) => void;
}>;

const RANGE_DESCRIPTORS: readonly RangeDescriptor[] = [
  {
    inputPath: "finances.origin.takeHomeIncome.monthlyCents",
    read: (scenario) => scenario.finances.origin.takeHomeIncome,
    write: (scenario, value) => {
      scenario.finances.origin.takeHomeIncome.monthlyCents = value;
    },
  },
  {
    inputPath: "finances.origin.housingCost.monthlyCents",
    read: (scenario) => scenario.finances.origin.housingCost,
    write: (scenario, value) => {
      scenario.finances.origin.housingCost.monthlyCents = value;
    },
  },
  {
    inputPath: "finances.origin.recurringExpensesExcludingHousing.monthlyCents",
    read: (scenario) =>
      scenario.finances.origin.recurringExpensesExcludingHousing,
    write: (scenario, value) => {
      scenario.finances.origin.recurringExpensesExcludingHousing.monthlyCents =
        value;
    },
  },
  {
    inputPath: "finances.destination.takeHomeIncome.monthlyCents",
    read: (scenario) => scenario.finances.destination.takeHomeIncome,
    write: (scenario, value) => {
      scenario.finances.destination.takeHomeIncome.monthlyCents = value;
    },
  },
  {
    inputPath: "finances.destination.grossIncome.monthlyCents",
    read: (scenario) => scenario.finances.destination.grossIncome,
    write: (scenario, value) => {
      const grossIncome = scenario.finances.destination.grossIncome;
      if (grossIncome === null) {
        throw new Error("Cannot vary an unavailable gross-income assumption.");
      }
      grossIncome.monthlyCents = value;
    },
  },
  {
    inputPath: "finances.destination.housingCost.monthlyCents",
    read: (scenario) => scenario.finances.destination.housingCost,
    write: (scenario, value) => {
      scenario.finances.destination.housingCost.monthlyCents = value;
    },
  },
  {
    inputPath:
      "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
    read: (scenario) =>
      scenario.finances.destination.recurringExpensesExcludingHousing,
    write: (scenario, value) => {
      scenario.finances.destination.recurringExpensesExcludingHousing.monthlyCents =
        value;
    },
  },
  {
    inputPath: "finances.destination.retainedPropertyNet.monthlyCents",
    read: (scenario) => scenario.finances.destination.retainedPropertyNet,
    write: (scenario, value) => {
      scenario.finances.destination.retainedPropertyNet.monthlyCents = value;
    },
  },
];

const cloneScenario = (
  scenario: ScenarioInput | MoveWiseScoreEvaluation["scenarioInput"],
): ScenarioInput => JSON.parse(JSON.stringify(scenario)) as ScenarioInput;

const reevaluate = (
  evaluation: MoveWiseScoreEvaluation,
  scenario: ScenarioInput,
): MoveWiseScoreEvaluation =>
  evaluation.releaseStatus === "research_only"
    ? evaluateResearchMoveDecision(scenario, evaluation.benchmarkComparison)
    : evaluateMoveDecision(scenario, evaluation.benchmarkComparison);

export class MoveWiseScorePreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoveWiseScorePreflightError";
  }
}

export const evaluateMoveWiseScore = (
  evaluation: MoveWiseScoreEvaluation,
): VerifiedMoveWiseScore => {
  const { decisionProfile, scenarioInput } = evaluation;
  if (
    decisionProfile.scenario.origin.slug ===
    decisionProfile.scenario.destination.slug
  ) {
    throw new MoveWiseScorePreflightError(
      "A MoveWise Score requires different origin and destination metros.",
    );
  }

  const pointScore = calculateMoveWiseScorePoint(decisionProfile);
  const mutableScenarioInput = cloneScenario(scenarioInput);
  const rangedInputs = RANGE_DESCRIPTORS.flatMap((descriptor) => {
    const range = descriptor.read(mutableScenarioInput)?.plausibleRangeCents;
    return range !== null && range !== undefined && range.min < range.max
      ? [{ ...descriptor, range }]
      : [];
  });
  if (rangedInputs.length === 0) return pointScore;

  let endpointScenarios = [mutableScenarioInput];
  rangedInputs.forEach((descriptor) => {
    endpointScenarios = endpointScenarios.flatMap((scenario) =>
      [descriptor.range.min, descriptor.range.max].map((value) => {
        const endpoint = cloneScenario(scenario);
        descriptor.write(endpoint, value);
        return endpoint;
      }),
    );
  });

  const endpoints = endpointScenarios
    .map((scenario) => {
      const endpointEvaluation = reevaluate(evaluation, scenario);
      const score = calculateMoveWiseScorePoint(
        endpointEvaluation.decisionProfile,
      );
      return {
        value: score.value,
        inputFingerprintSha256:
          endpointEvaluation.decisionProfile.inputFingerprintSha256,
      };
    })
    .sort(
      (left, right) =>
        left.value - right.value ||
        left.inputFingerprintSha256.localeCompare(right.inputFingerprintSha256),
    );
  const minimum = endpoints[0];
  const maximumValue = endpoints.at(-1)?.value;
  const maximum = endpoints.find((endpoint) => endpoint.value === maximumValue);
  if (minimum === undefined || maximum === undefined) {
    throw new MoveWiseScorePreflightError(
      "Score range evaluation produced no endpoints.",
    );
  }
  if (minimum.value === maximum.value) return pointScore;
  if (pointScore.value < minimum.value || pointScore.value > maximum.value) {
    throw new MoveWiseScorePreflightError(
      "The point score fell outside its plausible endpoint range.",
    );
  }

  return verifyMoveWiseScore(
    {
      ...pointScore,
      range: {
        min: minimum.value,
        max: maximum.value,
        method: "plausible_financial_endpoints",
        variedInputPaths: rangedInputs.map(({ inputPath }) => inputPath).sort(),
        minInputFingerprintSha256: minimum.inputFingerprintSha256,
        maxInputFingerprintSha256: maximum.inputFingerprintSha256,
      },
    },
    decisionProfile,
  );
};
