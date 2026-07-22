import type { DeterministicModelInput } from "@workspace/contracts";

import {
  evaluateDeterministicModel,
  type DeterministicModelResult,
} from "./deterministic-model-0-2";
import {
  evaluateMoveWiseAnalysis,
  type MoveWiseAnalysis,
} from "./score-insights";
import type { MoveWiseScoreEvaluation } from "./score";

export type MoveWiseRule010Selection = Readonly<{
  ruleVersion?: "0.1.0";
  evaluation: MoveWiseScoreEvaluation;
}>;

export type MoveWiseRule020Selection = Readonly<{
  ruleVersion: "0.2.0";
  input: DeterministicModelInput;
}>;

export type MoveWiseRuleSelection =
  | MoveWiseRule010Selection
  | MoveWiseRule020Selection;

export type MoveWiseRule010Result = Readonly<{
  ruleVersion: "0.1.0";
  analysis: MoveWiseAnalysis;
}>;

export type MoveWiseRule020Result = Readonly<{
  ruleVersion: "0.2.0";
  analysis: DeterministicModelResult;
}>;

export type MoveWiseRuleResult = MoveWiseRule010Result | MoveWiseRule020Result;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const hasOnlyKeys = (
  value: Record<string, unknown>,
  permitted: readonly string[],
): boolean => Object.keys(value).every((key) => permitted.includes(key));

const freezeSelection = <Result extends MoveWiseRuleResult>(
  result: Result,
): Result => Object.freeze(result);

export class MoveWiseRuleSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoveWiseRuleSelectionError";
  }
}

export function evaluateMoveWiseRule(
  request: MoveWiseRule010Selection,
): MoveWiseRule010Result;
export function evaluateMoveWiseRule(
  request: MoveWiseRule020Selection,
): MoveWiseRule020Result;
export function evaluateMoveWiseRule(request: unknown): MoveWiseRuleResult {
  if (!isRecord(request)) {
    throw new MoveWiseRuleSelectionError(
      "MoveWise rule selection requires a request object.",
    );
  }

  const ruleVersion = request.ruleVersion;
  if (ruleVersion === undefined || ruleVersion === "0.1.0") {
    if (
      !("evaluation" in request) ||
      "input" in request ||
      !hasOnlyKeys(request, ["ruleVersion", "evaluation"])
    ) {
      throw new MoveWiseRuleSelectionError(
        "Rule 0.1.0 requires only a verified evaluation.",
      );
    }
    return freezeSelection({
      ruleVersion: "0.1.0",
      analysis: evaluateMoveWiseAnalysis(
        request.evaluation as MoveWiseScoreEvaluation,
      ),
    });
  }

  if (ruleVersion === "0.2.0") {
    if (
      !("input" in request) ||
      "evaluation" in request ||
      !hasOnlyKeys(request, ["ruleVersion", "input"])
    ) {
      throw new MoveWiseRuleSelectionError(
        "Rule 0.2.0 requires only its complete normalized input.",
      );
    }
    return freezeSelection({
      ruleVersion: "0.2.0",
      analysis: evaluateDeterministicModel(
        request.input as DeterministicModelInput,
      ),
    });
  }

  throw new MoveWiseRuleSelectionError(
    `Unsupported MoveWise rule version: ${String(ruleVersion)}.`,
  );
}
