import {
  calculateBenchmarkComparisonChecksum,
  createMoveWiseHouseholdAnswers,
  verifyBenchmarkComparison,
} from "@workspace/contracts";
import type {
  BenchmarkComparison,
  MoveWiseHouseholdAnswerPayload,
  ScenarioInput,
  VerifiedBenchmarkComparison,
} from "@workspace/contracts";
import { describe, expect, it } from "vitest";

import { financialAndClimateUpsideBenchmark } from "../../contracts/src/fixtures/financial-and-climate-upside-benchmark-v1";
import { financialAndClimateUpsideInput } from "../../contracts/src/fixtures/financial-and-climate-upside-v1";
import { evaluateMoveDecision, evaluateResearchMoveDecision } from "./evaluate";
import {
  MoveWiseDeterministicAdapterPreflightError,
  adaptVerifiedEvaluationToDeterministicModelInput,
  evaluateMoveWiseDeterministicModel,
} from "./deterministic-model-adapter";

const clone = <Value>(value: Value): Value => structuredClone(value);

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

const benchmarkWith = (
  mutate: (comparison: BenchmarkComparison) => void = () => undefined,
) => {
  const benchmark = clone(financialAndClimateUpsideBenchmark);
  mutate(benchmark);
  return checksumAndVerify(benchmark);
};

const confirmedInput = (): ScenarioInput => {
  const input = clone(financialAndClimateUpsideInput);
  input.finances.destination.housingCost.basis = "confirmed";
  input.finances.destination.housingCost.plausibleRangeCents = null;
  input.finances.destination.recurringExpensesExcludingHousing.basis =
    "confirmed";
  input.finances.destination.recurringExpensesExcludingHousing.plausibleRangeCents =
    null;
  return input;
};

const familyAnswers = () =>
  createMoveWiseHouseholdAnswers({
    schemaVersion: "1.0.0",
    questionVersion: "1.0.0",
    mode: "family",
    factors: [
      {
        factorId: "space_fit",
        importance: "important",
        impact: "positive",
        essentialStatus: null,
      },
      {
        factorId: "support_network",
        importance: "important",
        impact: "positive",
        essentialStatus: null,
      },
      {
        factorId: "childcare_continuity",
        importance: "not_applicable",
        impact: "excluded",
        essentialStatus: null,
      },
      {
        factorId: "school_continuity",
        importance: "not_applicable",
        impact: "excluded",
        essentialStatus: null,
      },
      {
        factorId: "required_services_continuity",
        importance: "not_applicable",
        impact: "excluded",
        essentialStatus: null,
      },
      {
        factorId: "car_free_access",
        importance: "not_applicable",
        impact: "excluded",
        essentialStatus: null,
      },
    ],
  } satisfies MoveWiseHouseholdAnswerPayload);

const individualAnswers = (carFree: "excluded" | "unavailable" = "excluded") =>
  createMoveWiseHouseholdAnswers({
    schemaVersion: "1.0.0",
    questionVersion: "1.0.0",
    mode: "individual",
    factors: [
      {
        factorId: "space_fit",
        importance: "not_applicable",
        impact: "excluded",
        essentialStatus: null,
      },
      {
        factorId: "support_network",
        importance: "not_applicable",
        impact: "excluded",
        essentialStatus: null,
      },
      {
        factorId: "required_services_continuity",
        importance: "not_applicable",
        impact: "excluded",
        essentialStatus: null,
      },
      carFree === "excluded"
        ? {
            factorId: "car_free_access",
            importance: "not_applicable",
            impact: "excluded",
            essentialStatus: null,
          }
        : {
            factorId: "car_free_access",
            importance: "essential",
            impact: "unavailable",
            essentialStatus: "unconfirmed",
          },
    ],
  } satisfies MoveWiseHouseholdAnswerPayload);

describe("MoveWise deterministic-model verified adapter", () => {
  it("derives the exact point input and accepted household mapping", () => {
    const evaluation = evaluateMoveDecision(confirmedInput(), benchmarkWith());
    const answers = familyAnswers();

    const input = adaptVerifiedEvaluationToDeterministicModelInput(
      evaluation,
      answers,
    );
    const analysis = evaluateMoveWiseDeterministicModel(evaluation, answers);

    expect(input).toEqual({
      originMetroSlug: "fixture-river",
      destinationMetroSlug: "fixture-pine",
      monthlyCushionDeltaCents: 30_000,
      destinationMonthlyCushionCents: 150_000,
      destinationMonthlyCushionRangeCents: null,
      financialMaterialityThresholdCents: 25_000,
      lowCushionCautionThresholdCents: 56_000,
      destinationHousingBurdenBps: 2_208,
      commuteImpact: "neutral",
      climateImpact: "strong_positive",
      householdMode: "family",
      householdSignals: [
        { signalId: "space_fit", impact: "positive" },
        { signalId: "support_network", impact: "positive" },
        { signalId: "childcare_continuity", impact: "excluded" },
        { signalId: "school_continuity", impact: "excluded" },
        {
          signalId: "required_services_continuity",
          impact: "excluded",
        },
        { signalId: "car_free_access", impact: "excluded" },
      ],
      essentialRequirements: [],
    });
    expect(analysis).toMatchObject({
      schemaVersion: "1.0.0",
      ruleVersion: "0.2.0",
      input,
      result: {
        value: 92,
        band: "substantially_better_fit",
        condition: "likely_better_move",
      },
      range: null,
      reproducibility: {
        inputFingerprintSha256:
          evaluation.decisionProfile.inputFingerprintSha256,
        benchmarkSnapshotVersion:
          evaluation.benchmarkComparison.snapshot.version,
        benchmarkSnapshotSha256: evaluation.benchmarkComparison.snapshot.sha256,
        decisionProfileSchemaVersion: "1.0.0",
        decisionRuleVersion: "1.0.0",
        deterministicModelSchemaVersion: "1.0.0",
        deterministicModelRuleVersion: "0.2.0",
        householdQuestionVersion: "1.0.0",
        householdAnswerSha256: answers.sha256,
        variedInputPaths: [],
        endpointInputFingerprintSha256: [],
      },
    });
  });

  it("derives the $500 floor and the 10% low-cushion threshold", () => {
    const thresholds = [400_000, 800_000].map((monthlyCents) => {
      const input = confirmedInput();
      input.finances.destination.takeHomeIncome.monthlyCents = monthlyCents;
      const evaluation = evaluateMoveDecision(input, benchmarkWith());
      return adaptVerifiedEvaluationToDeterministicModelInput(
        evaluation,
        familyAnswers(),
      ).lowCushionCautionThresholdCents;
    });

    expect(thresholds).toEqual([50_000, 80_000]);
  });

  it("preserves unknown destination gross income as unavailable", () => {
    const input = confirmedInput();
    input.finances.destination.grossIncome = null;
    const evaluation = evaluateMoveDecision(input, benchmarkWith());

    expect(
      adaptVerifiedEvaluationToDeterministicModelInput(
        evaluation,
        familyAnswers(),
      ).destinationHousingBurdenBps,
    ).toBeNull();
  });

  it("emits only four explicitly excluded signals for an individual", () => {
    const evaluation = evaluateMoveDecision(confirmedInput(), benchmarkWith());
    const analysis = evaluateMoveWiseDeterministicModel(
      evaluation,
      individualAnswers(),
    );

    expect(analysis.input.householdMode).toBe("individual");
    expect(analysis.input.householdSignals).toHaveLength(4);
    expect(
      analysis.input.householdSignals.every(
        ({ impact }) => impact === "excluded",
      ),
    ).toBe(true);
    expect(analysis.result.metricContributions.household).toMatchObject({
      status: "excluded",
      contribution: 0,
    });
  });

  it("maps material commute improvement and explicit climate exclusion", () => {
    const input = confirmedInput();
    input.priorities.find(
      ({ priorityId }) => priorityId === "climate_heat",
    )!.weight = 0;
    const benchmark = benchmarkWith((comparison) => {
      const commute = comparison.priorities.find(
        ({ priorityId }) => priorityId === "commute_time",
      )!;
      commute.destinationUtilityBps = 8_400;
      commute.evidence.destinationValue = 20;
      commute.evidence.deltaValue = -8;
      commute.evidence.transformation.outputs.destinationUtilityBps = 8_400;
    });
    const evaluation = evaluateMoveDecision(input, benchmark);

    expect(
      adaptVerifiedEvaluationToDeterministicModelInput(
        evaluation,
        familyAnswers(),
      ),
    ).toMatchObject({
      commuteImpact: "strong_positive",
      climateImpact: "excluded",
    });
  });

  it("maps essential answers without double-counting their status", () => {
    const answers = individualAnswers("unavailable");
    const evaluation = evaluateMoveDecision(confirmedInput(), benchmarkWith());
    const analysis = evaluateMoveWiseDeterministicModel(evaluation, answers);

    expect(analysis.input.essentialRequirements).toEqual([
      { requirementId: "car_free_access", status: "unconfirmed" },
    ]);
    expect(analysis.result).toMatchObject({
      value: 59,
      condition: "promising_if",
      conditionalRequirementIds: ["car_free_access"],
      metricContributions: {
        household: {
          signals: expect.arrayContaining([
            {
              signalId: "car_free_access",
              status: "unavailable",
              contribution: 0,
            },
          ]),
        },
      },
    });
  });

  it("preserves strong tradeoffs, unavailable factors, and confirmed unmet essentials", () => {
    const { sha256: _sha256, ...payload } = clone(familyAnswers());
    payload.factors[1] = {
      factorId: "support_network",
      importance: "important",
      impact: "strong_negative",
      essentialStatus: null,
    };
    payload.factors[3] = {
      factorId: "school_continuity",
      importance: "essential",
      impact: "neutral",
      essentialStatus: "confirmed_unmet",
    };
    payload.factors[4] = {
      factorId: "required_services_continuity",
      importance: "important",
      impact: "unavailable",
      essentialStatus: null,
    };
    const analysis = evaluateMoveWiseDeterministicModel(
      evaluateMoveDecision(confirmedInput(), benchmarkWith()),
      createMoveWiseHouseholdAnswers(payload),
    );

    expect(analysis.result).toMatchObject({
      value: 59,
      condition: "no_clear_advantage",
      unmetRequirementIds: ["school_continuity"],
      metricContributions: {
        household: {
          status: "partial",
          contribution: -5,
          signals: expect.arrayContaining([
            {
              signalId: "support_network",
              status: "available",
              contribution: -15,
            },
            {
              signalId: "childcare_continuity",
              status: "excluded",
              contribution: 0,
            },
            {
              signalId: "required_services_continuity",
              status: "unavailable",
              contribution: 0,
            },
          ]),
        },
      },
    });
  });

  it("reevaluates all take-home and gross-income endpoint combinations", () => {
    const input = confirmedInput();
    input.finances.destination.takeHomeIncome = {
      monthlyCents: 560_000,
      basis: "user_estimate",
      plausibleRangeCents: { min: 300_000, max: 600_000 },
    };
    input.finances.destination.grossIncome = {
      monthlyCents: 400_000,
      basis: "user_estimate",
      plausibleRangeCents: { min: 300_000, max: 500_000 },
    };
    const evaluation = evaluateMoveDecision(input, benchmarkWith());
    const analysis = evaluateMoveWiseDeterministicModel(
      evaluation,
      familyAnswers(),
    );

    expect(analysis).toMatchObject({
      result: {
        value: 59,
        band: "mixed_or_similar",
        condition: "promising_if",
        stability: "assumption_sensitive",
        appliedCap: 59,
        range: { min: 39, max: 100 },
        rangeBlockerCodes: [
          "destination_housing_burden_at_or_above_50_percent",
          "negative_destination_cushion",
        ],
      },
      range: {
        min: 39,
        max: 100,
        variedInputPaths: [
          "finances.destination.grossIncome.monthlyCents",
          "finances.destination.takeHomeIncome.monthlyCents",
        ],
        blockerCodes: [
          "destination_housing_burden_at_or_above_50_percent",
          "negative_destination_cushion",
        ],
        cautionCodes: [],
        endpoints: expect.arrayContaining([
          expect.objectContaining({ value: 39 }),
          expect.objectContaining({ value: 59 }),
          expect.objectContaining({ value: 100 }),
        ]),
      },
    });
    expect(analysis.range?.endpoints).toHaveLength(4);
    expect(
      analysis.reproducibility.endpointInputFingerprintSha256,
    ).toHaveLength(4);
  });

  it("preserves endpoint-only cautions without making the safe point conditional", () => {
    const input = confirmedInput();
    input.finances.destination.takeHomeIncome = {
      monthlyCents: 560_000,
      basis: "user_estimate",
      plausibleRangeCents: { min: 410_000, max: 600_000 },
    };
    const analysis = evaluateMoveWiseDeterministicModel(
      evaluateMoveDecision(input, benchmarkWith()),
      familyAnswers(),
    );

    expect(analysis.result).toMatchObject({
      value: 92,
      condition: "likely_better_move",
      rangeCautionCodes: ["low_destination_cushion"],
      rangeBlockerCodes: [],
    });
    expect(analysis.range?.cautionCodes).toEqual(["low_destination_cushion"]);
  });

  it("supports research evaluations and remains deterministic and immutable", () => {
    const input = confirmedInput();
    const benchmark = benchmarkWith((comparison) => {
      comparison.snapshot.admissionStatus = "research_only";
    });
    const evaluation = evaluateResearchMoveDecision(input, benchmark);
    const answers = familyAnswers();
    const evaluationBefore = JSON.stringify(evaluation);
    const answersBefore = JSON.stringify(answers);

    const first = evaluateMoveWiseDeterministicModel(evaluation, answers);
    const second = evaluateMoveWiseDeterministicModel(evaluation, answers);

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(JSON.stringify(evaluation)).toBe(evaluationBefore);
    expect(JSON.stringify(answers)).toBe(answersBefore);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.input)).toBe(true);
    expect(Object.isFrozen(first.reproducibility)).toBe(true);
  });

  it("fails closed when a registered daily-life priority is missing", () => {
    const input = confirmedInput();
    input.priorities = input.priorities.filter(
      ({ priorityId }) => priorityId !== "climate_heat",
    );
    const benchmark = benchmarkWith((comparison) => {
      comparison.priorities = comparison.priorities.filter(
        ({ priorityId }) => priorityId !== "climate_heat",
      );
    });
    const evaluation = evaluateMoveDecision(input, benchmark);

    expect(() =>
      evaluateMoveWiseDeterministicModel(evaluation, familyAnswers()),
    ).toThrow(MoveWiseDeterministicAdapterPreflightError);
  });
});
