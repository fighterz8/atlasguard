import { describe, expect, it } from "vitest";

import { selectDecisionCondition } from "./decision-rules";

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
