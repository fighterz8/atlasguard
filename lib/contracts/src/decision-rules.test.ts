import { describe, expect, it } from "vitest";

import {
  deriveConfidenceSelection,
  deriveDecisionNextSteps,
  isPriorityChangeMaterial,
  selectDecisionCondition,
} from "./decision-rules";

const baselineSignals = {
  hasFinancialBlocker: false,
  hasCriticalEvidenceGap: false,
  hasMaterialUpside: false,
  hasMaterialDownside: false,
  hasFavorableInRangeBreakpoint: false,
};

describe("selectDecisionCondition", () => {
  it("gives financial blockers absolute precedence", () => {
    expect(
      selectDecisionCondition({
        ...baselineSignals,
        hasFinancialBlocker: true,
        hasCriticalEvidenceGap: true,
        hasMaterialUpside: true,
      }),
    ).toEqual({
      value: "high_financial_risk_under_assumptions",
      ruleId: "condition.financial_blocker",
    });
  });

  it("downgrades a critical evidence gap before considering upside", () => {
    expect(
      selectDecisionCondition({
        ...baselineSignals,
        hasCriticalEvidenceGap: true,
        hasMaterialUpside: true,
      }),
    ).toEqual({
      value: "meaningful_tradeoff",
      ruleId: "condition.critical_evidence_gap",
    });
  });

  it("uses promising-if for material upside with a resolvable breakpoint", () => {
    expect(
      selectDecisionCondition({
        ...baselineSignals,
        hasMaterialUpside: true,
        hasFavorableInRangeBreakpoint: true,
      }),
    ).toEqual({
      value: "promising_if",
      ruleId: "condition.material_upside_with_resolvable_breakpoint",
    });
  });

  it("does not call an adverse breakpoint promising", () => {
    expect(
      selectDecisionCondition({
        ...baselineSignals,
        hasMaterialUpside: true,
        hasFavorableInRangeBreakpoint: false,
      }),
    ).toEqual({
      value: "worth_a_closer_look",
      ruleId: "condition.material_upside_without_material_downside",
    });
  });

  it("selects worth-a-closer-look for upside without material downside", () => {
    expect(
      selectDecisionCondition({
        ...baselineSignals,
        hasMaterialUpside: true,
      }),
    ).toEqual({
      value: "worth_a_closer_look",
      ruleId: "condition.material_upside_without_material_downside",
    });
  });

  it("uses meaningful tradeoff as the exhaustive default", () => {
    expect(selectDecisionCondition(baselineSignals)).toEqual({
      value: "meaningful_tradeoff",
      ruleId: "condition.default_tradeoff",
    });
  });
});

describe("weighted priority materiality", () => {
  it("uses weight three as the metric-threshold reference", () => {
    expect(isPriorityChangeMaterial(500, 3, 500)).toBe(true);
    expect(isPriorityChangeMaterial(500, 2, 500)).toBe(false);
    expect(isPriorityChangeMaterial(1_500, 1, 500)).toBe(true);
  });

  it("never promotes a metric-level similar change", () => {
    expect(isPriorityChangeMaterial(499, 5, 500)).toBe(false);
  });
});

describe("confidence and next-step policies", () => {
  it("limits confidence when there is no active benchmark evidence", () => {
    expect(
      deriveConfidenceSelection({
        hasCriticalEvidenceGap: false,
        activeQualityGrades: [],
      }),
    ).toEqual({
      level: "limited",
      ruleId: "confidence.no_active_benchmark_evidence",
    });
  });

  it("gives blocker investigation steps precedence", () => {
    expect(
      deriveDecisionNextSteps({
        blockerCodes: ["negative_target_cushion"],
        criticalMissingPriorities: [
          {
            priorityId: "climate_heat",
            evidenceRefs: ["benchmark.climate_heat.fixture"],
          },
        ],
        riskCodes: ["target_housing_not_confirmed"],
        conditionEvidenceRefs: ["derived.financial.cushion_delta"],
      }),
    ).toEqual([
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
    ]);
  });

  it("selects missing-evidence, assumption, and default review steps deterministically", () => {
    expect(
      deriveDecisionNextSteps({
        blockerCodes: [],
        criticalMissingPriorities: [
          {
            priorityId: "climate_heat",
            evidenceRefs: ["benchmark.climate_heat.fixture"],
          },
        ],
        riskCodes: ["target_housing_not_confirmed"],
        conditionEvidenceRefs: ["derived.financial.cushion_delta"],
      }),
    ).toEqual([
      {
        id: "next_step.investigate_missing_climate_heat",
        code: "investigate_missing_climate_heat",
        evidenceRefs: ["benchmark.climate_heat.fixture"],
      },
    ]);

    expect(
      deriveDecisionNextSteps({
        blockerCodes: [],
        criticalMissingPriorities: [],
        riskCodes: ["target_housing_not_confirmed"],
        conditionEvidenceRefs: ["derived.financial.cushion_delta"],
      }),
    ).toEqual([
      {
        id: "next_step.verify_target_housing",
        code: "verify_target_housing",
        evidenceRefs: ["input.destination.housing"],
      },
    ]);

    expect(
      deriveDecisionNextSteps({
        blockerCodes: [],
        criticalMissingPriorities: [],
        riskCodes: [],
        conditionEvidenceRefs: ["derived.financial.cushion_delta"],
      }),
    ).toEqual([
      {
        id: "next_step.review_decision_evidence",
        code: "review_decision_evidence",
        evidenceRefs: ["derived.financial.cushion_delta"],
      },
    ]);
  });
});
