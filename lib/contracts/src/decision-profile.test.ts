import { describe, expect, it } from "vitest";

import {
  DecisionProfileSchema,
  FinancialStateSchema,
} from "./decision-profile";
import {
  BenchmarkComparisonSchema,
  calculateBenchmarkComparisonChecksum,
} from "./benchmark";
import {
  EvaluationResultSchema,
  ResultModeSchema,
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

  it("accepts a complete financial-only Decision Profile", () => {
    const profile = cloneProfile();
    profile.priorityChanges = [];
    profile.confidence.evidenceRefs = [];
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
