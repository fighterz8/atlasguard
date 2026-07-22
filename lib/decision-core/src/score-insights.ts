import type {
  FinancialInputPath,
  VerifiedMoveWiseScore,
} from "@workspace/contracts";

import { evaluateMoveWiseScore, type MoveWiseScoreEvaluation } from "./score";

type ScoreMetricId =
  | "financial_cushion_delta"
  | "commute_time"
  | "climate_heat";

type ScoreComponentId =
  | "financial_security"
  | "daily_life_fit"
  | "opportunity_context"
  | "household_fit";

type MetricInsight = Readonly<{
  metricId: ScoreMetricId;
  componentId: ScoreComponentId;
  contribution: number;
  messageCode:
    | "insight.financial_cushion_improves"
    | "insight.financial_cushion_worsens"
    | "insight.commute_time_improves"
    | "insight.commute_time_worsens"
    | "insight.climate_heat_improves"
    | "insight.climate_heat_worsens";
  evidenceRefs: readonly string[];
}>;

type BlockerInsight = Readonly<{
  code:
    | "negative_target_cushion"
    | "target_housing_burden_at_or_above_50_percent";
  componentId: "financial_security";
  scoreCap: number;
  messageCode:
    | "insight.blocker.negative_target_cushion"
    | "insight.blocker.target_housing_burden_at_or_above_50_percent";
  evidenceRefs: readonly string[];
  inputPaths: readonly FinancialInputPath[];
}>;

type DecisionChangingAssumptionInsight = Readonly<{
  breakpointId: string;
  inputPath: FinancialInputPath;
  operator: "at_or_below" | "at_or_above";
  thresholdCents: number;
  currentValueCents: number;
  distanceCents: number;
  withinPlausibleRange: boolean;
  changesConditionTo:
    | "worth_a_closer_look"
    | "meaningful_tradeoff"
    | "high_financial_risk_under_assumptions";
  messageCode:
    | "insight.verify_destination_take_home_threshold"
    | "insight.verify_destination_gross_income_threshold"
    | "insight.verify_destination_housing_threshold"
    | "insight.verify_destination_recurring_expenses_threshold"
    | "insight.verify_retained_property_threshold";
  evidenceRefs: readonly string[];
}>;

export type MoveWiseScoreInsights = Readonly<{
  strongestImprovement: MetricInsight | null;
  strongestTradeoff: MetricInsight | null;
  activeBlocker: BlockerInsight | null;
  missingComponents: readonly ScoreComponentId[];
  decisionChangingAssumption: DecisionChangingAssumptionInsight | null;
}>;

export type MoveWiseAnalysis = Readonly<{
  score: VerifiedMoveWiseScore;
  insights: MoveWiseScoreInsights;
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
    Object.values(value).forEach((nested) => deepFreeze(nested));
    Object.freeze(value);
  }
  return value as DeepReadonly<Value>;
};

const compareIds = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const metricMessageCode = (
  metricId: ScoreMetricId,
  contribution: number,
): MetricInsight["messageCode"] => {
  const direction = contribution > 0 ? "improves" : "worsens";
  const messageMetric =
    metricId === "financial_cushion_delta" ? "financial_cushion" : metricId;
  return `insight.${messageMetric}_${direction}` as MetricInsight["messageCode"];
};

const metricInsights = (score: VerifiedMoveWiseScore): MetricInsight[] =>
  score.componentContributions.flatMap((component) =>
    component.metricContributions.flatMap((metric) =>
      metric.status === "available" && metric.contribution !== 0
        ? [
            {
              metricId: metric.metricId,
              componentId: metric.componentId,
              contribution: metric.contribution,
              messageCode: metricMessageCode(
                metric.metricId,
                metric.contribution,
              ),
              evidenceRefs: [...metric.evidenceRefs],
            },
          ]
        : [],
    ),
  );

const currentValueCents = (
  evaluation: MoveWiseScoreEvaluation,
  inputPath: FinancialInputPath,
): number | null => {
  const { finances } = evaluation.scenarioInput;
  switch (inputPath) {
    case "finances.origin.takeHomeIncome.monthlyCents":
      return finances.origin.takeHomeIncome.monthlyCents;
    case "finances.origin.grossIncome.monthlyCents":
      return finances.origin.grossIncome?.monthlyCents ?? null;
    case "finances.origin.housingCost.monthlyCents":
      return finances.origin.housingCost.monthlyCents;
    case "finances.origin.recurringExpensesExcludingHousing.monthlyCents":
      return finances.origin.recurringExpensesExcludingHousing.monthlyCents;
    case "finances.destination.takeHomeIncome.monthlyCents":
      return finances.destination.takeHomeIncome.monthlyCents;
    case "finances.destination.grossIncome.monthlyCents":
      return finances.destination.grossIncome?.monthlyCents ?? null;
    case "finances.destination.housingCost.monthlyCents":
      return finances.destination.housingCost.monthlyCents;
    case "finances.destination.recurringExpensesExcludingHousing.monthlyCents":
      return finances.destination.recurringExpensesExcludingHousing
        .monthlyCents;
    case "finances.destination.retainedPropertyNet.monthlyCents":
      return finances.destination.retainedPropertyNet.monthlyCents;
  }
};

const thresholdMessageCode = (
  inputPath: FinancialInputPath,
): DecisionChangingAssumptionInsight["messageCode"] | null => {
  switch (inputPath) {
    case "finances.destination.takeHomeIncome.monthlyCents":
      return "insight.verify_destination_take_home_threshold";
    case "finances.destination.grossIncome.monthlyCents":
      return "insight.verify_destination_gross_income_threshold";
    case "finances.destination.housingCost.monthlyCents":
      return "insight.verify_destination_housing_threshold";
    case "finances.destination.recurringExpensesExcludingHousing.monthlyCents":
      return "insight.verify_destination_recurring_expenses_threshold";
    case "finances.destination.retainedPropertyNet.monthlyCents":
      return "insight.verify_retained_property_threshold";
    default:
      return null;
  }
};

const decisionChangingAssumption = (
  evaluation: MoveWiseScoreEvaluation,
): DecisionChangingAssumptionInsight | null => {
  const candidates = evaluation.decisionProfile.breakpoints
    .flatMap((breakpoint) => {
      if (breakpoint.kind !== "money") return [];
      const current = currentValueCents(evaluation, breakpoint.inputPath);
      const messageCode = thresholdMessageCode(breakpoint.inputPath);
      if (current === null || messageCode === null) return [];
      return [
        {
          breakpointId: breakpoint.id,
          inputPath: breakpoint.inputPath,
          operator: breakpoint.operator,
          thresholdCents: breakpoint.thresholdCents,
          currentValueCents: current,
          distanceCents: Math.abs(breakpoint.thresholdCents - current),
          withinPlausibleRange: breakpoint.withinPlausibleRange,
          changesConditionTo: breakpoint.changesConditionTo,
          messageCode,
          evidenceRefs: [...breakpoint.evidenceRefs].sort(compareIds),
        },
      ];
    })
    .sort(
      (left, right) =>
        Number(right.withinPlausibleRange) -
          Number(left.withinPlausibleRange) ||
        left.distanceCents - right.distanceCents ||
        compareIds(left.inputPath, right.inputPath) ||
        compareIds(left.breakpointId, right.breakpointId),
    );
  return candidates[0] ?? null;
};

const buildInsights = (
  evaluation: MoveWiseScoreEvaluation,
  score: VerifiedMoveWiseScore,
): MoveWiseScoreInsights => {
  const metrics = metricInsights(score);
  const strongestImprovement =
    metrics
      .filter(({ contribution }) => contribution > 0)
      .sort(
        (left, right) =>
          right.contribution - left.contribution ||
          compareIds(left.metricId, right.metricId),
      )[0] ?? null;
  const strongestTradeoff =
    metrics
      .filter(({ contribution }) => contribution < 0)
      .sort(
        (left, right) =>
          left.contribution - right.contribution ||
          compareIds(left.metricId, right.metricId),
      )[0] ?? null;
  const blocker = [...score.activeBlockers].sort(
    (left, right) =>
      left.scoreCap - right.scoreCap || compareIds(left.code, right.code),
  )[0];
  const activeBlocker =
    blocker === undefined
      ? null
      : {
          ...blocker,
          messageCode:
            `insight.blocker.${blocker.code}` as BlockerInsight["messageCode"],
          evidenceRefs: [...blocker.evidenceRefs],
          inputPaths: [...blocker.inputPaths],
        };

  return deepFreeze({
    strongestImprovement,
    strongestTradeoff,
    activeBlocker,
    missingComponents: score.componentContributions
      .filter(({ status }) => status === "unavailable")
      .map(({ componentId }) => componentId)
      .sort(compareIds),
    decisionChangingAssumption: decisionChangingAssumption(evaluation),
  }) as MoveWiseScoreInsights;
};

export const deriveMoveWiseScoreInsights = (
  evaluation: MoveWiseScoreEvaluation,
): MoveWiseScoreInsights => {
  const score = evaluateMoveWiseScore(evaluation);
  return buildInsights(evaluation, score);
};

export const evaluateMoveWiseAnalysis = (
  evaluation: MoveWiseScoreEvaluation,
): MoveWiseAnalysis => {
  const score = evaluateMoveWiseScore(evaluation);
  return deepFreeze({
    score,
    insights: buildInsights(evaluation, score),
  }) as MoveWiseAnalysis;
};
