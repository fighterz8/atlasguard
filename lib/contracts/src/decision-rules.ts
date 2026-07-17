export const DECISION_RULE_VERSION = "1.0.0" as const;
export const MINIMUM_FINANCIAL_MATERIALITY_CENTS = 15_000;

export const DECISION_CONDITION_RULE_IDS = {
  financialBlocker: "condition.financial_blocker",
  criticalEvidenceGap: "condition.critical_evidence_gap",
  promisingIf: "condition.material_upside_with_resolvable_breakpoint",
  materialUpside: "condition.material_upside_without_material_downside",
  defaultTradeoff: "condition.default_tradeoff",
} as const;

export type DecisionConditionSelection = {
  value:
    | "worth_a_closer_look"
    | "promising_if"
    | "meaningful_tradeoff"
    | "high_financial_risk_under_assumptions";
  ruleId: (typeof DECISION_CONDITION_RULE_IDS)[keyof typeof DECISION_CONDITION_RULE_IDS];
};

export type DecisionSignalSummary = {
  hasFinancialBlocker: boolean;
  hasCriticalEvidenceGap: boolean;
  hasMaterialUpside: boolean;
  hasMaterialDownside: boolean;
  hasFavorableInRangeBreakpoint: boolean;
};

export const selectDecisionCondition = (
  signals: DecisionSignalSummary,
): DecisionConditionSelection => {
  if (signals.hasFinancialBlocker) {
    return {
      value: "high_financial_risk_under_assumptions",
      ruleId: DECISION_CONDITION_RULE_IDS.financialBlocker,
    };
  }

  if (signals.hasCriticalEvidenceGap) {
    return {
      value: "meaningful_tradeoff",
      ruleId: DECISION_CONDITION_RULE_IDS.criticalEvidenceGap,
    };
  }

  if (signals.hasMaterialUpside && signals.hasFavorableInRangeBreakpoint) {
    return {
      value: "promising_if",
      ruleId: DECISION_CONDITION_RULE_IDS.promisingIf,
    };
  }

  if (signals.hasMaterialUpside && !signals.hasMaterialDownside) {
    return {
      value: "worth_a_closer_look",
      ruleId: DECISION_CONDITION_RULE_IDS.materialUpside,
    };
  }

  return {
    value: "meaningful_tradeoff",
    ruleId: DECISION_CONDITION_RULE_IDS.defaultTradeoff,
  };
};

export const roundHalfAwayFromZero = (value: number): number =>
  value < 0 ? Math.ceil(value - 0.5) : Math.floor(value + 0.5);

export const calculateMonthlyCushion = (
  takeHomeIncomeCents: number,
  housingCostCents: number,
  recurringExpensesCents: number,
  retainedPropertyNetCents: number,
): number =>
  takeHomeIncomeCents -
  housingCostCents -
  recurringExpensesCents +
  retainedPropertyNetCents;

export const calculateHousingBurdenBps = (
  housingCostCents: number,
  grossIncomeCents: number | null,
): number | null => {
  if (grossIncomeCents === null || grossIncomeCents === 0) {
    return null;
  }

  return roundHalfAwayFromZero((housingCostCents * 10_000) / grossIncomeCents);
};

export const calculateFinancialMaterialityCents = (
  originTakeHomeIncomeCents: number,
): number =>
  Math.max(
    MINIMUM_FINANCIAL_MATERIALITY_CENTS,
    roundHalfAwayFromZero(originTakeHomeIncomeCents / 20),
  );

export const classifySignedChange = (
  delta: number,
  materialityThreshold: number,
): "improves" | "similar" | "worsens" => {
  if (delta >= materialityThreshold) {
    return "improves";
  }
  if (delta <= -materialityThreshold) {
    return "worsens";
  }
  return "similar";
};
