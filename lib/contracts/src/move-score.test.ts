import { describe, expect, it } from "vitest";

import type { DecisionProfile } from "./decision-profile";
import { financialAndClimateUpsideProfile } from "./fixtures/financial-and-climate-upside-profile-v1";
import {
  applyMoveWiseScoreBlockerCaps,
  calculateFinancialSecurityScoreContribution,
  calculateMoveWiseScorePoint,
  calculatePriorityScoreContribution,
  deriveMoveWiseScoreBand,
  MOVEWISE_SCORE_BASELINE,
  MOVEWISE_SCORE_COMPONENT_REGISTRY,
  MOVEWISE_SCORE_METRIC_REGISTRY,
  MOVEWISE_SCORE_RULE_VERSION,
  verifyMoveWiseScore,
} from "./move-score";

describe("MoveWise Score calibration contract", () => {
  it("locks every score and band boundary", () => {
    const cases = [
      [1, "worse_fit"],
      [39, "worse_fit"],
      [40, "mixed_or_similar"],
      [49, "mixed_or_similar"],
      [50, "mixed_or_similar"],
      [59, "mixed_or_similar"],
      [60, "better_fit"],
      [79, "better_fit"],
      [80, "substantially_better_fit"],
      [100, "substantially_better_fit"],
    ] as const;

    expect(MOVEWISE_SCORE_BASELINE).toBe(50);
    cases.forEach(([value, band]) => {
      expect(deriveMoveWiseScoreBand(value)).toBe(band);
    });
    expect(() => deriveMoveWiseScoreBand(0)).toThrow();
    expect(() => deriveMoveWiseScoreBand(101)).toThrow();
  });

  it("assigns every scored metric to exactly one component", () => {
    expect(MOVEWISE_SCORE_COMPONENT_REGISTRY).toEqual({
      financial_security: { maximumAbsoluteContribution: 30 },
      daily_life_fit: { maximumAbsoluteContribution: 20 },
      opportunity_context: { maximumAbsoluteContribution: 0 },
      household_fit: { maximumAbsoluteContribution: 0 },
    });
    expect(MOVEWISE_SCORE_METRIC_REGISTRY).toEqual({
      financial_cushion_delta: {
        componentId: "financial_security",
        maximumAbsoluteContribution: 30,
      },
      commute_time: {
        componentId: "daily_life_fit",
        maximumAbsoluteContribution: 10,
      },
      climate_heat: {
        componentId: "daily_life_fit",
        maximumAbsoluteContribution: 10,
      },
    });
  });

  it("calibrates one material financial threshold to ten points", () => {
    expect(calculateFinancialSecurityScoreContribution(25_000, 25_000)).toBe(
      10,
    );
    expect(calculateFinancialSecurityScoreContribution(-25_000, 25_000)).toBe(
      -10,
    );
    expect(calculateFinancialSecurityScoreContribution(75_000, 25_000)).toBe(
      30,
    );
    expect(calculateFinancialSecurityScoreContribution(100_000, 25_000)).toBe(
      30,
    );
  });

  it("calibrates weighted daily-life materiality without redistributing weight", () => {
    expect(calculatePriorityScoreContribution(1_500, 500)).toBe(5);
    expect(calculatePriorityScoreContribution(-1_500, 500)).toBe(-5);
    expect(calculatePriorityScoreContribution(3_000, 500)).toBe(10);
    expect(calculatePriorityScoreContribution(30_000, 500)).toBe(10);
    expect(calculatePriorityScoreContribution(null, null)).toBe(0);
  });

  it("keeps an uncollected priority's budget unused", () => {
    const profile = JSON.parse(
      JSON.stringify(financialAndClimateUpsideProfile),
    ) as DecisionProfile;
    profile.priorityChanges = profile.priorityChanges.filter(
      ({ priorityId }) => priorityId !== "commute_time",
    );

    const score = calculateMoveWiseScorePoint(profile);
    const dailyLife = score.componentContributions.find(
      ({ componentId }) => componentId === "daily_life_fit",
    );

    expect(dailyLife?.contribution).toBe(10);
    expect(dailyLife?.metricContributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metricId: "commute_time",
          status: "omitted",
          contribution: 0,
          maximumAbsoluteContribution: 10,
          reasonCode: "score.priority_not_collected",
        }),
      ]),
    );
  });

  it("caps every registered severe financial blocker below a favorable band", () => {
    expect(applyMoveWiseScoreBlockerCaps(100, [])).toBe(100);
    expect(
      applyMoveWiseScoreBlockerCaps(100, ["negative_target_cushion"]),
    ).toBe(59);
    expect(
      applyMoveWiseScoreBlockerCaps(100, [
        "target_housing_burden_at_or_above_50_percent",
      ]),
    ).toBe(59);
  });

  it("produces the deterministic golden point score and freezes it", () => {
    const score = calculateMoveWiseScorePoint(financialAndClimateUpsideProfile);

    expect(score).toMatchObject({
      schemaVersion: "1.0.0",
      scoreVersion: MOVEWISE_SCORE_RULE_VERSION,
      baseline: 50,
      value: 69,
      band: "better_fit",
      range: null,
      rawContribution: 19,
      appliedCap: null,
    });
    expect(score.componentContributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          componentId: "financial_security",
          contribution: 12,
        }),
        expect.objectContaining({
          componentId: "daily_life_fit",
          contribution: 7,
        }),
      ]),
    );
    expect(Object.isFrozen(score)).toBe(true);
    const reverified = verifyMoveWiseScore(
      score,
      financialAndClimateUpsideProfile,
    );
    expect(reverified).toEqual(score);
    expect(Object.isFrozen(reverified.componentContributions)).toBe(true);
  });

  it("rejects a score whose band, binding, or contribution was changed", () => {
    const score = calculateMoveWiseScorePoint(financialAndClimateUpsideProfile);

    for (const mutate of [
      (value: Record<string, unknown>) => (value.band = "worse_fit"),
      (value: Record<string, unknown>) =>
        (value.inputFingerprintSha256 = "0".repeat(64)),
      (value: Record<string, unknown>) => (value.rawContribution = 20),
    ]) {
      const changed = JSON.parse(JSON.stringify(score)) as Record<
        string,
        unknown
      >;
      mutate(changed);
      expect(() =>
        verifyMoveWiseScore(changed, financialAndClimateUpsideProfile),
      ).toThrow();
    }
  });
});
