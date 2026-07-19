import {
  MOVEWISE_SCORE_RULE_VERSION,
  type DeterministicModelInput,
} from "@workspace/contracts";
import { describe, expect, it } from "vitest";

import {
  DeterministicModelPreflightError,
  evaluateDeterministicModel,
} from "./deterministic-model-0-2";
import { deterministicModelCalibrationCorpus } from "./fixtures/deterministic-model-calibration-v1";

const baseInput = (
  overrides: Partial<DeterministicModelInput> = {},
): DeterministicModelInput => ({
  originMetroSlug: "origin-metro",
  destinationMetroSlug: "destination-metro",
  monthlyCushionDeltaCents: 0,
  destinationMonthlyCushionCents: 100_000,
  destinationMonthlyCushionRangeCents: null,
  financialMaterialityThresholdCents: 25_000,
  lowCushionCautionThresholdCents: 50_000,
  destinationHousingBurdenBps: null,
  commuteImpact: "neutral",
  climateImpact: "neutral",
  householdSignals: [],
  essentialRequirements: [],
  ...overrides,
});

describe("MoveWise deterministic rule 0.2.0 candidate", () => {
  it("satisfies every accepted family and individual outcome", () => {
    const scenarios = deterministicModelCalibrationCorpus.fixtures.filter(
      (fixture) => fixture.kind === "scenario",
    );

    for (const fixture of scenarios) {
      const result = evaluateDeterministicModel(fixture.input);

      expect(
        {
          condition: result.condition,
          band: result.band,
          stability: result.stability,
          requiredBlockerCodes: result.activeBlockerCodes,
          requiredRangeBlockerCodes: result.rangeBlockerCodes,
          requiredCautionCodes: result.cautionCodes,
          requiredConditionalRequirementIds: result.conditionalRequirementIds,
          requiredUnmetRequirementIds: result.unmetRequirementIds,
        },
        fixture.id,
      ).toEqual(fixture.expected);
    }
  });

  it("locks the exact synthetic point values without presenting them as user evidence", () => {
    const values = Object.fromEntries(
      deterministicModelCalibrationCorpus.fixtures.flatMap((fixture) =>
        fixture.kind === "scenario"
          ? [[fixture.id, evaluateDeterministicModel(fixture.input).value]]
          : [],
      ),
    );

    expect(values).toEqual({
      F01: 39,
      F02: 40,
      F03: 100,
      F04: 59,
      F05: 59,
      F06: 59,
      F07: 59,
      F08: 43,
      F09: 59,
      F10: 67,
      F11: 59,
      F12: 5,
      I01: 90,
      I02: 29,
      I03: 50,
      I04: 30,
      I05: 59,
      I06: 59,
    });

    const conditionalRange = deterministicModelCalibrationCorpus.fixtures.find(
      ({ id }) => id === "F05",
    );
    expect(conditionalRange?.kind).toBe("scenario");
    if (conditionalRange?.kind !== "scenario") {
      throw new Error("F05 must remain a scenario fixture.");
    }
    expect(evaluateDeterministicModel(conditionalRange.input).range).toEqual({
      min: 39,
      max: 65,
    });
  });

  it("locks the neutral baseline and condition ladder", () => {
    expect(evaluateDeterministicModel(baseInput())).toMatchObject({
      ruleVersion: "0.2.0",
      value: 50,
      band: "mixed_or_similar",
      condition: "no_clear_advantage",
      appliedCap: null,
    });
  });

  it("distinguishes the exact negative-cushion edge", () => {
    const zero = evaluateDeterministicModel(
      baseInput({ destinationMonthlyCushionCents: 0 }),
    );
    const negative = evaluateDeterministicModel(
      baseInput({ destinationMonthlyCushionCents: -1 }),
    );

    expect(zero.activeBlockerCodes).toEqual([]);
    expect(zero.cautionCodes).toContain("low_destination_cushion");
    expect(negative).toMatchObject({
      value: 39,
      band: "worse_fit",
      condition: "high_financial_risk",
      activeBlockerCodes: ["negative_destination_cushion"],
    });
  });

  it("distinguishes housing caution from the exact 50% blocker", () => {
    const caution = evaluateDeterministicModel(
      baseInput({
        monthlyCushionDeltaCents: 100_000,
        destinationHousingBurdenBps: 4_999,
      }),
    );
    const blocker = evaluateDeterministicModel(
      baseInput({
        monthlyCushionDeltaCents: 100_000,
        destinationHousingBurdenBps: 5_000,
      }),
    );

    expect(caution).toMatchObject({
      value: 59,
      band: "mixed_or_similar",
      condition: "no_clear_advantage",
      activeBlockerCodes: [],
      cautionCodes: ["destination_housing_burden_at_or_above_45_percent"],
    });
    expect(blocker).toMatchObject({
      value: 59,
      band: "mixed_or_similar",
      condition: "high_financial_risk",
      activeBlockerCodes: ["destination_housing_burden_at_or_above_50_percent"],
    });
  });

  it("keeps excluded and unavailable metrics distinct without redistribution", () => {
    const result = evaluateDeterministicModel(
      baseInput({ commuteImpact: "excluded", climateImpact: "unavailable" }),
    );

    expect(result.value).toBe(50);
    expect(result.metricContributions).toMatchObject({
      commute: { status: "excluded", contribution: 0 },
      climate: { status: "unavailable", contribution: 0 },
    });
  });

  it("reruns a blocker-crossing range instead of averaging it away", () => {
    const result = evaluateDeterministicModel(
      baseInput({
        destinationMonthlyCushionCents: null,
        destinationMonthlyCushionRangeCents: { min: -1, max: 100_000 },
      }),
    );

    expect(result).toMatchObject({
      value: 50,
      condition: "promising_if",
      stability: "assumption_sensitive",
      range: { min: 39, max: 50 },
      rangeBlockerCodes: ["negative_destination_cushion"],
    });
  });

  it("is deterministic, directional, immutable, and rejects same-metro input", () => {
    const forwardInput = baseInput({
      monthlyCushionDeltaCents: 50_000,
      commuteImpact: "positive",
    });
    const first = evaluateDeterministicModel(forwardInput);
    const second = evaluateDeterministicModel(structuredClone(forwardInput));
    const reverse = evaluateDeterministicModel({
      ...forwardInput,
      originMetroSlug: forwardInput.destinationMetroSlug,
      destinationMetroSlug: forwardInput.originMetroSlug,
      monthlyCushionDeltaCents: -50_000,
      commuteImpact: "negative",
    });

    expect(second).toEqual(first);
    expect(reverse.value).toBeLessThan(first.value);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.metricContributions)).toBe(true);
    expect(() =>
      evaluateDeterministicModel({
        ...forwardInput,
        destinationMetroSlug: forwardInput.originMetroSlug,
      }),
    ).toThrow(DeterministicModelPreflightError);
  });

  it("keeps financial improvement monotonic before caps", () => {
    const values = [-50_000, -25_000, 0, 25_000, 50_000].map(
      (monthlyCushionDeltaCents) =>
        evaluateDeterministicModel(baseInput({ monthlyCushionDeltaCents }))
          .value,
    );

    expect(values).toEqual([...values].sort((left, right) => left - right));
  });

  it("makes both branches of an essential requirement explicit", () => {
    const unconfirmedInput = baseInput({
      monthlyCushionDeltaCents: 75_000,
      essentialRequirements: [
        { requirementId: "mobility.car-free", status: "unconfirmed" },
      ],
    });
    const unconfirmed = evaluateDeterministicModel(unconfirmedInput);
    const confirmed = evaluateDeterministicModel({
      ...unconfirmedInput,
      essentialRequirements: [
        { requirementId: "mobility.car-free", status: "confirmed_met" },
      ],
    });
    const unmet = evaluateDeterministicModel({
      ...unconfirmedInput,
      essentialRequirements: [
        { requirementId: "mobility.car-free", status: "confirmed_unmet" },
      ],
    });

    expect(unconfirmed).toMatchObject({
      value: 59,
      condition: "promising_if",
      conditionalRequirementIds: ["mobility.car-free"],
    });
    expect(confirmed).toMatchObject({
      value: 80,
      condition: "likely_better_move",
      conditionalRequirementIds: [],
      unmetRequirementIds: [],
    });
    expect(unmet).toMatchObject({
      value: 59,
      condition: "no_clear_advantage",
      unmetRequirementIds: ["mobility.car-free"],
    });
  });

  it("leaves the live score evaluator on rule 0.1.0", () => {
    expect(MOVEWISE_SCORE_RULE_VERSION).toBe("0.1.0");
  });
});
