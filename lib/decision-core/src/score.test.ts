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
import { evaluateMoveWiseScore, MoveWiseScorePreflightError } from "./score";

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

const verifiedBenchmarkWith = (
  mutate: (comparison: BenchmarkComparison) => void = () => undefined,
) => {
  const benchmark = clone(financialAndClimateUpsideBenchmark);
  mutate(benchmark);
  return checksumAndVerify(benchmark);
};

const confirmedInput = (): ScenarioInput => {
  const input = cloneInput();
  input.finances.destination.housingCost.basis = "confirmed";
  input.finances.destination.housingCost.plausibleRangeCents = null;
  input.finances.destination.recurringExpensesExcludingHousing.basis =
    "confirmed";
  input.finances.destination.recurringExpensesExcludingHousing.plausibleRangeCents =
    null;
  return input;
};

const scoreInput = (input: ScenarioInput) =>
  evaluateMoveWiseScore(evaluateMoveDecision(input, verifiedBenchmarkWith()));

describe("MoveWise Score evaluation", () => {
  it("derives a deterministic range from accepted plausible endpoints", () => {
    const score = scoreInput(cloneInput());

    expect(score).toMatchObject({
      value: 69,
      band: "better_fit",
      range: {
        min: 61,
        max: 77,
        method: "plausible_financial_endpoints",
        variedInputPaths: [
          "finances.destination.housingCost.monthlyCents",
          "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
        ],
        minInputFingerprintSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        maxInputFingerprintSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
    });
    expect(score.range?.minInputFingerprintSha256).not.toBe(
      score.range?.maxInputFingerprintSha256,
    );
    expect(Object.isFrozen(score.range)).toBe(true);
  });

  it("omits the range when all score-relevant values are confirmed", () => {
    expect(scoreInput(confirmedInput()).range).toBeNull();
  });

  it("keeps destination income monotonic across blocker boundaries", () => {
    const values = [300_000, 400_000, 500_000, 600_000, 700_000];
    const scores = values.map((monthlyCents) => {
      const input = confirmedInput();
      input.finances.destination.takeHomeIncome.monthlyCents = monthlyCents;
      return scoreInput(input).value;
    });

    expect(scores).toEqual([...scores].sort((left, right) => left - right));
  });

  it("keeps destination housing and recurring expenses anti-monotonic", () => {
    for (const field of [
      "housingCost",
      "recurringExpensesExcludingHousing",
    ] as const) {
      const values = [100_000, 150_000, 200_000, 250_000, 300_000];
      const scores = values.map((monthlyCents) => {
        const input = confirmedInput();
        input.finances.destination[field].monthlyCents = monthlyCents;
        return scoreInput(input).value;
      });
      expect(scores).toEqual([...scores].sort((left, right) => right - left));
    }
  });

  it("applies blocker precedence when other contributions are favorable", () => {
    const negativeCushion = confirmedInput();
    negativeCushion.finances.origin.housingCost.monthlyCents = 700_000;
    negativeCushion.finances.destination.recurringExpensesExcludingHousing.monthlyCents = 400_000;
    const negativeScore = scoreInput(negativeCushion);
    expect(negativeScore).toMatchObject({
      value: 59,
      band: "mixed_or_similar",
      rawContribution: 37,
      appliedCap: 59,
      activeBlockers: [
        expect.objectContaining({ code: "negative_target_cushion" }),
      ],
    });

    const highBurden = confirmedInput();
    highBurden.finances.destination.grossIncome = {
      monthlyCents: 340_000,
      basis: "confirmed",
      plausibleRangeCents: null,
    };
    expect(scoreInput(highBurden)).toMatchObject({
      value: 59,
      appliedCap: 59,
      activeBlockers: [
        expect.objectContaining({
          code: "target_housing_burden_at_or_above_50_percent",
        }),
      ],
    });
  });

  it("rejects same-metro evaluations instead of fabricating move improvement", () => {
    const input = confirmedInput();
    input.destinationMetroSlug = input.originMetroSlug;
    const benchmark = verifiedBenchmarkWith((comparison) => {
      comparison.destination = clone(comparison.origin);
      comparison.priorities.forEach((priority) => {
        priority.destinationUtilityBps = priority.originUtilityBps;
        priority.evidence.geographies.destination = clone(
          priority.evidence.geographies.origin,
        );
        priority.evidence.destinationValue = priority.evidence.originValue;
        priority.evidence.deltaValue = 0;
        priority.evidence.transformation.outputs.destinationUtilityBps =
          priority.evidence.transformation.outputs.originUtilityBps;
        priority.evidence.transformation.outputs.destinationUncertaintyBps =
          priority.evidence.transformation.outputs.originUncertaintyBps;
      });
    });
    const evaluation = evaluateMoveDecision(input, benchmark);

    expect(() => evaluateMoveWiseScore(evaluation)).toThrow(
      MoveWiseScorePreflightError,
    );
  });
});
