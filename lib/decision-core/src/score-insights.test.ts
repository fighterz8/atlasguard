import {
  calculateBenchmarkComparisonChecksum,
  verifyBenchmarkComparison,
} from "@workspace/contracts";
import type {
  BenchmarkComparison,
  ScenarioInput,
  VerifiedBenchmarkComparison,
} from "@workspace/contracts";
import { describe, expect, it } from "vitest";

import { financialAndClimateUpsideBenchmark } from "../../contracts/src/fixtures/financial-and-climate-upside-benchmark-v1";
import { financialAndClimateUpsideInput } from "../../contracts/src/fixtures/financial-and-climate-upside-v1";
import { evaluateMoveDecision } from "./evaluate";
import {
  deriveMoveWiseScoreInsights,
  evaluateMoveWiseAnalysis,
} from "./score-insights";

const clone = <Value>(value: Value): Value =>
  JSON.parse(JSON.stringify(value)) as Value;

const cloneInput = (): ScenarioInput => clone(financialAndClimateUpsideInput);

const checksumAndVerify = (
  comparison: BenchmarkComparison,
): VerifiedBenchmarkComparison => {
  const placeholder = "0".repeat(64);
  comparison.snapshot.sha256 = placeholder;
  comparison.priorities.forEach((priority) => {
    priority.evidence.snapshotSha256 = placeholder;
  });
  const checksum = calculateBenchmarkComparisonChecksum(comparison);
  comparison.snapshot.sha256 = checksum;
  comparison.priorities.forEach((priority) => {
    priority.evidence.snapshotSha256 = checksum;
  });
  return verifyBenchmarkComparison(comparison);
};

const verifiedBenchmark = (): VerifiedBenchmarkComparison =>
  checksumAndVerify(clone(financialAndClimateUpsideBenchmark));

const evaluate = (input: ScenarioInput = cloneInput()) =>
  evaluateMoveDecision(input, verifiedBenchmark());

describe("MoveWise Score insights", () => {
  it("turns the golden evaluation into a stable internal analysis", () => {
    const analysis = evaluateMoveWiseAnalysis(evaluate());

    expect(analysis.score).toMatchObject({
      value: 69,
      range: { min: 61, max: 77 },
    });
    expect(analysis.insights).toEqual({
      strongestImprovement: {
        metricId: "financial_cushion_delta",
        componentId: "financial_security",
        contribution: 12,
        messageCode: "insight.financial_cushion_improves",
        evidenceRefs: expect.arrayContaining([
          "derived.financial.cushion_delta",
        ]),
      },
      strongestTradeoff: {
        metricId: "commute_time",
        componentId: "daily_life_fit",
        contribution: -3,
        messageCode: "insight.commute_time_worsens",
        evidenceRefs: ["benchmark.commute_time.fixture"],
      },
      activeBlocker: null,
      missingComponents: ["household_fit", "opportunity_context"],
      decisionChangingAssumption: {
        breakpointId:
          "breakpoint.destination_housing.meaningful_tradeoff.225000",
        inputPath: "finances.destination.housingCost.monthlyCents",
        operator: "at_or_above",
        thresholdCents: 225_000,
        currentValueCents: 170_000,
        distanceCents: 55_000,
        withinPlausibleRange: false,
        changesConditionTo: "meaningful_tradeoff",
        messageCode: "insight.verify_destination_housing_threshold",
        evidenceRefs: ["input.destination.housing"],
      },
    });
    expect(Object.isFrozen(analysis)).toBe(true);
    expect(Object.isFrozen(analysis.insights)).toBe(true);
    expect(Object.isFrozen(analysis.insights.strongestImprovement)).toBe(true);
  });

  it("surfaces the strictest active blocker with its evidence", () => {
    const input = cloneInput();
    input.finances.origin.housingCost.monthlyCents = 700_000;
    input.finances.destination.recurringExpensesExcludingHousing.monthlyCents = 400_000;
    input.finances.destination.recurringExpensesExcludingHousing.basis =
      "confirmed";
    input.finances.destination.recurringExpensesExcludingHousing.plausibleRangeCents =
      null;

    expect(
      evaluateMoveWiseAnalysis(evaluate(input)).insights.activeBlocker,
    ).toEqual({
      code: "negative_target_cushion",
      componentId: "financial_security",
      scoreCap: 59,
      messageCode: "insight.blocker.negative_target_cushion",
      evidenceRefs: expect.arrayContaining([
        "derived.financial.destination_monthly_cushion",
      ]),
      inputPaths: expect.arrayContaining([
        "finances.destination.takeHomeIncome.monthlyCents",
      ]),
    });
  });

  it("does not invent a tradeoff from excluded or zero-contribution metrics", () => {
    const input = cloneInput();
    input.priorities.find(
      ({ priorityId }) => priorityId === "commute_time",
    )!.weight = 0;

    const analysis = evaluateMoveWiseAnalysis(evaluate(input));

    expect(analysis.insights.strongestTradeoff).toBeNull();
    expect(analysis.insights.strongestImprovement?.metricId).toBe(
      "financial_cushion_delta",
    );
  });

  it("prefers an in-range decision threshold and remains deterministic", () => {
    const input = cloneInput();
    input.finances.destination.housingCost.plausibleRangeCents = {
      min: 160_000,
      max: 230_000,
    };
    const evaluation = evaluate(input);

    const first = deriveMoveWiseScoreInsights(evaluation);
    const second = deriveMoveWiseScoreInsights(evaluation);

    expect(first).toEqual(second);
    expect(first.decisionChangingAssumption).toMatchObject({
      inputPath: "finances.destination.housingCost.monthlyCents",
      thresholdCents: 225_000,
      withinPlausibleRange: true,
    });
  });
});
