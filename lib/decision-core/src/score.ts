import {
  calculateMoveWiseScorePoint,
  verifyMoveWiseScore,
} from "@workspace/contracts";
import type {
  ScenarioInput,
  VerifiedEvaluationResult,
  VerifiedMoveWiseScore,
  VerifiedResearchEvaluationResult,
} from "@workspace/contracts";

import { evaluateMoveDecision, evaluateResearchMoveDecision } from "./evaluate";
import { enumeratePlausibleFinancialEndpoints } from "./financial-range-endpoints";

export type MoveWiseScoreEvaluation =
  | VerifiedEvaluationResult
  | VerifiedResearchEvaluationResult;

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
  const { variedInputPaths, scenarios: endpointScenarios } =
    enumeratePlausibleFinancialEndpoints(scenarioInput);
  if (endpointScenarios.length === 0) return pointScore;

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
        variedInputPaths,
        minInputFingerprintSha256: minimum.inputFingerprintSha256,
        maxInputFingerprintSha256: maximum.inputFingerprintSha256,
      },
    },
    decisionProfile,
  );
};
