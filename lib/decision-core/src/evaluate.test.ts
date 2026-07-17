import { describe, expect, it } from "vitest";

import {
  calculateBenchmarkComparisonChecksum,
  verifyBenchmarkComparison,
} from "@workspace/contracts";
import type {
  BenchmarkComparison,
  ScenarioInput,
  VerifiedBenchmarkComparison,
} from "@workspace/contracts";
import { financialAndClimateUpsideBenchmark } from "../../contracts/src/fixtures/financial-and-climate-upside-benchmark-v1";
import { financialAndClimateUpsideProfile } from "../../contracts/src/fixtures/financial-and-climate-upside-profile-v1";
import { financialAndClimateUpsideInput } from "../../contracts/src/fixtures/financial-and-climate-upside-v1";

import { evaluateMoveDecision, MoveDecisionPreflightError } from "./evaluate";

const clone = <Value>(value: Value): Value =>
  JSON.parse(JSON.stringify(value)) as Value;

const cloneInput = (): ScenarioInput => clone(financialAndClimateUpsideInput);

const checksumAndVerify = (
  comparison: BenchmarkComparison,
): VerifiedBenchmarkComparison => {
  const checksumPlaceholder = "0".repeat(64);
  comparison.snapshot.sha256 = checksumPlaceholder;
  comparison.priorities.forEach((priority) => {
    priority.evidence.snapshotSha256 = checksumPlaceholder;
  });
  const checksum = calculateBenchmarkComparisonChecksum(comparison);
  comparison.snapshot.sha256 = checksum;
  comparison.priorities.forEach((priority) => {
    priority.evidence.snapshotSha256 = checksum;
  });
  return verifyBenchmarkComparison(comparison);
};

const cloneVerifiedBenchmark = (): VerifiedBenchmarkComparison =>
  checksumAndVerify(clone(financialAndClimateUpsideBenchmark));

const verifiedBenchmarkWith = (
  mutate: (comparison: BenchmarkComparison) => void,
): VerifiedBenchmarkComparison => {
  const comparison = clone(financialAndClimateUpsideBenchmark);
  mutate(comparison);
  return checksumAndVerify(comparison);
};

describe("evaluateMoveDecision", () => {
  it("exactly reproduces the locked financial-and-climate golden profile", () => {
    const result = evaluateMoveDecision(cloneInput(), cloneVerifiedBenchmark());

    expect(result.resultMode).toBe("deterministic");
    expect(result.decisionProfile).toEqual(financialAndClimateUpsideProfile);
  });

  it("canonicalizes semantically irrelevant priority ordering", () => {
    const canonical = evaluateMoveDecision(
      cloneInput(),
      cloneVerifiedBenchmark(),
    );
    const reorderedInput = cloneInput();
    reorderedInput.priorities.reverse();
    const reorderedBenchmark = verifiedBenchmarkWith((comparison) => {
      comparison.priorities.reverse();
    });

    const reordered = evaluateMoveDecision(reorderedInput, reorderedBenchmark);

    expect(reordered).toEqual(canonical);
    expect(Object.isFrozen(reordered)).toBe(true);
    expect(Object.isFrozen(reordered.decisionProfile.evidence)).toBe(true);
    expect(
      Reflect.set(reordered.decisionProfile.condition, "value", "changed"),
    ).toBe(false);
  });

  it("makes a negative target cushion a blocking financial risk", () => {
    const input = cloneInput();
    input.finances.destination.recurringExpensesExcludingHousing.monthlyCents = 500_000;
    input.finances.destination.recurringExpensesExcludingHousing.plausibleRangeCents =
      { min: 490_000, max: 510_000 };

    const profile = evaluateMoveDecision(
      input,
      cloneVerifiedBenchmark(),
    ).decisionProfile;

    expect(profile.financialPosition.destination.monthlyCushionCents).toBe(
      -110_000,
    );
    expect(profile.financialPosition.blockerCodes).toContain(
      "negative_target_cushion",
    );
    expect(profile.condition).toMatchObject({
      value: "high_financial_risk_under_assumptions",
      ruleId: "condition.financial_blocker",
    });
    expect(profile.findings.blockers.map((finding) => finding.code)).toContain(
      "negative_target_cushion",
    );
  });

  it("blocks at exactly fifty percent known target housing burden", () => {
    const input = cloneInput();
    input.finances.destination.grossIncome = {
      monthlyCents: 340_000,
      basis: "confirmed",
      plausibleRangeCents: null,
    };

    const profile = evaluateMoveDecision(
      input,
      cloneVerifiedBenchmark(),
    ).decisionProfile;

    expect(profile.financialPosition.destination.housingBurdenBps).toBe(5_000);
    expect(profile.financialPosition.blockerCodes).toContain(
      "target_housing_burden_at_or_above_50_percent",
    );
    expect(profile.condition.value).toBe(
      "high_financial_risk_under_assumptions",
    );
    expect(profile.condition.evidenceRefs).toEqual(
      expect.arrayContaining([
        "input.destination.gross",
        "input.destination.housing",
      ]),
    );
  });

  it("downgrades confidence and condition for missing critical evidence", () => {
    const benchmark = verifiedBenchmarkWith((comparison) => {
      const climate = comparison.priorities.find(
        (priority) => priority.priorityId === "climate_heat",
      );
      if (climate === undefined) throw new Error("Missing climate fixture.");
      climate.originUtilityBps = null;
      climate.destinationUtilityBps = null;
      climate.evidence.originValue = null;
      climate.evidence.destinationValue = null;
      climate.evidence.deltaValue = null;
      climate.evidence.transformation.outputs.originUtilityBps = null;
      climate.evidence.transformation.outputs.destinationUtilityBps = null;
      climate.evidence.transformation.outputs.originUncertaintyBps = null;
      climate.evidence.transformation.outputs.destinationUncertaintyBps = null;
      climate.evidence.quality.missingness = "unavailable";
      climate.evidence.quality.coverageBps = null;
      climate.evidence.quality.grade.value = "limited";
    });

    const profile = evaluateMoveDecision(
      cloneInput(),
      benchmark,
    ).decisionProfile;

    expect(profile.condition).toMatchObject({
      value: "meaningful_tradeoff",
      ruleId: "condition.critical_evidence_gap",
    });
    expect(profile.confidence).toMatchObject({
      level: "limited",
      missingPriorityIds: ["climate_heat"],
    });
    expect(profile.findings.omittedPriorities).toContain("climate_heat");
  });

  it("keeps a same-metro comparison neutral on every place metric", () => {
    const input = cloneInput();
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

    const profile = evaluateMoveDecision(input, benchmark).decisionProfile;

    expect(profile.scenario.origin).toEqual(profile.scenario.destination);
    expect(
      profile.priorityChanges.map((change) => ({
        delta: change.utilityDeltaBps,
        classification: change.classification,
        material: change.material,
      })),
    ).toEqual([
      { delta: 0, classification: "similar", material: false },
      { delta: 0, classification: "similar", material: false },
    ]);
  });

  it("uses the canonical excluded representation for a weight-zero priority", () => {
    const input = cloneInput();
    const commute = input.priorities.find(
      (priority) => priority.priorityId === "commute_time",
    );
    if (commute === undefined) throw new Error("Missing commute fixture.");
    commute.weight = 0;
    const benchmark = verifiedBenchmarkWith((comparison) => {
      comparison.priorities = comparison.priorities.filter(
        (priority) => priority.priorityId !== "commute_time",
      );
    });

    const profile = evaluateMoveDecision(input, benchmark).decisionProfile;
    const change = profile.priorityChanges.find(
      (priority) => priority.priorityId === "commute_time",
    );

    expect(change).toEqual({
      id: "priority.commute_time",
      priorityId: "commute_time",
      weight: 0,
      preferredDirection: "lower",
      availability: "unavailable",
      originUtilityBps: null,
      destinationUtilityBps: null,
      utilityDeltaBps: null,
      weightedContribution: null,
      materialityThresholdBps: null,
      classification: "unavailable",
      material: false,
      transformationId: "not_evaluated",
      transformationVersion: "0.0.0",
      evidenceRefs: [],
    });
    expect(profile.findings.omittedPriorities).toContain("commute_time");
  });

  it("treats the financial materiality threshold as inclusive", () => {
    const atThreshold = cloneInput();
    atThreshold.finances.destination.recurringExpensesExcludingHousing.monthlyCents = 245_000;
    const justInside = cloneInput();
    justInside.finances.destination.recurringExpensesExcludingHousing.monthlyCents = 245_001;

    const thresholdProfile = evaluateMoveDecision(
      atThreshold,
      cloneVerifiedBenchmark(),
    ).decisionProfile;
    const insideProfile = evaluateMoveDecision(
      justInside,
      cloneVerifiedBenchmark(),
    ).decisionProfile;

    expect(thresholdProfile.financialPosition.change).toMatchObject({
      monthlyCushionDeltaCents: 25_000,
      materialityThresholdCents: 25_000,
      classification: "improves",
    });
    expect(insideProfile.financialPosition.change).toMatchObject({
      monthlyCushionDeltaCents: 24_999,
      materialityThresholdCents: 25_000,
      classification: "similar",
    });
  });

  it("rounds signed financial basis points half away from zero", () => {
    const positive = cloneInput();
    positive.finances.destination.recurringExpensesExcludingHousing = {
      monthlyCents: 269_975,
      basis: "user_estimate",
      plausibleRangeCents: { min: 260_000, max: 280_000 },
    };
    const negative = cloneInput();
    negative.finances.destination.recurringExpensesExcludingHousing = {
      monthlyCents: 270_025,
      basis: "user_estimate",
      plausibleRangeCents: { min: 260_000, max: 280_000 },
    };

    expect(
      evaluateMoveDecision(positive, cloneVerifiedBenchmark()).decisionProfile
        .financialPosition.change.cushionDeltaBpsOfOriginTakeHome,
    ).toBe(1);
    expect(
      evaluateMoveDecision(negative, cloneVerifiedBenchmark()).decisionProfile
        .financialPosition.change.cushionDeltaBpsOfOriginTakeHome,
    ).toBe(-1);
  });

  it("omits housing-burden evidence when target gross income is unknown", () => {
    const input = cloneInput();
    input.finances.destination.grossIncome = null;
    input.finances.destination.housingCost = {
      ...input.finances.destination.housingCost,
      basis: "confirmed",
      plausibleRangeCents: null,
    };
    input.finances.destination.recurringExpensesExcludingHousing = {
      ...input.finances.destination.recurringExpensesExcludingHousing,
      basis: "confirmed",
      plausibleRangeCents: null,
    };

    const profile = evaluateMoveDecision(
      input,
      cloneVerifiedBenchmark(),
    ).decisionProfile;

    expect(profile.financialPosition.destination.housingBurdenBps).toBeNull();
    expect(profile.financialPosition.change.housingBurdenDeltaBps).toBeNull();
    expect(profile.financialPosition.riskCodes).toEqual([
      "target_gross_income_unknown",
    ]);
    expect(
      profile.evidence.some(
        (evidence) =>
          evidence.id === "derived.financial.destination_housing_burden" ||
          evidence.id === "input.destination.gross",
      ),
    ).toBe(false);
    expect(profile.findings.assumptions).toEqual([]);
    expect(profile.nextSteps).toEqual([
      {
        id: "next_step.collect_target_gross_income",
        code: "collect_target_gross_income",
        evidenceRefs: ["input.destination.housing"],
      },
    ]);
  });

  it("returns a tradeoff when material financial upside meets material lifestyle downside", () => {
    const benchmark = verifiedBenchmarkWith((comparison) => {
      const climate = comparison.priorities.find(
        (priority) => priority.priorityId === "climate_heat",
      );
      if (climate === undefined) throw new Error("Missing climate fixture.");
      climate.destinationUtilityBps = 1_000;
      climate.evidence.destinationValue = 100;
      climate.evidence.deltaValue = 20;
      climate.evidence.transformation.outputs.destinationUtilityBps = 1_000;
    });

    const profile = evaluateMoveDecision(
      cloneInput(),
      benchmark,
    ).decisionProfile;

    expect(profile.financialPosition.change.classification).toBe("improves");
    expect(
      profile.priorityChanges.find(
        (change) => change.priorityId === "climate_heat",
      ),
    ).toMatchObject({
      classification: "worsens",
      material: true,
    });
    expect(profile.condition).toMatchObject({
      value: "meaningful_tradeoff",
      ruleId: "condition.default_tradeoff",
    });
    expect(profile.findings.drivers.map((finding) => finding.code)).toContain(
      "financial_cushion_improves",
    );
    expect(profile.findings.tradeoffs.map((finding) => finding.code)).toContain(
      "climate_heat_worsens",
    );
  });

  it("aggregates moderate quality without overstating confidence", () => {
    const benchmark = verifiedBenchmarkWith((comparison) => {
      const commute = comparison.priorities.find(
        (priority) => priority.priorityId === "commute_time",
      );
      if (commute === undefined) throw new Error("Missing commute fixture.");
      commute.evidence.geographies.origin.matchQuality = "mapped_proxy";
      commute.evidence.geographies.destination.matchQuality = "mapped_proxy";
      commute.evidence.quality.grade.value = "moderate";
    });

    const confidence = evaluateMoveDecision(cloneInput(), benchmark)
      .decisionProfile.confidence;

    expect(confidence).toMatchObject({
      level: "moderate",
      ruleIds: ["confidence.active_evidence_moderate"],
      missingPriorityIds: [],
    });
  });

  it("limits confidence for a noncritical missing priority without invoking the critical-gap rule", () => {
    const benchmark = verifiedBenchmarkWith((comparison) => {
      const commute = comparison.priorities.find(
        (priority) => priority.priorityId === "commute_time",
      );
      if (commute === undefined) throw new Error("Missing commute fixture.");
      commute.originUtilityBps = null;
      commute.destinationUtilityBps = null;
      commute.evidence.originValue = null;
      commute.evidence.destinationValue = null;
      commute.evidence.deltaValue = null;
      commute.evidence.transformation.outputs.originUtilityBps = null;
      commute.evidence.transformation.outputs.destinationUtilityBps = null;
      commute.evidence.transformation.outputs.originUncertaintyBps = null;
      commute.evidence.transformation.outputs.destinationUncertaintyBps = null;
      commute.evidence.quality.missingness = "unavailable";
      commute.evidence.quality.coverageBps = null;
      commute.evidence.quality.grade.value = "limited";
    });

    const profile = evaluateMoveDecision(
      cloneInput(),
      benchmark,
    ).decisionProfile;

    expect(profile.confidence).toMatchObject({
      level: "limited",
      ruleIds: ["confidence.active_evidence_limited"],
      missingPriorityIds: ["commute_time"],
    });
    expect(profile.condition.ruleId).not.toBe(
      "condition.critical_evidence_gap",
    );
  });

  it("emits every registered assumption finding and investigation step", () => {
    const input = cloneInput();
    input.finances.destination.takeHomeIncome = {
      ...input.finances.destination.takeHomeIncome,
      basis: "user_estimate",
      plausibleRangeCents: { min: 540_000, max: 580_000 },
    };
    input.finances.destination.grossIncome = {
      monthlyCents: 770_000,
      basis: "user_estimate",
      plausibleRangeCents: { min: 740_000, max: 800_000 },
    };
    input.finances.destination.retainedPropertyNet = {
      monthlyCents: 0,
      basis: "user_estimate",
      plausibleRangeCents: { min: -10_000, max: 10_000 },
    };

    const profile = evaluateMoveDecision(
      input,
      cloneVerifiedBenchmark(),
    ).decisionProfile;

    expect(profile.financialPosition.riskCodes).toEqual([
      "target_income_not_confirmed",
      "target_gross_income_not_confirmed",
      "target_housing_not_confirmed",
      "target_expenses_not_confirmed",
      "retained_property_net_not_confirmed",
    ]);
    expect(profile.findings.assumptions.map((finding) => finding.code)).toEqual(
      [
        "retained_property_net_estimate",
        "target_expenses_estimate",
        "target_gross_income_estimate",
        "target_housing_estimate",
        "target_income_estimate",
      ],
    );
    expect(profile.nextSteps.map((step) => step.code)).toEqual([
      "verify_retained_property_net",
      "verify_target_expenses",
      "verify_target_gross_income",
      "verify_target_housing",
      "verify_target_income",
    ]);
  });

  it("applies weighted priority materiality at low and high importance", () => {
    const benchmark = verifiedBenchmarkWith((comparison) => {
      const climate = comparison.priorities.find(
        (priority) => priority.priorityId === "climate_heat",
      );
      if (climate === undefined) throw new Error("Missing climate fixture.");
      climate.destinationUtilityBps = 3_500;
      climate.evidence.destinationValue = 75;
      climate.evidence.deltaValue = -5;
      climate.evidence.transformation.outputs.destinationUtilityBps = 3_500;
    });
    const lowWeight = cloneInput();
    const highWeight = cloneInput();
    const lowClimate = lowWeight.priorities.find(
      (priority) => priority.priorityId === "climate_heat",
    );
    const highClimate = highWeight.priorities.find(
      (priority) => priority.priorityId === "climate_heat",
    );
    if (lowClimate === undefined || highClimate === undefined) {
      throw new Error("Missing climate fixture input.");
    }
    lowClimate.weight = 1;
    highClimate.weight = 5;

    const lowChange = evaluateMoveDecision(lowWeight, benchmark).decisionProfile
      .priorityChanges[0];
    const highChange = evaluateMoveDecision(highWeight, benchmark)
      .decisionProfile.priorityChanges[0];

    expect(lowChange).toMatchObject({
      classification: "improves",
      weightedContribution: 500,
      material: false,
    });
    expect(highChange).toMatchObject({
      classification: "improves",
      weightedContribution: 2_500,
      material: true,
    });
  });

  it("uses limited confidence when every priority is excluded", () => {
    const input = cloneInput();
    input.priorities.forEach((priority) => {
      priority.weight = 0;
    });
    const benchmark = verifiedBenchmarkWith((comparison) => {
      comparison.priorities = [];
    });

    const profile = evaluateMoveDecision(input, benchmark).decisionProfile;

    expect(profile.confidence).toEqual({
      level: "limited",
      ruleIds: ["confidence.no_active_benchmark_evidence"],
      evidenceRefs: [],
      missingPriorityIds: [],
    });
    expect(profile.findings.omittedPriorities).toEqual([
      "climate_heat",
      "commute_time",
    ]);
  });

  it("raises typed preflight errors for every scenario-benchmark pair mismatch", () => {
    const assertCode = (
      run: () => unknown,
      code: MoveDecisionPreflightError["code"],
    ) => {
      try {
        run();
        throw new Error(`Expected ${code}.`);
      } catch (error) {
        expect(error).toBeInstanceOf(MoveDecisionPreflightError);
        expect((error as MoveDecisionPreflightError).code).toBe(code);
      }
    };

    assertCode(
      () =>
        evaluateMoveDecision(
          cloneInput(),
          verifiedBenchmarkWith((comparison) => {
            comparison.origin.slug = "fixture-other-origin";
          }),
        ),
      "origin_metro_mismatch",
    );
    assertCode(
      () =>
        evaluateMoveDecision(
          cloneInput(),
          verifiedBenchmarkWith((comparison) => {
            comparison.destination.slug = "fixture-other-destination";
          }),
        ),
      "destination_metro_mismatch",
    );
    assertCode(
      () =>
        evaluateMoveDecision(
          cloneInput(),
          verifiedBenchmarkWith((comparison) => {
            comparison.priorities = comparison.priorities.filter(
              (priority) => priority.priorityId !== "commute_time",
            );
          }),
        ),
      "missing_active_benchmark_priorities",
    );
    assertCode(() => {
      const input = cloneInput();
      const commute = input.priorities.find(
        (priority) => priority.priorityId === "commute_time",
      );
      if (commute === undefined) throw new Error("Missing commute fixture.");
      commute.weight = 0;
      return evaluateMoveDecision(input, cloneVerifiedBenchmark());
    }, "extra_active_benchmark_priorities");
    assertCode(() => {
      const input = cloneInput();
      const climate = input.priorities.find(
        (priority) => priority.priorityId === "climate_heat",
      );
      if (climate === undefined) throw new Error("Missing climate fixture.");
      climate.preferredDirection = "higher";
      return evaluateMoveDecision(input, cloneVerifiedBenchmark());
    }, "priority_direction_mismatch");
  });
});
