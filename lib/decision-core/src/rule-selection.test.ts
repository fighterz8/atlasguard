import {
  calculateBenchmarkComparisonChecksum,
  verifyBenchmarkComparison,
} from "@workspace/contracts";
import type {
  BenchmarkComparison,
  VerifiedBenchmarkComparison,
} from "@workspace/contracts";
import { describe, expect, it } from "vitest";

import { financialAndClimateUpsideBenchmark } from "../../contracts/src/fixtures/financial-and-climate-upside-benchmark-v1";
import { financialAndClimateUpsideInput } from "../../contracts/src/fixtures/financial-and-climate-upside-v1";
import { evaluateMoveDecision } from "./evaluate";
import { deterministicModelCalibrationCorpus } from "./fixtures/deterministic-model-calibration-v1";
import {
  MoveWiseRuleSelectionError,
  evaluateMoveWiseRule,
} from "./rule-selection";
import { evaluateMoveWiseAnalysis } from "./score-insights";

const clone = <Value>(value: Value): Value => structuredClone(value);

const verifiedBenchmark = (): VerifiedBenchmarkComparison => {
  const comparison = clone(
    financialAndClimateUpsideBenchmark,
  ) as BenchmarkComparison;
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

const verifiedEvaluation = () =>
  evaluateMoveDecision(
    clone(financialAndClimateUpsideInput),
    verifiedBenchmark(),
  );

const acceptedInput = () => {
  const fixture = deterministicModelCalibrationCorpus.fixtures.find(
    ({ id }) => id === "F03",
  );
  if (fixture?.kind !== "scenario") {
    throw new Error("F03 must remain a scenario fixture.");
  }
  return clone(fixture.input);
};

describe("MoveWise rule selection", () => {
  it("defaults verified evaluations to rule 0.1.0 without changing analysis", () => {
    const evaluation = verifiedEvaluation();
    const selected = evaluateMoveWiseRule({ evaluation });

    expect(selected).toEqual({
      ruleVersion: "0.1.0",
      analysis: evaluateMoveWiseAnalysis(evaluation),
    });
    expect(Object.isFrozen(selected)).toBe(true);
  });

  it("keeps explicit rule 0.1.0 equivalent to the safe default", () => {
    const evaluation = verifiedEvaluation();

    expect(evaluateMoveWiseRule({ ruleVersion: "0.1.0", evaluation })).toEqual(
      evaluateMoveWiseRule({ evaluation }),
    );
  });

  it("runs accepted rule 0.2.0 only when explicitly selected with complete input", () => {
    const selected = evaluateMoveWiseRule({
      ruleVersion: "0.2.0",
      input: acceptedInput(),
    });

    expect(selected).toMatchObject({
      ruleVersion: "0.2.0",
      analysis: {
        ruleVersion: "0.2.0",
        value: 100,
        condition: "likely_better_move",
        band: "substantially_better_fit",
      },
    });
    expect(Object.isFrozen(selected)).toBe(true);
    expect(Object.isFrozen(selected.analysis)).toBe(true);
  });

  it("fails closed for unknown, incomplete, or mixed rule requests", () => {
    const evaluation = verifiedEvaluation();
    const invalidRequests: unknown[] = [
      {},
      { ruleVersion: "0.2.0" },
      { ruleVersion: "9.9.9", evaluation },
      { ruleVersion: "0.1.0", input: acceptedInput() },
      {
        ruleVersion: "0.2.0",
        evaluation,
        input: acceptedInput(),
      },
    ];

    for (const request of invalidRequests) {
      expect(() => evaluateMoveWiseRule(request)).toThrow(
        MoveWiseRuleSelectionError,
      );
    }
  });

  it("rejects malformed rule 0.2.0 inputs at the contract boundary", () => {
    const malformed = {
      ...acceptedInput(),
      lowCushionCautionThresholdCents: 0,
    };

    expect(() =>
      evaluateMoveWiseRule({ ruleVersion: "0.2.0", input: malformed }),
    ).toThrow();
  });
});
