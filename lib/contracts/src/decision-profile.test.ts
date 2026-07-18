import { describe, expect, it } from "vitest";

import {
  DecisionProfileSchema,
  FinancialStateSchema,
  PriorityChangeSchema,
} from "./decision-profile";
import {
  BenchmarkComparisonSchema,
  calculateBenchmarkComparisonChecksum,
} from "./benchmark";
import {
  EvaluationResultSchema,
  ResultModeSchema,
  UserFacingEvaluationResultSchema,
  verifyEvaluationResult,
} from "./evaluation-result";
import { financialAndClimateUpsideBenchmark } from "./fixtures/financial-and-climate-upside-benchmark-v1";
import { financialAndClimateUpsideInput } from "./fixtures/financial-and-climate-upside-v1";
import { financialAndClimateUpsideProfile } from "./fixtures/financial-and-climate-upside-profile-v1";
import {
  fingerprintScenarioInput,
  ScenarioInputSchema,
} from "./scenario-input";

const cloneProfile = () =>
  DecisionProfileSchema.parse(financialAndClimateUpsideProfile);

const cloneEvaluationResult = () => ({
  schemaVersion: "1.0.0" as const,
  resultMode: "deterministic" as const,
  releaseStatus: "user_facing" as const,
  scenarioInput: ScenarioInputSchema.parse(financialAndClimateUpsideInput),
  benchmarkComparison: BenchmarkComparisonSchema.parse(
    financialAndClimateUpsideBenchmark,
  ),
  decisionProfile: cloneProfile(),
});

const issuePaths = (input: unknown): string[] => {
  const result = DecisionProfileSchema.safeParse(input);
  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected DecisionProfile validation to fail.");
  }

  return result.error.issues.map((issue) => issue.path.join("."));
};

describe("DecisionProfileSchema", () => {
  it("accepts the locked Phase 0 Decision Profile", () => {
    expect(
      DecisionProfileSchema.parse(financialAndClimateUpsideProfile),
    ).toEqual(financialAndClimateUpsideProfile);
  });

  it("rejects unresolved evidence references at their claim path", () => {
    const profile = cloneProfile();
    profile.condition.evidenceRefs = ["evidence.does_not_exist"];

    expect(issuePaths(profile)).toContain("condition.evidenceRefs.0");
  });

  it("requires condition evidence to cover exactly the material signals", () => {
    const profile = cloneProfile();
    profile.condition.evidenceRefs = ["input.destination.housing"];

    expect(issuePaths(profile)).toContain("condition.evidenceRefs");
  });

  it("requires byte-stable evidence ordering", () => {
    const profile = cloneProfile();
    profile.evidence.reverse();

    expect(issuePaths(profile)).toContain("evidence");
  });

  it("requires financial blockers and the high-risk condition to agree", () => {
    const profile = cloneProfile();
    profile.financialPosition.blockerCodes = ["negative_target_cushion"];

    expect(issuePaths(profile)).toContain("condition");
  });

  it("rejects a self-attested condition with unchanged signals", () => {
    const profile = cloneProfile();
    profile.condition.value = "meaningful_tradeoff";
    profile.condition.ruleId = "condition.default_tradeoff";

    expect(issuePaths(profile)).toContain("condition");
  });

  it("requires findings for every material signal and assumption", () => {
    const profile = cloneProfile();
    profile.findings.drivers = [];
    profile.findings.assumptions = [];

    expect(issuePaths(profile)).toEqual(
      expect.arrayContaining(["findings.drivers", "findings.assumptions"]),
    );
  });

  it("rejects an extra contradictory material finding", () => {
    const profile = cloneProfile();
    profile.findings.tradeoffs.push({
      id: "finding.climate_heat_worsens",
      code: "climate_heat_worsens",
      subject: { kind: "priority", priorityId: "climate_heat" },
      material: true,
      evidenceRefs: ["benchmark.climate_heat.fixture"],
    });

    expect(issuePaths(profile)).toContain("findings.tradeoffs");
  });

  it("rejects fabricated blocker and caveat findings", () => {
    const profile = cloneProfile();
    profile.findings.blockers.push({
      id: "finding.fake_blocker",
      code: "fake_blocker",
      subject: {
        kind: "financial",
        metricId: "financial.monthly_cushion_delta",
      },
      material: true,
      evidenceRefs: ["derived.financial.cushion_delta"],
    });
    profile.findings.caveats.push({
      id: "finding.fake_caveat",
      code: "fake_caveat",
      subject: {
        kind: "financial",
        metricId: "financial.monthly_cushion_delta",
      },
      material: true,
      evidenceRefs: ["derived.financial.cushion_delta"],
    });

    expect(issuePaths(profile)).toEqual(
      expect.arrayContaining(["findings.blockers", "findings.caveats"]),
    );
  });

  it("rejects contradictory financial arithmetic", () => {
    const profile = cloneProfile();
    profile.financialPosition.origin.monthlyCushionCents += 1;

    expect(issuePaths(profile)).toContain(
      "financialPosition.origin.monthlyCushionCents",
    );
  });

  it("rejects contradictory priority arithmetic", () => {
    const profile = cloneProfile();
    profile.priorityChanges[0].utilityDeltaBps = 3_999;

    expect(issuePaths(profile)).toContain("priorityChanges.0.utilityDeltaBps");
  });

  it("uses null materiality only for canonical weight-zero exclusions", () => {
    const excluded = {
      ...cloneProfile().priorityChanges[0],
      weight: 0 as const,
      availability: "unavailable" as const,
      originUtilityBps: null,
      destinationUtilityBps: null,
      utilityDeltaBps: null,
      weightedContribution: null,
      materialityThresholdBps: null,
      classification: "unavailable" as const,
      material: false,
      transformationId: "not_evaluated",
      transformationVersion: "0.0.0",
      evidenceRefs: [],
    };
    expect(PriorityChangeSchema.safeParse(excluded).success).toBe(true);

    const active = cloneProfile().priorityChanges[0];
    active.materialityThresholdBps = null;
    expect(PriorityChangeSchema.safeParse(active).success).toBe(false);
  });

  it("uses weight in decision materiality without overriding metric similarity", () => {
    const lowWeight = cloneProfile().priorityChanges[0];
    lowWeight.weight = 1;
    lowWeight.originUtilityBps = 3_000;
    lowWeight.destinationUtilityBps = 3_500;
    lowWeight.utilityDeltaBps = 500;
    lowWeight.weightedContribution = 500;
    lowWeight.classification = "improves";
    lowWeight.material = true;

    const result = PriorityChangeSchema.safeParse(lowWeight);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.map((issue) => issue.path.join(".")),
      ).toContain("material");
    }
  });

  it("does not permit unsupported utilities on an excluded priority", () => {
    const profile = cloneProfile();
    profile.priorityChanges[0].weight = 0;

    expect(issuePaths(profile)).toContain("priorityChanges.0.weight");
  });

  it("binds priority utilities to promoted benchmark outputs", () => {
    const profile = cloneProfile();
    profile.priorityChanges[0].originUtilityBps = 9_000;
    profile.priorityChanges[0].destinationUtilityBps = 1_000;
    profile.priorityChanges[0].utilityDeltaBps = -8_000;
    profile.priorityChanges[0].weightedContribution = -40_000;
    profile.priorityChanges[0].classification = "worsens";

    expect(issuePaths(profile)).toContain("priorityChanges.0.evidenceRefs.0");
  });

  it("binds transformed utilities to the user's preferred direction", () => {
    const result = cloneEvaluationResult();
    result.scenarioInput.priorities[0].preferredDirection = "higher";
    result.decisionProfile.priorityChanges[0].preferredDirection = "higher";
    result.decisionProfile.inputFingerprintSha256 = fingerprintScenarioInput(
      result.scenarioInput,
    );

    const parsed = EvaluationResultSchema.safeParse(result);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.map((issue) => issue.path.join(".")),
      ).toContain("decisionProfile.priorityChanges.0.evidenceRefs.0");
    }
  });

  it("rejects evidence from a different priority", () => {
    const profile = cloneProfile();
    profile.priorityChanges[0].evidenceRefs = [
      "benchmark.commute_time.fixture",
    ];

    expect(issuePaths(profile)).toContain("priorityChanges.0.evidenceRefs.0");
  });

  it("rejects duplicate logical priorities even when record IDs differ", () => {
    const profile = cloneProfile();
    profile.priorityChanges[1].priorityId = "climate_heat";

    expect(issuePaths(profile)).toContain("priorityChanges");
  });

  it("requires finding evidence to match the finding subject", () => {
    const profile = cloneProfile();
    profile.findings.assumptions[0].evidenceRefs = [
      "benchmark.climate_heat.fixture",
    ];

    expect(issuePaths(profile)).toContain(
      "findings.assumptions.0.evidenceRefs.0",
    );
  });

  it("requires every finding to cite its exact deterministic evidence set", () => {
    const result = cloneEvaluationResult();
    const financialDriver = result.decisionProfile.findings.drivers.find(
      (finding) => finding.code === "financial_cushion_improves",
    );
    expect(financialDriver).toBeDefined();
    if (financialDriver === undefined) return;

    financialDriver.evidenceRefs = ["input.destination.housing"];

    const parsed = EvaluationResultSchema.safeParse(result);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.map((issue) => issue.path.join(".")),
      ).toContain("decisionProfile.findings.drivers");
    }
  });

  it("requires confidence to cite the complete active benchmark set", () => {
    const profile = cloneProfile();
    profile.confidence.evidenceRefs = ["input.destination.housing"];

    expect(issuePaths(profile)).toContain("confidence.evidenceRefs");
  });

  it("rejects unregistered derived evidence as condition grounding", () => {
    const profile = cloneProfile();
    profile.evidence.push({
      kind: "derived",
      id: "derived.financial.magic",
      metricId: "financial.magic",
      unit: "usd_cents",
      value: 999_999,
      formula: { id: "financial.magic", version: "1.0.0" },
      inputRefs: ["input.destination.housing"],
    });
    profile.evidence.sort((left, right) => left.id.localeCompare(right.id));
    profile.condition.evidenceRefs = ["derived.financial.magic"];

    expect(issuePaths(profile)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^evidence\.\d+\.metricId$/),
        "condition.evidenceRefs",
      ]),
    );
  });

  it("strictly binds destination cushion and housing-burden evidence", () => {
    const profile = cloneProfile();
    const destinationCushion = profile.evidence.find(
      (evidence) =>
        evidence.id === "derived.financial.destination_monthly_cushion",
    );
    const destinationBurden = profile.evidence.find(
      (evidence) =>
        evidence.id === "derived.financial.destination_housing_burden",
    );
    if (
      destinationCushion?.kind !== "derived" ||
      destinationBurden?.kind !== "derived"
    ) {
      throw new Error("Expected registered destination evidence.");
    }

    destinationCushion.value += 1;
    destinationBurden.inputRefs.reverse();

    expect(issuePaths(profile)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^evidence\.\d+$/)]),
    );
  });

  it("rejects arbitrary non-material findings", () => {
    const profile = cloneProfile();
    profile.findings.drivers.push({
      id: "finding.extra_nonmaterial",
      code: "extra_nonmaterial",
      subject: { kind: "priority", priorityId: "climate_heat" },
      material: false,
      evidenceRefs: ["benchmark.climate_heat.fixture"],
    });

    expect(issuePaths(profile)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^findings\.drivers\.\d+\.material$/),
      ]),
    );
  });

  it("rejects fabricated next steps and canonicalizes finding order", () => {
    const fabricated = cloneProfile();
    fabricated.nextSteps = [
      {
        id: "next_step.do_something_else",
        code: "do_something_else",
        evidenceRefs: ["derived.financial.cushion_delta"],
      },
    ];
    expect(issuePaths(fabricated)).toContain("nextSteps");

    const reordered = cloneProfile();
    reordered.findings.drivers.reverse();
    reordered.findings.assumptions.reverse();
    const parsed = DecisionProfileSchema.parse(reordered);
    expect(parsed.findings.drivers.map((finding) => finding.id)).toEqual([
      "finding.climate_heat_improves",
      "finding.financial_cushion_improves",
    ]);
    expect(parsed.findings.assumptions.map((finding) => finding.id)).toEqual([
      "finding.target_expenses_estimate",
      "finding.target_housing_estimate",
    ]);
  });

  it("accepts a complete financial-only Decision Profile", () => {
    const profile = cloneProfile();
    profile.priorityChanges = [];
    profile.confidence = {
      level: "limited",
      ruleIds: ["confidence.no_active_benchmark_evidence"],
      evidenceRefs: [],
      missingPriorityIds: [],
    };
    profile.condition.evidenceRefs = ["derived.financial.cushion_delta"];
    profile.findings.drivers = profile.findings.drivers.filter(
      (finding) => finding.subject.kind === "financial",
    );
    profile.findings.omittedPriorities = [];
    profile.evidence = profile.evidence.filter(
      (evidence) => evidence.kind !== "benchmark_metric",
    );

    expect(DecisionProfileSchema.safeParse(profile).success).toBe(true);
  });

  it("derives profile confidence from promoted evidence grades", () => {
    const profile = cloneProfile();
    const evidence = profile.evidence.find(
      (candidate) => candidate.id === "benchmark.climate_heat.fixture",
    );
    if (evidence?.kind !== "benchmark_metric") {
      throw new Error("Expected climate benchmark evidence.");
    }
    evidence.quality.coverageBps = 0;
    evidence.quality.grade.value = "limited";

    expect(issuePaths(profile)).toContain("confidence");
  });

  it("represents housing burdens above 100 percent without clipping", () => {
    expect(
      FinancialStateSchema.safeParse({
        monthlyTakeHomeIncomeCents: 200_000,
        monthlyGrossIncomeCents: 100_000,
        monthlyHousingCostCents: 120_000,
        monthlyRecurringExpensesCents: 20_000,
        monthlyRetainedPropertyNetCents: 0,
        monthlyCushionCents: 60_000,
        housingBurdenBps: 12_000,
        assumptionBasis: {
          takeHomeIncome: "confirmed",
          grossIncome: "confirmed",
          housingCost: "confirmed",
          recurringExpenses: "confirmed",
          retainedPropertyNet: "confirmed",
        },
      }).success,
    ).toBe(true);
  });

  it("grounds a negative target cushion blocker in its absolute metric and inputs", () => {
    const profile = cloneProfile();
    profile.financialPosition.destination.monthlyRecurringExpensesCents = 500_000;
    profile.financialPosition.destination.monthlyCushionCents = -110_000;
    profile.financialPosition.change.monthlyCushionDeltaCents = -230_000;
    profile.financialPosition.change.cushionDeltaBpsOfOriginTakeHome = -4_600;
    profile.financialPosition.change.classification = "worsens";
    profile.financialPosition.blockerCodes = ["negative_target_cushion"];
    profile.condition = {
      value: "high_financial_risk_under_assumptions",
      ruleId: "condition.financial_blocker",
      evidenceRefs: [
        "benchmark.climate_heat.fixture",
        "derived.financial.cushion_delta",
        "derived.financial.destination_monthly_cushion",
        "input.destination.housing",
        "input.destination.recurring",
        "input.destination.retained",
        "input.destination.take_home",
      ],
    };
    profile.findings.drivers = profile.findings.drivers.filter(
      (finding) => finding.subject.kind === "priority",
    );
    profile.findings.tradeoffs = [
      {
        id: "finding.financial_cushion_worsens",
        code: "financial_cushion_worsens",
        subject: {
          kind: "financial",
          metricId: "financial.monthly_cushion_delta",
        },
        material: true,
        evidenceRefs: ["derived.financial.cushion_delta"],
      },
    ];
    profile.findings.blockers = [
      {
        id: "finding.negative_target_cushion",
        code: "negative_target_cushion",
        subject: {
          kind: "financial",
          metricId: "financial.destination_monthly_cushion",
        },
        material: true,
        evidenceRefs: [
          "derived.financial.destination_monthly_cushion",
          "input.destination.housing",
          "input.destination.recurring",
          "input.destination.retained",
          "input.destination.take_home",
        ],
      },
    ];
    profile.nextSteps = [
      {
        id: "next_step.resolve_negative_target_cushion",
        code: "resolve_negative_target_cushion",
        evidenceRefs: [
          "derived.financial.destination_monthly_cushion",
          "input.destination.housing",
          "input.destination.recurring",
          "input.destination.retained",
          "input.destination.take_home",
        ],
      },
    ];

    const recurring = profile.evidence.find(
      (evidence) => evidence.id === "input.destination.recurring",
    );
    const cushionDelta = profile.evidence.find(
      (evidence) => evidence.id === "derived.financial.cushion_delta",
    );
    const destinationCushion = profile.evidence.find(
      (evidence) =>
        evidence.id === "derived.financial.destination_monthly_cushion",
    );
    if (
      recurring?.kind !== "scenario_input" ||
      cushionDelta?.kind !== "derived" ||
      destinationCushion?.kind !== "derived"
    ) {
      throw new Error("Expected financial evidence.");
    }
    recurring.value = 500_000;
    recurring.plausibleRangeCents = { min: 490_000, max: 510_000 };
    cushionDelta.value = -230_000;
    destinationCushion.value = -110_000;

    expect(DecisionProfileSchema.safeParse(profile).success).toBe(true);
  });

  it("grounds the fifty-percent housing blocker in burden and gross/housing inputs", () => {
    const profile = cloneProfile();
    profile.financialPosition.destination.monthlyGrossIncomeCents = 340_000;
    profile.financialPosition.destination.housingBurdenBps = 5_000;
    profile.financialPosition.change.housingBurdenDeltaBps = 2_857;
    profile.financialPosition.blockerCodes = [
      "target_housing_burden_at_or_above_50_percent",
    ];
    profile.condition = {
      value: "high_financial_risk_under_assumptions",
      ruleId: "condition.financial_blocker",
      evidenceRefs: [
        "benchmark.climate_heat.fixture",
        "derived.financial.cushion_delta",
        "derived.financial.destination_housing_burden",
        "input.destination.gross",
        "input.destination.housing",
      ],
    };
    profile.findings.blockers = [
      {
        id: "finding.target_housing_burden_at_or_above_50_percent",
        code: "target_housing_burden_at_or_above_50_percent",
        subject: {
          kind: "financial",
          metricId: "financial.destination_housing_burden",
        },
        material: true,
        evidenceRefs: [
          "derived.financial.destination_housing_burden",
          "input.destination.gross",
          "input.destination.housing",
        ],
      },
    ];
    profile.nextSteps = [
      {
        id: "next_step.verify_target_housing_burden",
        code: "verify_target_housing_burden",
        evidenceRefs: [
          "derived.financial.destination_housing_burden",
          "input.destination.gross",
          "input.destination.housing",
        ],
      },
    ];
    const gross = profile.evidence.find(
      (evidence) => evidence.id === "input.destination.gross",
    );
    const burden = profile.evidence.find(
      (evidence) =>
        evidence.id === "derived.financial.destination_housing_burden",
    );
    if (gross?.kind !== "scenario_input" || burden?.kind !== "derived") {
      throw new Error("Expected housing-burden evidence.");
    }
    gross.value = 340_000;
    burden.value = 5_000;

    expect(DecisionProfileSchema.safeParse(profile).success).toBe(true);
  });

  it("requires promising-if results to cite a decision-changing breakpoint", () => {
    const profile = cloneProfile();
    profile.condition.value = "promising_if";

    expect(issuePaths(profile)).toEqual(
      expect.arrayContaining(["condition.value", "condition"]),
    );
  });

  it("derives breakpoint range status from the cited input range", () => {
    const profile = cloneProfile();
    profile.breakpoints = [
      {
        id: "breakpoint.target_housing",
        kind: "money",
        inputPath: "finances.destination.housingCost.monthlyCents",
        operator: "at_or_below",
        thresholdCents: 160_000,
        withinPlausibleRange: false,
        changesConditionTo: "worth_a_closer_look",
        evidenceRefs: ["input.destination.housing"],
      },
    ];
    profile.stability = {
      level: "assumption_sensitive",
      breakpointIds: ["breakpoint.target_housing"],
      reasonCodes: ["stability.in_range_condition_change"],
    };
    profile.condition.value = "promising_if";

    expect(issuePaths(profile)).toEqual(
      expect.arrayContaining([
        "breakpoints.0.withinPlausibleRange",
        "stability.breakpointIds",
      ]),
    );
  });

  it("does not permit stable results to omit an in-range breakpoint", () => {
    const profile = cloneProfile();
    profile.breakpoints = [
      {
        id: "breakpoint.target_housing",
        kind: "money",
        inputPath: "finances.destination.housingCost.monthlyCents",
        operator: "at_or_below",
        thresholdCents: 160_000,
        withinPlausibleRange: true,
        changesConditionTo: "meaningful_tradeoff",
        evidenceRefs: ["input.destination.housing"],
      },
    ];
    profile.stability = {
      level: "stable",
      breakpointIds: [],
      reasonCodes: ["stability.no_in_range_condition_change"],
    };

    expect(issuePaths(profile)).toEqual(
      expect.arrayContaining(["stability.breakpointIds", "stability.level"]),
    );
  });

  it("rejects negative housing breakpoints even when evidence is mutated", () => {
    const profile = cloneProfile();
    const housingEvidenceIndex = profile.evidence.findIndex(
      (evidence) => evidence.id === "input.destination.housing",
    );
    const housingEvidence = profile.evidence[housingEvidenceIndex];
    if (housingEvidence?.kind !== "scenario_input") {
      throw new Error("Expected destination housing input evidence.");
    }
    housingEvidence.value = -100;
    housingEvidence.plausibleRangeCents = { min: -200, max: 0 };
    profile.financialPosition.destination.monthlyHousingCostCents = -100;
    profile.breakpoints = [
      {
        id: "breakpoint.target_housing",
        kind: "money",
        inputPath: "finances.destination.housingCost.monthlyCents",
        operator: "at_or_below",
        thresholdCents: -150,
        withinPlausibleRange: true,
        changesConditionTo: "worth_a_closer_look",
        evidenceRefs: ["input.destination.housing"],
      },
    ];

    expect(issuePaths(profile)).toEqual(
      expect.arrayContaining([
        "financialPosition.destination.monthlyHousingCostCents",
        `evidence.${housingEvidenceIndex}.value`,
        `evidence.${housingEvidenceIndex}.plausibleRangeCents`,
        "breakpoints.0.thresholdCents",
      ]),
    );
  });
});

describe("EvaluationResultSchema", () => {
  it.each(ResultModeSchema.options)(
    "defines the %s result mode",
    (resultMode) => {
      expect(ResultModeSchema.safeParse(resultMode).success).toBe(true);
    },
  );

  it("accepts a complete deterministic result", () => {
    expect(
      EvaluationResultSchema.safeParse(cloneEvaluationResult()).success,
    ).toBe(true);
  });

  it("structurally excludes research results from the transport schema", () => {
    const result = {
      ...cloneEvaluationResult(),
      releaseStatus: "research_only" as const,
    };

    expect(UserFacingEvaluationResultSchema.safeParse(result).success).toBe(
      false,
    );
    expect(EvaluationResultSchema.safeParse(result).success).toBe(false);
  });

  it("accepts null optional gross income without throwing in refinements", () => {
    const result = cloneEvaluationResult();
    result.scenarioInput.finances.destination.grossIncome = null;
    const profile = result.decisionProfile;
    profile.inputFingerprintSha256 = fingerprintScenarioInput(
      result.scenarioInput,
    );
    profile.financialPosition.destination.monthlyGrossIncomeCents = null;
    profile.financialPosition.destination.housingBurdenBps = null;
    profile.financialPosition.destination.assumptionBasis.grossIncome = null;
    profile.financialPosition.change.housingBurdenDeltaBps = null;
    profile.financialPosition.riskCodes = [
      "target_gross_income_unknown",
      "target_housing_not_confirmed",
      "target_expenses_not_confirmed",
    ];
    profile.evidence = profile.evidence.filter(
      (evidence) =>
        evidence.id !== "input.destination.gross" &&
        evidence.id !== "derived.financial.destination_housing_burden",
    );
    profile.nextSteps = [
      {
        id: "next_step.collect_target_gross_income",
        code: "collect_target_gross_income",
        evidenceRefs: ["input.destination.housing"],
      },
      {
        id: "next_step.verify_target_expenses",
        code: "verify_target_expenses",
        evidenceRefs: ["input.destination.recurring"],
      },
      {
        id: "next_step.verify_target_housing",
        code: "verify_target_housing",
        evidenceRefs: ["input.destination.housing"],
      },
    ];

    expect(() => EvaluationResultSchema.safeParse(result)).not.toThrow();
    expect(EvaluationResultSchema.safeParse(result).success).toBe(true);
  });

  it("returns a deeply frozen, checksum-verified evaluation bundle", () => {
    const result = verifyEvaluationResult(cloneEvaluationResult());

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.benchmarkComparison)).toBe(true);
    expect(Object.isFrozen(result.decisionProfile.evidence)).toBe(true);
  });

  it("rejects an input fingerprint that is merely syntactically valid", () => {
    const result = cloneEvaluationResult();
    result.decisionProfile.inputFingerprintSha256 = "a".repeat(64);

    const parsed = EvaluationResultSchema.safeParse(result);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.map((issue) => issue.path.join(".")),
      ).toContain("decisionProfile.inputFingerprintSha256");
    }
  });

  it("binds plausible ranges to the canonical input", () => {
    const result = cloneEvaluationResult();
    const housingEvidence = result.decisionProfile.evidence.find(
      (evidence) => evidence.id === "input.destination.housing",
    );
    if (housingEvidence?.kind !== "scenario_input") {
      throw new Error("Expected destination housing evidence.");
    }
    housingEvidence.plausibleRangeCents = null;

    const parsed = EvaluationResultSchema.safeParse(result);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^decisionProfile\.evidence\.\d+$/),
        ]),
      );
    }
  });

  it("binds priority weights and directions to the canonical input", () => {
    const result = cloneEvaluationResult();
    result.scenarioInput.priorities[0].weight = 4;
    result.decisionProfile.inputFingerprintSha256 = fingerprintScenarioInput(
      result.scenarioInput,
    );

    const parsed = EvaluationResultSchema.safeParse(result);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.map((issue) => issue.path.join(".")),
      ).toContain("scenarioInput.priorities.0");
    }
  });

  it("requires same-metro inputs to resolve to one geography record", () => {
    const result = cloneEvaluationResult();
    result.scenarioInput.destinationMetroSlug =
      result.scenarioInput.originMetroSlug;
    result.benchmarkComparison.destination.slug =
      result.benchmarkComparison.origin.slug;
    result.decisionProfile.scenario.destination.slug =
      result.decisionProfile.scenario.origin.slug;
    result.decisionProfile.inputFingerprintSha256 = fingerprintScenarioInput(
      result.scenarioInput,
    );

    const parsed = EvaluationResultSchema.safeParse(result);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.map((issue) => issue.path.join(".")),
      ).toContain("benchmarkComparison.destination");
    }
  });

  it("rejects stale benchmark checksums inside the evaluation bundle", () => {
    const result = cloneEvaluationResult();
    result.benchmarkComparison.priorities[0].evidence.definition += " Mutated.";

    const parsed = EvaluationResultSchema.safeParse(result);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.map((issue) => issue.path.join(".")),
      ).toContain("benchmarkComparison.snapshot.sha256");
    }
  });

  it("rejects checksum-valid partial evidence from a full evaluation", () => {
    const result = cloneEvaluationResult();
    const priority = result.benchmarkComparison.priorities[0];
    priority.destinationUtilityBps = null;
    priority.evidence.destinationValue = null;
    priority.evidence.deltaValue = null;
    priority.evidence.transformation.outputs.destinationUtilityBps = null;
    priority.evidence.transformation.outputs.destinationUncertaintyBps = null;
    priority.evidence.quality.missingness = "partial";
    priority.evidence.quality.grade.value = "limited";
    const checksum = calculateBenchmarkComparisonChecksum(
      result.benchmarkComparison,
    );
    result.benchmarkComparison.snapshot.sha256 = checksum;
    result.benchmarkComparison.priorities.forEach((entry) => {
      entry.evidence.snapshotSha256 = checksum;
    });

    const parsed = EvaluationResultSchema.safeParse(result);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.map((issue) => issue.path.join(".")),
      ).toContain(
        "benchmarkComparison.priorities.0.evidence.quality.missingness",
      );
    }
  });

  it.each([
    "explainer",
    "repaired_explainer",
    "deterministic_fallback",
  ] as const)(
    "does not accept %s before its verifier artifacts exist",
    (resultMode) => {
      expect(
        EvaluationResultSchema.safeParse({
          ...cloneEvaluationResult(),
          resultMode,
        }).success,
      ).toBe(false);
    },
  );

  it("does not permit the legacy PARTIAL display state", () => {
    expect(ResultModeSchema.safeParse("PARTIAL").success).toBe(false);
  });
});
