import type { FinancialInputPath } from "./benchmark";
import type { Breakpoint, DecisionProfile } from "./decision-profile";
import {
  calculateFinancialMaterialityCents,
  calculateHousingBurdenBps,
  calculateMonthlyCushion,
  classifySignedChange,
  deriveFinancialBlockerCodes,
  FINANCIAL_INPUT_EVIDENCE_IDS,
  selectDecisionCondition,
  type DecisionConditionSelection,
} from "./decision-rules";
import { MAX_MONTHLY_CENTS } from "./primitives";
import type { ScenarioInput } from "./scenario-input";

export const SENSITIVITY_INPUT_PATHS = [
  "finances.destination.takeHomeIncome.monthlyCents",
  "finances.destination.housingCost.monthlyCents",
  "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
  "finances.destination.retainedPropertyNet.monthlyCents",
] as const satisfies readonly FinancialInputPath[];

export type SensitivityInputPath = (typeof SENSITIVITY_INPUT_PATHS)[number];

export type FinancialSensitivityResult = Readonly<{
  baselineCondition: DecisionConditionSelection;
  breakpoints: Breakpoint[];
  stability: DecisionProfile["stability"];
}>;

const pathKey = (path: SensitivityInputPath) =>
  path === "finances.destination.takeHomeIncome.monthlyCents"
    ? "take_home"
    : path === "finances.destination.housingCost.monthlyCents"
      ? "housing"
      : path ===
          "finances.destination.recurringExpensesExcludingHousing.monthlyCents"
        ? "recurring"
        : "retained_property_net";

const assumptionFor = (scenario: ScenarioInput, path: SensitivityInputPath) =>
  path === "finances.destination.takeHomeIncome.monthlyCents"
    ? scenario.finances.destination.takeHomeIncome
    : path === "finances.destination.housingCost.monthlyCents"
      ? scenario.finances.destination.housingCost
      : path ===
          "finances.destination.recurringExpensesExcludingHousing.monthlyCents"
        ? scenario.finances.destination.recurringExpensesExcludingHousing
        : scenario.finances.destination.retainedPropertyNet;

const conditionAt = (
  scenario: ScenarioInput,
  priorityChanges: readonly DecisionProfile["priorityChanges"][number][],
  override?: { path: SensitivityInputPath; monthlyCents: number },
): DecisionConditionSelection => {
  const origin = scenario.finances.origin;
  const destination = scenario.finances.destination;
  const value = (path: SensitivityInputPath, current: number) =>
    override?.path === path ? override.monthlyCents : current;
  const takeHome = value(
    "finances.destination.takeHomeIncome.monthlyCents",
    destination.takeHomeIncome.monthlyCents,
  );
  const housing = value(
    "finances.destination.housingCost.monthlyCents",
    destination.housingCost.monthlyCents,
  );
  const recurring = value(
    "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
    destination.recurringExpensesExcludingHousing.monthlyCents,
  );
  const retainedPropertyNet = value(
    "finances.destination.retainedPropertyNet.monthlyCents",
    destination.retainedPropertyNet.monthlyCents,
  );
  const originCushion = calculateMonthlyCushion(
    origin.takeHomeIncome.monthlyCents,
    origin.housingCost.monthlyCents,
    origin.recurringExpensesExcludingHousing.monthlyCents,
    0,
  );
  const destinationCushion = calculateMonthlyCushion(
    takeHome,
    housing,
    recurring,
    retainedPropertyNet,
  );
  const financialClassification = classifySignedChange(
    destinationCushion - originCushion,
    calculateFinancialMaterialityCents(origin.takeHomeIncome.monthlyCents),
  );
  const blockerCodes = deriveFinancialBlockerCodes({
    destinationMonthlyCushionCents: destinationCushion,
    destinationHousingBurdenBps: calculateHousingBurdenBps(
      housing,
      destination.grossIncome?.monthlyCents ?? null,
    ),
  });
  const materialPriorities = priorityChanges.filter(
    (change) => change.material,
  );

  return selectDecisionCondition({
    hasFinancialBlocker: blockerCodes.length > 0,
    hasCriticalEvidenceGap: priorityChanges.some(
      (change) => change.weight >= 4 && change.availability === "unavailable",
    ),
    hasMaterialUpside:
      financialClassification === "improves" ||
      materialPriorities.some((change) => change.classification === "improves"),
    hasMaterialDownside:
      financialClassification === "worsens" ||
      materialPriorities.some((change) => change.classification === "worsens"),
    hasFavorableInRangeBreakpoint: false,
  });
};

const firstHousingBurdenBlockerCents = (
  grossIncomeCents: number | null,
): number | null => {
  if (grossIncomeCents === null) return null;
  let low = 0;
  let high = Math.min(MAX_MONTHLY_CENTS, grossIncomeCents);
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const burden = calculateHousingBurdenBps(middle, grossIncomeCents);
    if (burden !== null && burden >= 5_000) high = middle;
    else low = middle + 1;
  }
  return calculateHousingBurdenBps(low, grossIncomeCents)! >= 5_000
    ? low
    : null;
};

const transitionRightEdges = (
  scenario: ScenarioInput,
  path: SensitivityInputPath,
): number[] => {
  const origin = scenario.finances.origin;
  const destination = scenario.finances.destination;
  const current = assumptionFor(scenario, path).monthlyCents;
  const coefficient =
    path === "finances.destination.takeHomeIncome.monthlyCents" ||
    path === "finances.destination.retainedPropertyNet.monthlyCents"
      ? 1
      : -1;
  const originCushion = calculateMonthlyCushion(
    origin.takeHomeIncome.monthlyCents,
    origin.housingCost.monthlyCents,
    origin.recurringExpensesExcludingHousing.monthlyCents,
    0,
  );
  const destinationCushion = calculateMonthlyCushion(
    destination.takeHomeIncome.monthlyCents,
    destination.housingCost.monthlyCents,
    destination.recurringExpensesExcludingHousing.monthlyCents,
    destination.retainedPropertyNet.monthlyCents,
  );
  const currentDelta = destinationCushion - originCushion;
  const deltaConstant = currentDelta - coefficient * current;
  const cushionConstant = destinationCushion - coefficient * current;
  const materiality = calculateFinancialMaterialityCents(
    origin.takeHomeIncome.monthlyCents,
  );
  const edges =
    coefficient === 1
      ? [
          materiality - deltaConstant,
          -materiality - deltaConstant + 1,
          -cushionConstant,
        ]
      : [
          deltaConstant - materiality + 1,
          deltaConstant + materiality,
          cushionConstant + 1,
        ];

  if (path === "finances.destination.housingCost.monthlyCents") {
    const burdenEdge = firstHousingBurdenBlockerCents(
      destination.grossIncome?.monthlyCents ?? null,
    );
    if (burdenEdge !== null) edges.push(burdenEdge);
  }

  const minimum =
    path === "finances.destination.retainedPropertyNet.monthlyCents"
      ? -MAX_MONTHLY_CENTS
      : 1;

  return [...new Set(edges)]
    .filter((edge) => edge >= minimum && edge <= MAX_MONTHLY_CENTS)
    .sort((left, right) => left - right);
};

export const deriveFinancialSensitivity = (
  scenario: ScenarioInput,
  priorityChanges: readonly DecisionProfile["priorityChanges"][number][],
): FinancialSensitivityResult => {
  const baselineCondition = conditionAt(scenario, priorityChanges);
  const breakpoints: Breakpoint[] = [];

  SENSITIVITY_INPUT_PATHS.forEach((path) => {
    const assumption = assumptionFor(scenario, path);
    transitionRightEdges(scenario, path).forEach((rightValue) => {
      const leftValue = rightValue - 1;
      const leftCondition = conditionAt(scenario, priorityChanges, {
        path,
        monthlyCents: leftValue,
      });
      const rightCondition = conditionAt(scenario, priorityChanges, {
        path,
        monthlyCents: rightValue,
      });
      if (leftCondition.value === rightCondition.value) return;

      const currentValue = assumption.monthlyCents;
      const movesRight =
        currentValue <= leftValue &&
        leftCondition.value === baselineCondition.value;
      const movesLeft =
        currentValue >= rightValue &&
        rightCondition.value === baselineCondition.value;
      if (!movesRight && !movesLeft) return;

      const thresholdCents = movesRight ? rightValue : leftValue;
      const target = movesRight ? rightCondition : leftCondition;
      if (target.value === "promising_if") {
        throw new Error(
          "A direct financial reevaluation cannot produce a promising-if condition.",
        );
      }
      const range = assumption.plausibleRangeCents;
      const thresholdId =
        thresholdCents < 0
          ? `negative_${Math.abs(thresholdCents)}`
          : String(thresholdCents);
      breakpoints.push({
        id: `breakpoint.destination_${pathKey(path)}.${target.value}.${thresholdId}`,
        kind: "money",
        inputPath: path,
        operator: movesRight ? "at_or_above" : "at_or_below",
        thresholdCents,
        withinPlausibleRange:
          range !== null &&
          thresholdCents >= range.min &&
          thresholdCents <= range.max,
        changesConditionTo: target.value,
        evidenceRefs: [FINANCIAL_INPUT_EVIDENCE_IDS[path]],
      });
    });
  });

  breakpoints.sort((left, right) => left.id.localeCompare(right.id));
  const inRangeIds = breakpoints
    .filter((breakpoint) => breakpoint.withinPlausibleRange)
    .map((breakpoint) => breakpoint.id);
  const hasPlausibleRanges = SENSITIVITY_INPUT_PATHS.some(
    (path) => assumptionFor(scenario, path).plausibleRangeCents !== null,
  );
  const hasIncompleteEstimateRanges = SENSITIVITY_INPUT_PATHS.some((path) => {
    const assumption = assumptionFor(scenario, path);
    return (
      assumption.basis === "user_estimate" &&
      assumption.plausibleRangeCents === null
    );
  });
  const stability: DecisionProfile["stability"] =
    !hasPlausibleRanges || hasIncompleteEstimateRanges
      ? {
          level: "not_evaluated",
          breakpointIds: [],
          reasonCodes: [
            hasIncompleteEstimateRanges
              ? "stability.incomplete_estimate_ranges"
              : "stability.no_plausible_ranges",
          ],
        }
      : inRangeIds.length > 0
        ? {
            level: "assumption_sensitive",
            breakpointIds: inRangeIds,
            reasonCodes: ["stability.in_range_condition_change"],
          }
        : {
            level: "stable",
            breakpointIds: [],
            reasonCodes: ["stability.no_in_range_condition_change"],
          };

  return { baselineCondition, breakpoints, stability };
};
