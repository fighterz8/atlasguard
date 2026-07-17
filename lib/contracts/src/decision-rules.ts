import type { FinancialInputPath, MetricQualityGradeValue } from "./benchmark";
import type { AssumptionBasis, PriorityId } from "./primitives";

export const DECISION_RULE_VERSION = "1.0.0" as const;
export const MINIMUM_FINANCIAL_MATERIALITY_CENTS = 15_000;
export const PRIORITY_MATERIALITY_REFERENCE_WEIGHT = 3;

export const FINANCIAL_BLOCKER_CODES = [
  "negative_target_cushion",
  "target_housing_burden_at_or_above_50_percent",
] as const;

export const FINANCIAL_RISK_CODES = [
  "target_income_not_confirmed",
  "target_gross_income_unknown",
  "target_gross_income_not_confirmed",
  "target_housing_not_confirmed",
  "target_expenses_not_confirmed",
  "retained_property_net_not_confirmed",
] as const;

export type FinancialBlockerCode = (typeof FINANCIAL_BLOCKER_CODES)[number];
export type FinancialRiskCode = (typeof FINANCIAL_RISK_CODES)[number];

export const FINANCIAL_INPUT_EVIDENCE_IDS = {
  "finances.origin.takeHomeIncome.monthlyCents": "input.origin.take_home",
  "finances.origin.grossIncome.monthlyCents": "input.origin.gross",
  "finances.origin.housingCost.monthlyCents": "input.origin.housing",
  "finances.origin.recurringExpensesExcludingHousing.monthlyCents":
    "input.origin.recurring",
  "finances.destination.takeHomeIncome.monthlyCents":
    "input.destination.take_home",
  "finances.destination.grossIncome.monthlyCents": "input.destination.gross",
  "finances.destination.housingCost.monthlyCents": "input.destination.housing",
  "finances.destination.recurringExpensesExcludingHousing.monthlyCents":
    "input.destination.recurring",
  "finances.destination.retainedPropertyNet.monthlyCents":
    "input.destination.retained",
} as const satisfies Record<FinancialInputPath, string>;

type RegisteredDerivedFinancialEvidence = Readonly<{
  evidenceId: string;
  metricId: string;
  unit: "usd_cents" | "basis_points";
  inputPaths: readonly FinancialInputPath[];
}>;

export const FINANCIAL_DERIVED_EVIDENCE_REGISTRY = {
  monthlyCushionDelta: {
    evidenceId: "derived.financial.cushion_delta",
    metricId: "financial.monthly_cushion_delta",
    unit: "usd_cents",
    inputPaths: [
      "finances.origin.takeHomeIncome.monthlyCents",
      "finances.origin.housingCost.monthlyCents",
      "finances.origin.recurringExpensesExcludingHousing.monthlyCents",
      "finances.destination.takeHomeIncome.monthlyCents",
      "finances.destination.housingCost.monthlyCents",
      "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
      "finances.destination.retainedPropertyNet.monthlyCents",
    ],
  },
  destinationMonthlyCushion: {
    evidenceId: "derived.financial.destination_monthly_cushion",
    metricId: "financial.destination_monthly_cushion",
    unit: "usd_cents",
    inputPaths: [
      "finances.destination.takeHomeIncome.monthlyCents",
      "finances.destination.housingCost.monthlyCents",
      "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
      "finances.destination.retainedPropertyNet.monthlyCents",
    ],
  },
  destinationHousingBurden: {
    evidenceId: "derived.financial.destination_housing_burden",
    metricId: "financial.destination_housing_burden",
    unit: "basis_points",
    inputPaths: [
      "finances.destination.grossIncome.monthlyCents",
      "finances.destination.housingCost.monthlyCents",
    ],
  },
} as const satisfies Record<string, RegisteredDerivedFinancialEvidence>;

export const FINANCIAL_BLOCKER_FINDING_REGISTRY = {
  negative_target_cushion: {
    metricId:
      FINANCIAL_DERIVED_EVIDENCE_REGISTRY.destinationMonthlyCushion.metricId,
    evidenceId:
      FINANCIAL_DERIVED_EVIDENCE_REGISTRY.destinationMonthlyCushion.evidenceId,
    inputPaths:
      FINANCIAL_DERIVED_EVIDENCE_REGISTRY.destinationMonthlyCushion.inputPaths,
  },
  target_housing_burden_at_or_above_50_percent: {
    metricId:
      FINANCIAL_DERIVED_EVIDENCE_REGISTRY.destinationHousingBurden.metricId,
    evidenceId:
      FINANCIAL_DERIVED_EVIDENCE_REGISTRY.destinationHousingBurden.evidenceId,
    inputPaths:
      FINANCIAL_DERIVED_EVIDENCE_REGISTRY.destinationHousingBurden.inputPaths,
  },
} as const satisfies Record<
  FinancialBlockerCode,
  {
    metricId: string;
    evidenceId: string;
    inputPaths: readonly FinancialInputPath[];
  }
>;

export const FINANCIAL_RISK_FINDING_REGISTRY = {
  target_income_not_confirmed: {
    code: "target_income_estimate",
    inputPath: "finances.destination.takeHomeIncome.monthlyCents",
  },
  target_gross_income_not_confirmed: {
    code: "target_gross_income_estimate",
    inputPath: "finances.destination.grossIncome.monthlyCents",
  },
  target_housing_not_confirmed: {
    code: "target_housing_estimate",
    inputPath: "finances.destination.housingCost.monthlyCents",
  },
  target_expenses_not_confirmed: {
    code: "target_expenses_estimate",
    inputPath:
      "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
  },
  retained_property_net_not_confirmed: {
    code: "retained_property_net_estimate",
    inputPath: "finances.destination.retainedPropertyNet.monthlyCents",
  },
} as const satisfies Partial<
  Record<FinancialRiskCode, { code: string; inputPath: FinancialInputPath }>
>;

export const getFinancialRiskFindingRegistration = (
  riskCode: FinancialRiskCode,
): { code: string; inputPath: FinancialInputPath } | undefined =>
  (
    FINANCIAL_RISK_FINDING_REGISTRY as Partial<
      Record<FinancialRiskCode, { code: string; inputPath: FinancialInputPath }>
    >
  )[riskCode];

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

export type FinancialRiskInputs = Readonly<{
  targetTakeHomeBasis: AssumptionBasis;
  targetGrossIncomeCents: number | null;
  targetGrossIncomeBasis: AssumptionBasis | null;
  targetHousingBasis: AssumptionBasis;
  targetExpensesBasis: AssumptionBasis;
  retainedPropertyNetBasis: "confirmed" | "user_estimate";
}>;

export const deriveFinancialBlockerCodes = (inputs: {
  destinationMonthlyCushionCents: number;
  destinationHousingBurdenBps: number | null;
}): FinancialBlockerCode[] => {
  const blockerCodes: FinancialBlockerCode[] = [];
  if (inputs.destinationMonthlyCushionCents < 0) {
    blockerCodes.push("negative_target_cushion");
  }
  if (
    inputs.destinationHousingBurdenBps !== null &&
    inputs.destinationHousingBurdenBps >= 5_000
  ) {
    blockerCodes.push("target_housing_burden_at_or_above_50_percent");
  }
  return blockerCodes;
};

export const deriveFinancialRiskCodes = (
  inputs: FinancialRiskInputs,
): FinancialRiskCode[] => {
  const riskCodes: FinancialRiskCode[] = [];
  if (inputs.targetTakeHomeBasis !== "confirmed") {
    riskCodes.push("target_income_not_confirmed");
  }
  if (inputs.targetGrossIncomeCents === null) {
    riskCodes.push("target_gross_income_unknown");
  } else if (inputs.targetGrossIncomeBasis !== "confirmed") {
    riskCodes.push("target_gross_income_not_confirmed");
  }
  if (inputs.targetHousingBasis !== "confirmed") {
    riskCodes.push("target_housing_not_confirmed");
  }
  if (inputs.targetExpensesBasis !== "confirmed") {
    riskCodes.push("target_expenses_not_confirmed");
  }
  if (inputs.retainedPropertyNetBasis !== "confirmed") {
    riskCodes.push("retained_property_net_not_confirmed");
  }
  return riskCodes;
};

export type ConfidenceSelection = Readonly<{
  level: "high" | "moderate" | "limited";
  ruleId:
    | "confidence.active_evidence_high"
    | "confidence.active_evidence_moderate"
    | "confidence.active_evidence_limited"
    | "confidence.no_active_benchmark_evidence";
}>;

export const deriveConfidenceSelection = (inputs: {
  hasCriticalEvidenceGap: boolean;
  activeQualityGrades: readonly MetricQualityGradeValue[];
}): ConfidenceSelection => {
  if (inputs.activeQualityGrades.length === 0) {
    return {
      level: "limited",
      ruleId: "confidence.no_active_benchmark_evidence",
    };
  }
  const level =
    inputs.hasCriticalEvidenceGap ||
    inputs.activeQualityGrades.includes("limited")
      ? "limited"
      : inputs.activeQualityGrades.includes("moderate")
        ? "moderate"
        : "high";
  return {
    level,
    ruleId: `confidence.active_evidence_${level}`,
  };
};

export type CriticalMissingPriority = Readonly<{
  priorityId: PriorityId;
  evidenceRefs: readonly string[];
}>;

export type DecisionNextStep = Readonly<{
  id: string;
  code: string;
  evidenceRefs: readonly string[];
}>;

const compareStableIds = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const inputEvidenceRefs = (
  inputPaths: readonly FinancialInputPath[],
): string[] =>
  inputPaths
    .map((inputPath) => FINANCIAL_INPUT_EVIDENCE_IDS[inputPath])
    .sort(compareStableIds);

const blockerNextStep = (
  blockerCode: FinancialBlockerCode,
): DecisionNextStep => {
  const registration = FINANCIAL_BLOCKER_FINDING_REGISTRY[blockerCode];
  const code =
    blockerCode === "negative_target_cushion"
      ? "resolve_negative_target_cushion"
      : "verify_target_housing_burden";
  return {
    id: `next_step.${code}`,
    code,
    evidenceRefs: [
      registration.evidenceId,
      ...inputEvidenceRefs(registration.inputPaths),
    ].sort(compareStableIds),
  };
};

const RISK_NEXT_STEP_REGISTRY = {
  target_income_not_confirmed: {
    code: "verify_target_income",
    evidenceRefs: [
      FINANCIAL_INPUT_EVIDENCE_IDS[
        "finances.destination.takeHomeIncome.monthlyCents"
      ],
    ],
  },
  target_gross_income_unknown: {
    code: "collect_target_gross_income",
    evidenceRefs: [
      FINANCIAL_INPUT_EVIDENCE_IDS[
        "finances.destination.housingCost.monthlyCents"
      ],
    ],
  },
  target_gross_income_not_confirmed: {
    code: "verify_target_gross_income",
    evidenceRefs: [
      FINANCIAL_INPUT_EVIDENCE_IDS[
        "finances.destination.grossIncome.monthlyCents"
      ],
    ],
  },
  target_housing_not_confirmed: {
    code: "verify_target_housing",
    evidenceRefs: [
      FINANCIAL_INPUT_EVIDENCE_IDS[
        "finances.destination.housingCost.monthlyCents"
      ],
    ],
  },
  target_expenses_not_confirmed: {
    code: "verify_target_expenses",
    evidenceRefs: [
      FINANCIAL_INPUT_EVIDENCE_IDS[
        "finances.destination.recurringExpensesExcludingHousing.monthlyCents"
      ],
    ],
  },
  retained_property_net_not_confirmed: {
    code: "verify_retained_property_net",
    evidenceRefs: [
      FINANCIAL_INPUT_EVIDENCE_IDS[
        "finances.destination.retainedPropertyNet.monthlyCents"
      ],
    ],
  },
} as const satisfies Record<
  FinancialRiskCode,
  { code: string; evidenceRefs: readonly string[] }
>;

/**
 * Selects the smallest complete investigation set. Blockers take precedence,
 * then missing critical evidence, then unconfirmed assumptions. A result with
 * none of those still receives one evidence-backed review action.
 */
export const deriveDecisionNextSteps = (inputs: {
  blockerCodes: readonly FinancialBlockerCode[];
  criticalMissingPriorities: readonly CriticalMissingPriority[];
  riskCodes: readonly FinancialRiskCode[];
  conditionEvidenceRefs: readonly string[];
}): DecisionNextStep[] => {
  if (inputs.blockerCodes.length > 0) {
    return inputs.blockerCodes
      .map(blockerNextStep)
      .sort((left, right) => compareStableIds(left.id, right.id));
  }

  if (inputs.criticalMissingPriorities.length > 0) {
    return inputs.criticalMissingPriorities
      .map((priority) => ({
        id: `next_step.investigate_missing_${priority.priorityId}`,
        code: `investigate_missing_${priority.priorityId}`,
        evidenceRefs: [...priority.evidenceRefs].sort(compareStableIds),
      }))
      .sort((left, right) => compareStableIds(left.id, right.id));
  }

  if (inputs.riskCodes.length > 0) {
    return inputs.riskCodes
      .map((riskCode) => {
        const registration = RISK_NEXT_STEP_REGISTRY[riskCode];
        return {
          id: `next_step.${registration.code}`,
          code: registration.code,
          evidenceRefs: [...registration.evidenceRefs].sort(compareStableIds),
        };
      })
      .sort((left, right) => compareStableIds(left.id, right.id));
  }

  return [
    {
      id: "next_step.review_decision_evidence",
      code: "review_decision_evidence",
      evidenceRefs: [...inputs.conditionEvidenceRefs].sort(compareStableIds),
    },
  ];
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

/**
 * A metric must first clear its own materiality threshold. Weight then controls
 * decision impact: weight 3 is neutral, lower weights require proportionally
 * larger changes, and higher weights remain subject to the metric threshold.
 */
export const isPriorityChangeMaterial = (
  utilityDeltaBps: number,
  weight: number,
  materialityThresholdBps: number,
): boolean =>
  classifySignedChange(utilityDeltaBps, materialityThresholdBps) !==
    "similar" &&
  Math.abs(utilityDeltaBps * weight) >=
    materialityThresholdBps * PRIORITY_MATERIALITY_REFERENCE_WEIGHT;
