import {
  compareResearchMetroClimateRatings,
  getResearchMetroClimateRating,
  getResearchMetroClimateRiskGuidance,
  getResearchMetroFamilyCostGuidance,
  getResearchMetroMobilityGuidance,
  getResearchMetroHousingContext,
  getResearchMetroIncomeGuidance,
  getResearchMetroOwnershipGuidance,
  loadLosAngelesToSeattleResearchBenchmark,
  losAngelesToSeattleBalancedResearchScenario,
} from "@workspace/benchmark-data";
import type {
  Finding,
  MetricEvidence,
  ScenarioInput,
  VerifiedMoveWiseHouseholdAnswers,
  VerifiedResearchEvaluationResult,
} from "@workspace/contracts";
import { clonePlainData } from "../../lib/clone-plain-data";
import {
  evaluateMoveWiseRule,
  evaluateResearchMoveDecision,
} from "@workspace/decision-core";
import type { MoveWiseDeterministicAnalysis } from "@workspace/decision-core";

import { householdFactorLabels } from "../wizard-prototype/model";
import {
  createMoveWiseOpenCheckLedger,
  moveWiseEvidenceLabel,
  moveWiseOriginLabel,
} from "../wizard-prototype/decision-ledger";
import type { DestinationPlanningAssumptions } from "../wizard-prototype/destination-planning-assumptions";
import type { DestinationPlanningSource } from "../wizard-prototype/destination-planning-assumptions";
import { createMoveWiseDecisionGateModel } from "../wizard-prototype/decision-gate-model";

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const formatMoney = (cents: number) => dollars.format(cents / 100);
const formatPercent = (basisPoints: number | null) =>
  basisPoints === null ? "Not available" : `${(basisPoints / 100).toFixed(1)}%`;
const classifyFinancialDelta = (
  deltaCents: number,
  positiveIsBetter: boolean,
) =>
  deltaCents === 0
    ? ("similar" as const)
    : deltaCents > 0 === positiveIsBetter
      ? ("improves" as const)
      : ("worsens" as const);

const conditionCopy = {
  worth_a_closer_look: {
    label: "Worth a closer look",
    summary:
      "The evaluated evidence shows material upside without a material downside.",
  },
  promising_if: {
    label: "Promising if…",
    summary: "The result depends on a specific assumption that can be checked.",
  },
  meaningful_tradeoff: {
    label: "No clear advantage yet",
    summary:
      "The evidence evaluated so far does not create a decisive case for or against this move.",
  },
  high_financial_risk_under_assumptions: {
    label: "Budget risk looks high",
    summary:
      "At least one financial condition needs to be resolved before proceeding.",
  },
} as const;

const deterministicConditionCopy = {
  likely_better_move: {
    label: "Likely better for this move picture",
    summary:
      "The evaluated finances, daily-life evidence, and household fit show strong upside with no active safety or essential-needs gate.",
  },
  worth_closer_look: {
    label: "Worth a closer look",
    summary:
      "The evaluated factors show net upside, with no active safety or essential-needs gate.",
  },
  promising_if: {
    label: "Promising if…",
    summary:
      "The move may be a better fit if the household need you marked essential is confirmed.",
  },
  no_clear_advantage: {
    label: "No clear advantage yet",
    summary:
      "The current move picture does not show a clear enough advantage, or a caution or unmet household need is holding the result back.",
  },
  high_financial_risk: {
    label: "Budget risk looks high",
    summary:
      "A destination budget condition needs to be resolved before this move can receive a favorable result.",
  },
} as const;

const findingCopy: Record<string, string> = {
  financial_cushion_improves: "Monthly financial cushion improves materially.",
  financial_cushion_worsens: "Monthly financial cushion worsens materially.",
  commute_time_improves: "Typical commute time improves materially.",
  commute_time_worsens: "Typical commute time worsens materially.",
  climate_heat_improves: "The hot-day pattern improves for your preference.",
  climate_heat_worsens: "The hot-day pattern worsens for your preference.",
  negative_target_cushion:
    "The destination budget produces a negative monthly cushion.",
  target_housing_burden_at_or_above_50_percent:
    "Destination housing is at least half of gross income.",
};

const findingText = (finding: Finding) =>
  findingCopy[finding.code] ?? finding.code.replace(/_/g, " ");

const housingTenureLabel = (
  tenure: DestinationPlanningAssumptions["destinationHousingTenure"],
) =>
  tenure === "rent" || tenure === "rent_then_buy"
    ? "first stage rent"
    : tenure === "buy"
      ? "buying"
      : "renting or buying";

const ownershipContextApplies = (
  tenure:
    | DestinationPlanningAssumptions["destinationHousingTenure"]
    | undefined,
) => tenure === "rent_then_buy" || tenure === "buy";

const rentalSupplySignal = (
  destinationCity: string,
  originCity: string,
  destinationShareBps: number,
  differenceBps: number,
) => {
  if (Math.abs(differenceBps) < 50) {
    return `This bedroom need makes up a similar share of renter homes in ${destinationCity} and ${originCity}.`;
  }
  return `This bedroom need is a ${
    differenceBps > 0 ? "larger" : "smaller"
  } share of renter homes in ${destinationCity} than ${originCity}.`;
};

const mobilityContextReading = (
  destinationCity: string,
  originCity: string,
  destinationCommuteAwayShare: string,
  differenceBps: number,
) => {
  const direction =
    Math.abs(differenceBps) < 50
      ? `similar to ${originCity}`
      : differenceBps > 0
        ? `higher than ${originCity}`
        : `lower than ${originCity}`;
  return `${destinationCommuteAwayShare} of ${destinationCity} workers commute away from home, ${direction}.`;
};

const incomeLaborReading = (
  destinationCity: string,
  originCity: string,
  direction: "lower" | "similar" | "higher",
) =>
  direction === "similar"
    ? `${destinationCity} and ${originCity} have similar metro household income in this estimate.`
    : `${destinationCity} metro household income is ${direction} than ${originCity} in this estimate.`;

const ownershipReading = (
  destinationCity: string,
  originCity: string,
  ownerValueDirection: "lower" | "similar" | "higher",
  ownerCostDirection: "lower" | "similar" | "higher",
) =>
  ownerValueDirection === "similar" && ownerCostDirection === "similar"
    ? `${destinationCity} and ${originCity} have similar ownership context in this estimate.`
    : `${destinationCity} has ${ownerValueDirection} owner-occupied home values and ${ownerCostDirection} typical monthly owner costs than ${originCity}.`;

const climateRiskReading = (
  destinationCity: string,
  originCity: string,
  direction: "lower" | "similar" | "higher",
) =>
  direction === "similar"
    ? `${destinationCity} and ${originCity} have similar FEMA NRI anchor-county baseline risk in this extract.`
    : `${destinationCity}'s selected-city anchor county has ${direction} FEMA NRI baseline risk than ${originCity}'s selected-city anchor county.`;

const nextStepCopy: Record<string, string> = {
  review_decision_evidence:
    "Add any household factors that could materially change day-to-day life.",
  resolve_negative_target_cushion:
    "Adjust income, rent, or recurring bills until the destination budget has breathing room.",
  verify_target_housing_burden:
    "Add destination gross income so MoveWise can check whether rent is taking too much of the budget.",
  verify_target_income: "Verify the expected destination take-home income.",
  collect_target_gross_income:
    "Add destination gross income to assess housing burden.",
  verify_target_gross_income: "Verify destination gross income.",
  verify_target_housing: "Verify the expected destination housing cost.",
  verify_target_expenses: "Verify destination recurring expenses.",
  verify_retained_property_net: "Verify the retained-property monthly impact.",
};

export type ResearchWhatIfValues = Readonly<{
  takeHomeIncomeCents: number;
  housingCostCents: number;
  recurringExpensesCents: number;
  retainedPropertyNetCents: number;
}>;

type WhatIfScenario =
  | ScenarioInput
  | VerifiedResearchEvaluationResult["scenarioInput"];

const whatIfValuesFromScenario = (
  scenario: WhatIfScenario,
): ResearchWhatIfValues => ({
  takeHomeIncomeCents:
    scenario.finances.destination.takeHomeIncome.monthlyCents,
  housingCostCents: scenario.finances.destination.housingCost.monthlyCents,
  recurringExpensesCents:
    scenario.finances.destination.recurringExpensesExcludingHousing
      .monthlyCents,
  retainedPropertyNetCents:
    scenario.finances.destination.retainedPropertyNet.monthlyCents,
});

const baselineWhatIfValues = whatIfValuesFromScenario(
  losAngelesToSeattleBalancedResearchScenario,
);

const scenarioWithWhatIfValues = (
  scenario: WhatIfScenario,
  values: ResearchWhatIfValues,
): ScenarioInput => {
  const mutableScenario = clonePlainData(scenario) as ScenarioInput;
  return {
    ...mutableScenario,
    finances: {
      ...mutableScenario.finances,
      destination: {
        ...mutableScenario.finances.destination,
        takeHomeIncome: {
          ...mutableScenario.finances.destination.takeHomeIncome,
          monthlyCents: values.takeHomeIncomeCents,
        },
        housingCost: {
          ...mutableScenario.finances.destination.housingCost,
          monthlyCents: values.housingCostCents,
        },
        recurringExpensesExcludingHousing: {
          ...mutableScenario.finances.destination
            .recurringExpensesExcludingHousing,
          monthlyCents: values.recurringExpensesCents,
        },
        retainedPropertyNet: {
          ...mutableScenario.finances.destination.retainedPropertyNet,
          monthlyCents: values.retainedPropertyNetCents,
        },
      },
    },
  };
};

const evaluateResearchScenario = (values = baselineWhatIfValues) =>
  evaluateResearchMoveDecision(
    scenarioWithWhatIfValues(
      losAngelesToSeattleBalancedResearchScenario,
      values,
    ),
    loadLosAngelesToSeattleResearchBenchmark("lower"),
  );

const confidenceLabels = {
  limited: "Limited evidence",
  moderate: "Moderate evidence",
  high: "High confidence",
} as const;

const stabilityLabels = {
  assumption_sensitive: "Assumption sensitive",
  stable: "Stable across estimates",
  not_evaluated: "Not evaluated",
} as const;

const scoreBandLabels = {
  worse_fit: "Worse fit",
  mixed_or_similar: "Mixed or similar",
  better_fit: "Better fit",
  substantially_better_fit: "Substantially better fit",
} as const;

const scoreBandTones = {
  worse_fit: "risk",
  mixed_or_similar: "caution",
  better_fit: "favorable",
  substantially_better_fit: "favorable",
} as const;

const scoreMetricLabels = {
  financial_cushion_delta: "Monthly financial cushion",
  commute_time: "Typical commute time",
  climate_heat: "Climate fit",
} as const;

const scoreThresholdLabels: Record<string, string> = {
  "finances.destination.takeHomeIncome.monthlyCents":
    "Destination take-home income",
  "finances.destination.grossIncome.monthlyCents": "Destination gross income",
  "finances.destination.housingCost.monthlyCents": "Destination housing",
  "finances.destination.recurringExpensesExcludingHousing.monthlyCents":
    "Destination recurring expenses",
  "finances.destination.retainedPropertyNet.monthlyCents":
    "Retained-property monthly net",
};

const scoreComponentLabels = {
  financial_security: "Financial security",
  daily_life_fit: "Daily-life fit",
  opportunity_context: "Opportunity context",
  household_fit: "Household fit",
} as const;

const scoreBlockerCopy = {
  negative_target_cushion: {
    label: "Negative destination cushion",
    explanation:
      "The destination budget falls below zero, so the registered rule prevents a favorable score.",
  },
  target_housing_burden_at_or_above_50_percent: {
    label: "Housing burden at or above 50%",
    explanation:
      "Destination housing reaches at least half of gross income, so the registered rule prevents a favorable score.",
  },
} as const;

const deterministicBlockerCopy = {
  negative_destination_cushion: {
    label: "Negative destination cushion",
    explanation:
      "The destination budget falls below zero, so the deterministic rule prevents a favorable score.",
  },
  destination_housing_burden_at_or_above_50_percent: {
    label: "Housing burden at or above 50%",
    explanation:
      "Destination housing reaches at least half of gross income, so the deterministic rule prevents a favorable score.",
  },
} as const;

const deterministicMetricLabels = {
  financial: "Monthly financial cushion",
  commute: "Typical commute time",
  climate: "Climate fit",
} as const;

const householdImpactLabels = {
  strong_positive: "Very workable",
  positive: "Workable",
  neutral: "Mixed or unclear",
  negative: "Difficult",
  strong_negative: "Very difficult",
  unavailable: "Needs confirmation",
  excluded: "Not needed",
} as const;

const householdEssentialStatusLabels = {
  confirmed_met: "Essential confirmed",
  confirmed_unmet: "Essential not met",
  unconfirmed: "Essential not confirmed",
} as const;

const bedroomLabels = {
  studio: "studio rental",
  "1": "1-bedroom rental",
  "2": "2-bedroom rental",
  "3": "3-bedroom rental",
  "4_plus": "4+ bedroom rental",
} as const;

type DeterministicResultsContext = Readonly<{
  analysis: MoveWiseDeterministicAnalysis;
  householdAnswers: VerifiedMoveWiseHouseholdAnswers;
  destinationAssumptions?: DestinationPlanningAssumptions;
}>;

export const createResearchResultsViewModel = (
  result: VerifiedResearchEvaluationResult = evaluateResearchScenario(),
  deterministicContext?: DeterministicResultsContext,
) => {
  const profile = result.decisionProfile;
  const { analysis } = evaluateMoveWiseRule({ evaluation: result });
  const housingContext = getResearchMetroHousingContext(
    profile.scenario.origin.slug,
    profile.scenario.destination.slug,
  );
  const mobilityGuidance = getResearchMetroMobilityGuidance(
    profile.scenario.origin.slug,
    profile.scenario.destination.slug,
  );
  const incomeGuidance = getResearchMetroIncomeGuidance(
    profile.scenario.origin.slug,
    profile.scenario.destination.slug,
    Math.round(
      profile.financialPosition.origin.monthlyTakeHomeIncomeCents / 100,
    ),
  );
  const familyCostGuidance = getResearchMetroFamilyCostGuidance(
    profile.scenario.origin.slug,
    profile.scenario.destination.slug,
    Math.round(
      profile.financialPosition.origin.monthlyRecurringExpensesCents / 100,
    ),
  );
  const climateRiskGuidance = getResearchMetroClimateRiskGuidance(
    profile.scenario.origin.slug,
    profile.scenario.destination.slug,
  );
  const ownershipGuidance = ownershipContextApplies(
    deterministicContext?.destinationAssumptions?.destinationHousingTenure,
  )
    ? getResearchMetroOwnershipGuidance(
        profile.scenario.origin.slug,
        profile.scenario.destination.slug,
      )
    : null;
  if (housingContext === null) {
    throw new Error(
      "Research preview requires promoted housing context for the selected metros.",
    );
  }
  const commuteMetric = profile.evidence.find(
    (entry): entry is MetricEvidence =>
      entry.kind === "benchmark_metric" && entry.priorityId === "commute_time",
  );
  const climateMetric = profile.evidence.find(
    (entry): entry is MetricEvidence =>
      entry.kind === "benchmark_metric" && entry.priorityId === "climate_heat",
  );
  const priority = profile.priorityChanges.find(
    ({ priorityId }) => priorityId === "commute_time",
  );
  const climatePriority = profile.priorityChanges.find(
    ({ priorityId }) => priorityId === "climate_heat",
  );
  if (
    commuteMetric === undefined ||
    climateMetric === undefined ||
    priority === undefined ||
    climatePriority === undefined ||
    commuteMetric.originValue === null ||
    commuteMetric.destinationValue === null ||
    commuteMetric.deltaValue === null ||
    climateMetric.originValue === null ||
    climateMetric.destinationValue === null ||
    climateMetric.deltaValue === null
  ) {
    throw new Error(
      "Research preview requires promoted commute and climate evidence.",
    );
  }

  const financialChange = profile.financialPosition.change;
  const originFinances = profile.financialPosition.origin;
  const destinationFinances = profile.financialPosition.destination;
  const deterministic = deterministicContext?.analysis;
  const deterministicResult = deterministic?.result;
  const planningSources = deterministicContext?.destinationAssumptions;
  const sourcePresentation = (
    source: DestinationPlanningSource | undefined,
    basis: "confirmed" | "user_estimate" | "assumed_same_as_origin",
  ) => {
    const origin =
      source === "user_override" || source === undefined ? "user" : "movewise";
    const evidenceStatus = basis === "confirmed" ? "verified" : "estimated";
    return {
      sourceLabel: `${moveWiseOriginLabel[origin]} · ${moveWiseEvidenceLabel[evidenceStatus]}`,
      sourceTone:
        origin === "movewise" ? ("benchmark" as const) : ("neutral" as const),
    };
  };
  const destinationAssumptions = result.scenarioInput.finances.destination;
  const publicEstimateLabels = planningSources
    ? [
        planningSources.takeHome === "movewise_public_estimate"
          ? "income"
          : null,
        planningSources.housing === "movewise_public_estimate" ? "rent" : null,
        planningSources.expenses === "movewise_public_estimate"
          ? "recurring expenses"
          : null,
      ].filter((label): label is string => label !== null)
    : [];
  const hasUserEditedDestinationAmounts = planningSources
    ? [
        planningSources.takeHome,
        planningSources.housing,
        planningSources.expenses,
      ].some((source) => source === "user_override")
    : false;
  const financialReadiness = {
    label: "MoveWise estimates + your inputs",
    tone: "benchmark" as const,
    explanation: `${
      publicEstimateLabels.length > 0
        ? `MoveWise used public metro estimates for ${publicEstimateLabels.join(
            ", ",
          )}`
        : "MoveWise used the destination amounts in this scenario"
    }${
      hasUserEditedDestinationAmounts
        ? " and user-edited destination amounts where supplied"
        : ""
    }. ${
      destinationAssumptions.grossIncome === null
        ? "The housing-burden safety check could not run because destination gross income was not provided."
        : "The housing-burden safety check used the destination gross income supplied."
    } This pass focuses on the first rental stage; buying later stays on the checklist.`,
  };
  const financialRows = [
    {
      id: "monthly_cushion",
      label: "Monthly cushion",
      originValue: formatMoney(originFinances.monthlyCushionCents),
      destinationValue: formatMoney(destinationFinances.monthlyCushionCents),
      deltaValue: formatMoney(financialChange.monthlyCushionDeltaCents),
      classification: financialChange.classification,
      emphasis: true,
      ...(deterministicResult
        ? {
            sourceLabel: "MoveWise calculated",
            sourceTone: "benchmark" as const,
          }
        : {}),
    },
    {
      id: "take_home_income",
      label: "Take-home income",
      originValue: formatMoney(originFinances.monthlyTakeHomeIncomeCents),
      destinationValue: formatMoney(
        destinationFinances.monthlyTakeHomeIncomeCents,
      ),
      deltaValue: formatMoney(
        destinationFinances.monthlyTakeHomeIncomeCents -
          originFinances.monthlyTakeHomeIncomeCents,
      ),
      classification: classifyFinancialDelta(
        destinationFinances.monthlyTakeHomeIncomeCents -
          originFinances.monthlyTakeHomeIncomeCents,
        true,
      ),
      emphasis: false,
      ...(deterministicResult
        ? {
            ...sourcePresentation(
              planningSources?.takeHome,
              destinationAssumptions.takeHomeIncome.basis,
            ),
          }
        : {}),
    },
    {
      id: "housing_cost",
      label: planningSources
        ? `Housing · ${
            planningSources.currentHousingTenure === "rent"
              ? "renting"
              : "owning"
          } → ${housingTenureLabel(planningSources.destinationHousingTenure)}`
        : "Housing",
      originValue: formatMoney(originFinances.monthlyHousingCostCents),
      destinationValue: formatMoney(
        destinationFinances.monthlyHousingCostCents,
      ),
      deltaValue: formatMoney(
        destinationFinances.monthlyHousingCostCents -
          originFinances.monthlyHousingCostCents,
      ),
      classification: classifyFinancialDelta(
        destinationFinances.monthlyHousingCostCents -
          originFinances.monthlyHousingCostCents,
        false,
      ),
      emphasis: false,
      ...(deterministicResult
        ? {
            ...sourcePresentation(
              planningSources?.housing,
              destinationAssumptions.housingCost.basis,
            ),
          }
        : {}),
    },
    {
      id: "recurring_expenses",
      label: "Other recurring expenses",
      originValue: formatMoney(originFinances.monthlyRecurringExpensesCents),
      destinationValue: formatMoney(
        destinationFinances.monthlyRecurringExpensesCents,
      ),
      deltaValue: formatMoney(
        destinationFinances.monthlyRecurringExpensesCents -
          originFinances.monthlyRecurringExpensesCents,
      ),
      classification: classifyFinancialDelta(
        destinationFinances.monthlyRecurringExpensesCents -
          originFinances.monthlyRecurringExpensesCents,
        false,
      ),
      emphasis: false,
      ...(deterministicResult
        ? {
            ...sourcePresentation(
              planningSources?.expenses,
              destinationAssumptions.recurringExpensesExcludingHousing.basis,
            ),
          }
        : {}),
    },
    ...(originFinances.monthlyRetainedPropertyNetCents !== 0 ||
    destinationFinances.monthlyRetainedPropertyNetCents !== 0
      ? [
          {
            id: "retained_property_net",
            label: "Retained-property net",
            originValue: formatMoney(
              originFinances.monthlyRetainedPropertyNetCents,
            ),
            destinationValue: formatMoney(
              destinationFinances.monthlyRetainedPropertyNetCents,
            ),
            deltaValue: formatMoney(
              destinationFinances.monthlyRetainedPropertyNetCents -
                originFinances.monthlyRetainedPropertyNetCents,
            ),
            classification: classifyFinancialDelta(
              destinationFinances.monthlyRetainedPropertyNetCents -
                originFinances.monthlyRetainedPropertyNetCents,
              true,
            ),
            emphasis: false,
            ...(deterministicResult
              ? {
                  sourceLabel: `${moveWiseOriginLabel.user} · ${
                    moveWiseEvidenceLabel[
                      destinationAssumptions.retainedPropertyNet.basis ===
                      "confirmed"
                        ? "verified"
                        : "estimated"
                    ]
                  }`,
                  sourceTone: "neutral" as const,
                }
              : {}),
          },
        ]
      : []),
  ];
  const financialReading =
    financialChange.monthlyCushionDeltaCents === 0
      ? "The evaluated finances produce equal monthly cushions, so money does not favor either side."
      : `The evaluated finances classify the monthly cushion change as ${financialChange.classification}.`;
  const priorityInterpretation =
    priority.classification === "similar"
      ? `The ${Math.abs(commuteMetric.deltaValue).toFixed(1)}-minute difference is below the registered materiality threshold. “Similar” is more defensible than declaring a winner.`
      : `The registered transformation classifies this change as ${priority.classification}.`;
  const selection = climateMetric.quality.selectionUncertainty;
  if (selection === undefined) {
    throw new Error(
      "Climate evidence requires a verified station-selection range.",
    );
  }
  const heatPreference =
    climateMetric.transformation.preferredDirection === "lower"
      ? "fewer hot days"
      : "more hot days";
  const climateComparison = compareResearchMetroClimateRatings(
    profile.scenario.origin.slug,
    profile.scenario.destination.slug,
  );
  const originClimate = getResearchMetroClimateRating(
    profile.scenario.origin.slug,
  );
  const destinationClimate = getResearchMetroClimateRating(
    profile.scenario.destination.slug,
  );
  if (
    climatePriority.weight !== 0 &&
    (climateComparison === null ||
      originClimate === null ||
      destinationClimate === null)
  ) {
    throw new Error(
      "An included climate priority requires lightweight ratings for both metros.",
    );
  }
  const climateInterpretation = `For your preference for ${heatPreference}, the destination climate ${climatePriority.classification === "similar" ? "does not create a meaningful advantage" : climatePriority.classification}.`;
  const housingDifference = Math.abs(housingContext.metric.deltaValue);
  const housingReading =
    housingContext.metric.deltaValue === 0
      ? `${profile.scenario.destination.selectedPlace.city}’s 2024 metro median matched ${profile.scenario.origin.selectedPlace.city} at ${formatMoney(housingContext.metric.destinationValue)} in this ACS estimate. That area-level result does not predict what this household would pay.`
      : `${profile.scenario.destination.selectedPlace.city}’s 2024 metro median was ${formatMoney(housingDifference)} ${housingContext.metric.deltaValue > 0 ? "higher" : "lower"} than ${profile.scenario.origin.selectedPlace.city} in this ACS estimate. That area-level difference does not predict what this household would pay.`;
  const confidenceExplanation =
    climatePriority.weight === 0
      ? "Limited because ACS coverage is not promoted as a percentage and the active comparison currently relies on commute evidence alone."
      : "Limited because ACS coverage is not promoted as a percentage and the supporting hot-day benchmark uses mapped reference sites with selection uncertainty.";
  const scoreCalculationEvidenceRefs = [
    ...analysis.score.componentContributions.flatMap((component) =>
      component.metricContributions.flatMap((metric) => metric.evidenceRefs),
    ),
    ...analysis.score.activeBlockers.flatMap((blocker) => blocker.evidenceRefs),
    ...(analysis.insights.decisionChangingAssumption?.evidenceRefs ?? []),
  ]
    .filter(
      (reference, index, references) => references.indexOf(reference) === index,
    )
    .sort();
  const strongestEffect = [
    ...(analysis.insights.strongestImprovement === null
      ? []
      : [{ ...analysis.insights.strongestImprovement, kind: "lift" as const }]),
    ...(analysis.insights.strongestTradeoff === null
      ? []
      : [
          {
            ...analysis.insights.strongestTradeoff,
            kind: "tradeoff" as const,
          },
        ]),
  ].sort(
    (left, right) =>
      Math.abs(right.contribution) - Math.abs(left.contribution) ||
      right.contribution - left.contribution,
  )[0];
  const decisionChangingAssumption =
    analysis.insights.decisionChangingAssumption;

  if (
    housingContext.origin.cbsaCode !== profile.scenario.origin.cbsaCode ||
    housingContext.destination.cbsaCode !==
      profile.scenario.destination.cbsaCode
  ) {
    throw new Error(
      "Housing context must describe the same resolved metros as the Decision Profile.",
    );
  }

  const deterministicAnswers = deterministicContext?.householdAnswers;
  const canonicalOpenChecks =
    planningSources && deterministicAnswers
      ? createMoveWiseOpenCheckLedger({
          scenario: result.scenarioInput,
          householdAnswers: deterministicAnswers,
          destinationAssumptions: planningSources,
          activeBlockerCodes: deterministic?.result.activeBlockerCodes,
        })
      : null;
  const deterministicContributions = deterministicResult
    ? [
        ...(["financial", "commute", "climate"] as const).map((id) => ({
          label: deterministicMetricLabels[id],
          contribution:
            deterministicResult.metricContributions[id].contribution,
        })),
        ...deterministicResult.metricContributions.household.signals.map(
          (signal) => ({
            label:
              householdFactorLabels[
                signal.signalId as keyof typeof householdFactorLabels
              ],
            contribution: signal.contribution,
          }),
        ),
      ].filter(({ contribution }) => contribution !== 0)
    : [];
  const deterministicStrongestEffect = deterministicContributions.sort(
    (left, right) =>
      Math.abs(right.contribution) - Math.abs(left.contribution) ||
      right.contribution - left.contribution,
  )[0];
  const conditionalCount =
    deterministicResult?.conditionalRequirementIds.length ?? 0;
  const unmetCount = deterministicResult?.unmetRequirementIds.length ?? 0;
  const confirmedEssentialCount =
    deterministicAnswers?.factors.filter(
      ({ importance, essentialStatus }) =>
        importance === "essential" && essentialStatus === "confirmed_met",
    ).length ?? 0;
  const essentialSummary = deterministicResult
    ? unmetCount > 0
      ? {
          label: `${unmetCount} essential ${unmetCount === 1 ? "need" : "needs"} not met`,
          tone: "risk" as const,
          active: true,
        }
      : conditionalCount > 0
        ? {
            label: `${conditionalCount} essential ${conditionalCount === 1 ? "need" : "needs"} not confirmed`,
            tone: "caution" as const,
            active: true,
          }
        : confirmedEssentialCount > 0
          ? {
              label: `${confirmedEssentialCount} essential ${confirmedEssentialCount === 1 ? "need" : "needs"} confirmed`,
              tone: "favorable" as const,
              active: true,
            }
          : {
              label: "No essentials marked",
              tone: "neutral" as const,
              active: false,
            }
    : null;
  const deterministicHousehold =
    deterministicResult && deterministicAnswers
      ? {
          modeLabel:
            deterministicAnswers.mode === "family"
              ? "Household or family move"
              : "Individual move",
          summary: essentialSummary,
          essentials: {
            boundary:
              "These are user-supplied household checks. MoveWise does not yet use public childcare prices, school ratings, provider availability, or neighborhood-level access data.",
            factors: deterministicAnswers.factors
              .filter(({ importance, impact }) => {
                if (importance === "essential") return true;
                return importance === "important" && impact !== "unavailable";
              })
              .map((answer) => {
                const contribution =
                  deterministicResult.metricContributions.household.signals.find(
                    ({ signalId }) => signalId === answer.factorId,
                  )?.contribution;
                const status =
                  answer.importance === "essential" &&
                  answer.essentialStatus !== null
                    ? householdEssentialStatusLabels[answer.essentialStatus]
                    : householdImpactLabels[answer.impact];
                return {
                  id: answer.factorId,
                  label:
                    householdFactorLabels[
                      answer.factorId as keyof typeof householdFactorLabels
                    ],
                  status,
                  tone:
                    answer.essentialStatus === "confirmed_unmet" ||
                    answer.impact === "negative" ||
                    answer.impact === "strong_negative"
                      ? ("risk" as const)
                      : answer.essentialStatus === "unconfirmed" ||
                          answer.impact === "neutral" ||
                          answer.impact === "unavailable"
                        ? ("caution" as const)
                        : answer.essentialStatus === "confirmed_met" ||
                            answer.impact === "positive" ||
                            answer.impact === "strong_positive"
                          ? ("favorable" as const)
                          : ("neutral" as const),
                  role:
                    answer.importance === "essential"
                      ? ("Condition" as const)
                      : ("Household signal" as const),
                  contribution: contribution ?? 0,
                };
              }),
          },
          rentalPlan:
            planningSources?.rentGuidance === null ||
            planningSources?.rentGuidance === undefined
              ? null
              : (() => {
                  const rentGuidance = planningSources.rentGuidance;
                  const evaluatedRentDollars = Math.round(
                    destinationFinances.monthlyHousingCostCents / 100,
                  );
                  const ceilingDifferenceDollars =
                    evaluatedRentDollars -
                    planningSources.maximumMonthlyRentDollars;
                  const ceilingReading =
                    ceilingDifferenceDollars <= 0
                      ? `${dollars.format(evaluatedRentDollars)} is ${dollars.format(
                          Math.abs(ceilingDifferenceDollars),
                        )} under your rent ceiling`
                      : `${dollars.format(evaluatedRentDollars)} is ${dollars.format(
                          ceilingDifferenceDollars,
                        )} above your rent ceiling`;
                  const supplySignal = rentalSupplySignal(
                    profile.scenario.destination.selectedPlace.city,
                    profile.scenario.origin.selectedPlace.city,
                    rentGuidance.destination.renterStockShareBps,
                    rentGuidance.renterStockShareDifferenceBps,
                  );
                  return {
                    stageLabel: "First stage: renting",
                    laterPlanLabel:
                      planningSources.destinationHousingTenure ===
                      "rent_then_buy"
                        ? "Buying later stays on the checklist"
                        : "No buying timeline added",
                    bedroomLabel:
                      bedroomLabels[planningSources.requestedBedrooms],
                    originRent: dollars.format(
                      rentGuidance.origin.monthlyGrossRentDollars,
                    ),
                    destinationRent: dollars.format(
                      rentGuidance.destination.monthlyGrossRentDollars,
                    ),
                    rentDifference:
                      rentGuidance.monthlyDifferenceDollars === 0
                        ? "$0 difference"
                        : `${dollars.format(
                            Math.abs(rentGuidance.monthlyDifferenceDollars),
                          )} ${
                            rentGuidance.monthlyDifferenceDollars < 0
                              ? "less"
                              : "more"
                          }`,
                    originStockShare: formatPercent(
                      rentGuidance.origin.renterStockShareBps,
                    ),
                    destinationStockShare: formatPercent(
                      rentGuidance.destination.renterStockShareBps,
                    ),
                    supplySignal,
                    realitySummary: `${ceilingReading}. ${supplySignal} Check current listings before relying on this rent plan.`,
                    ceiling: dollars.format(
                      planningSources.maximumMonthlyRentDollars,
                    ),
                    ceilingStatus:
                      ceilingDifferenceDollars <= 0
                        ? "Within rent ceiling"
                        : planningSources.rentCeilingNonNegotiable
                          ? "Non-negotiable rent ceiling exceeded"
                          : "Above preferred rent ceiling",
                    ceilingDifference:
                      ceilingDifferenceDollars === 0
                        ? "$0 difference"
                        : `${dollars.format(
                            Math.abs(ceilingDifferenceDollars),
                          )} ${
                            ceilingDifferenceDollars < 0 ? "under" : "over"
                          }`,
                    scorePath: `Your ${
                      bedroomLabels[planningSources.requestedBedrooms]
                    } requirement set the destination housing estimate used in the budget. That rent is already included in monthly cushion and the MoveWise Score; no separate household points were added.`,
                    sourceLabel: `${rentGuidance.source.publisher} · ACS tables ${rentGuidance.source.rentTableId} and ${rentGuidance.source.stockTableId}`,
                    observationPeriod: rentGuidance.source.observationPeriod,
                    boundary: rentGuidance.boundary,
                  };
                })(),
        }
      : null;
  const deterministicMissingComponents = deterministicResult
    ? ["Expanded household and ownership fit", "Opportunity context"]
    : null;
  const deterministicBlockerCode = deterministicResult
    ?.activeBlockerCodes[0] as
    | keyof typeof deterministicBlockerCopy
    | undefined;
  const deterministicDecisionChange = deterministic?.decisionChanges[0];
  const profileVerificationSteps = profile.nextSteps
    .filter(({ code }) => code !== "review_decision_evidence")
    .map((step) => nextStepCopy[step.code] ?? step.code.replace(/_/g, " "));
  const deterministicHouseholdSteps = deterministicResult
    ? [
        ...deterministicResult.conditionalRequirementIds.map(
          (factorId) =>
            `Confirm whether ${householdFactorLabels[factorId as keyof typeof householdFactorLabels].toLowerCase()} will work before relying on this result.`,
        ),
        ...deterministicResult.unmetRequirementIds.map(
          (factorId) =>
            `Resolve the unmet essential need: ${householdFactorLabels[factorId as keyof typeof householdFactorLabels].toLowerCase()}.`,
        ),
      ]
    : [];

  const destinationCity = profile.scenario.destination.selectedPlace.city;
  const resultCondition =
    deterministicResult?.condition ?? profile.condition.value;
  const outlook = {
    likely_better_move: { label: "Promising", tone: "favorable" as const },
    worth_closer_look: { label: "Promising", tone: "favorable" as const },
    worth_a_closer_look: { label: "Promising", tone: "favorable" as const },
    promising_if: { label: "Promising if", tone: "caution" as const },
    no_clear_advantage: { label: "Mixed", tone: "caution" as const },
    meaningful_tradeoff: { label: "Mixed", tone: "caution" as const },
    high_financial_risk: { label: "Risky", tone: "risk" as const },
    high_financial_risk_under_assumptions: {
      label: "Risky",
      tone: "risk" as const,
    },
  }[resultCondition];
  const evaluatedRentDollars = Math.round(
    destinationFinances.monthlyHousingCostCents / 100,
  );
  const rentOverCeilingDollars = planningSources?.rentGuidance
    ? Math.max(
        0,
        evaluatedRentDollars - planningSources.maximumMonthlyRentDollars,
      )
    : 0;
  const openCheckIds = new Set<string>();
  if (rentOverCeilingDollars > 0) openCheckIds.add("rent-ceiling");
  if (unmetCount > 0) openCheckIds.add("unmet-essential");
  if (conditionalCount > 0) openCheckIds.add("conditional-essential");
  if (deterministicBlockerCode !== undefined) {
    openCheckIds.add(`blocker:${deterministicBlockerCode}`);
  }
  const openCheckCount = canonicalOpenChecks?.length ?? openCheckIds.size;
  const decisionGate = canonicalOpenChecks
    ? createMoveWiseDecisionGateModel(canonicalOpenChecks)
    : null;
  const legacyReadiness =
    unmetCount > 0
      ? { label: "Must-have blocked", tone: "risk" as const }
      : deterministicBlockerCode !== undefined
        ? { label: "Budget needs work", tone: "risk" as const }
        : openCheckCount === 0
          ? { label: "Ready to compare", tone: "favorable" as const }
          : {
              label: `${openCheckCount === 1 ? "One" : openCheckCount} key ${openCheckCount === 1 ? "check" : "checks"} open`,
              tone: "caution" as const,
            };
  const readiness = decisionGate?.readiness ?? legacyReadiness;
  const improvements: Array<{
    label: string;
    detail: string;
    tone: "favorable";
  }> = [];
  if (financialChange.monthlyCushionDeltaCents > 0) {
    improvements.push({
      label: "Monthly breathing room",
      detail: `Your monthly cushion increases by ${formatMoney(financialChange.monthlyCushionDeltaCents)}.`,
      tone: "favorable",
    });
  }
  if (priority.weight > 0 && priority.classification === "improves") {
    improvements.push({
      label: "Commute",
      detail: `A typical one-way commute is ${Math.abs(commuteMetric.deltaValue).toFixed(1)} minutes shorter.`,
      tone: "favorable",
    });
  }
  if (
    climatePriority.weight > 0 &&
    climatePriority.classification === "improves"
  ) {
    improvements.push({
      label: "Climate fit",
      detail: `The hot-day pattern is a better match for your preference for ${heatPreference}.`,
      tone: "favorable",
    });
  }
  deterministicHousehold?.essentials.factors
    .filter(({ tone }) => tone === "favorable")
    .slice(0, Math.max(0, 3 - improvements.length))
    .forEach(({ label, status }) => {
      improvements.push({
        label,
        detail: `${status} based on the household facts you entered.`,
        tone: "favorable",
      });
    });

  const pressures: Array<{
    label: string;
    detail: string;
    tone: "risk" | "caution";
  }> = [];
  if (rentOverCeilingDollars > 0 && planningSources?.rentGuidance) {
    pressures.push({
      label: "Rent fit",
      detail: `A typical ${bedroomLabels[planningSources.requestedBedrooms]} is ${dollars.format(rentOverCeilingDollars)} above your ${dollars.format(planningSources.maximumMonthlyRentDollars)} ceiling.`,
      tone: planningSources.rentCeilingNonNegotiable ? "risk" : "caution",
    });
  }
  if (financialChange.monthlyCushionDeltaCents < 0) {
    pressures.push({
      label: "Monthly breathing room",
      detail: `Your monthly cushion decreases by ${formatMoney(Math.abs(financialChange.monthlyCushionDeltaCents))}.`,
      tone: "risk",
    });
  }
  const recurringExpenseRow = financialRows.find(
    ({ id }) => id === "recurring_expenses",
  );
  if (recurringExpenseRow?.classification === "worsens") {
    pressures.push({
      label: "Everyday expenses",
      detail: `Recurring expenses increase by ${recurringExpenseRow.deltaValue} a month.`,
      tone: "caution",
    });
  }
  if (priority.weight > 0 && priority.classification === "worsens") {
    pressures.push({
      label: "Commute",
      detail: `A typical one-way commute is ${Math.abs(commuteMetric.deltaValue).toFixed(1)} minutes longer.`,
      tone: "caution",
    });
  }

  const checks: Array<{
    label: string;
    detail: string;
    tone: "risk" | "caution" | "neutral";
  }> = [];
  if (rentOverCeilingDollars > 0 && planningSources) {
    checks.push({
      label: "Find a home within budget",
      detail: `Confirm that suitable rentals actually exist at or below ${dollars.format(planningSources.maximumMonthlyRentDollars)}.`,
      tone: planningSources.rentCeilingNonNegotiable ? "risk" : "caution",
    });
  }
  deterministicHousehold?.essentials.factors
    .filter(({ tone }) => tone === "risk" || tone === "caution")
    .slice(0, Math.max(0, 3 - checks.length))
    .forEach(({ label, status, tone }) => {
      checks.push({
        label,
        detail: `${status}. Confirm this before relying on the brief.`,
        tone: tone === "risk" ? "risk" : "caution",
      });
    });
  if (checks.length === 0) {
    checks.push({
      label: "Validate the plan",
      detail:
        "Confirm the destination income, rent, and household needs before committing to the move.",
      tone: "neutral",
    });
  }
  if (improvements.length === 0) {
    improvements.push({
      label: "No clear gain yet",
      detail:
        "The evaluated factors do not establish a material improvement yet.",
      tone: "favorable",
    });
  }
  if (pressures.length === 0) {
    pressures.push({
      label: "No major pressure found",
      detail:
        "No evaluated factor creates a material downside at these inputs.",
      tone: "caution",
    });
  }
  const judgment =
    unmetCount > 0
      ? `${destinationCity} has upside, but a must-have need is not met.`
      : outlook.label === "Risky"
        ? `${destinationCity} looks financially risky at these numbers.`
        : rentOverCeilingDollars > 0 && outlook.label === "Promising"
          ? `${destinationCity} looks promising, but rent fit needs checking.`
          : conditionalCount > 0
            ? `${destinationCity} looks promising if your family checks work out.`
            : outlook.label === "Promising"
              ? `${destinationCity} looks promising for this move.`
              : `${destinationCity} has tradeoffs worth weighing.`;
  const canonicalChecks = canonicalOpenChecks?.map((check) => ({
    label: check.label,
    detail: check.action,
    tone:
      check.severity === "blocker" ? ("risk" as const) : ("caution" as const),
  }));
  const brief = {
    judgment,
    outlook,
    readiness,
    evidenceConfidence: decisionGate?.evidenceConfidence ?? {
      level: profile.confidence.level,
      label: confidenceLabels[profile.confidence.level],
      tone: "caution" as const,
      explanation: confidenceExplanation,
    },
    decisionGate,
    improvements: improvements.slice(0, 3),
    pressures: pressures.slice(0, 3),
    checks: canonicalChecks ?? checks.slice(0, 3),
    openChecks: canonicalOpenChecks ?? [],
  };

  return {
    releaseStatus: result.releaseStatus,
    route: {
      originCity: profile.scenario.origin.selectedPlace.city,
      destinationCity: profile.scenario.destination.selectedPlace.city,
      originMetro: profile.scenario.origin.label,
      destinationMetro: profile.scenario.destination.label,
    },
    brief,
    condition: deterministicResult
      ? deterministicConditionCopy[deterministicResult.condition]
      : conditionCopy[profile.condition.value],
    decisionMeta: {
      routeLabel: `${profile.scenario.origin.selectedPlace.city} to ${profile.scenario.destination.selectedPlace.city}`,
      monthlyDifference: formatMoney(financialChange.monthlyCushionDeltaCents),
      financialDirection: financialChange.classification,
      confidenceLabel: confidenceLabels[profile.confidence.level],
      stabilityLabel: stabilityLabels[profile.stability.level],
      ...(deterministicResult && essentialSummary
        ? {
            summarySignals: [
              {
                label: "Household essentials",
                value: essentialSummary.label,
                tone: essentialSummary.tone,
              },
              {
                label: "Decision rule",
                value: "Deterministic 0.2.0",
                tone: "benchmark" as const,
              },
            ],
          }
        : {}),
    },
    score: {
      value: deterministicResult?.value ?? analysis.score.value,
      outOf: 100,
      bandLabel:
        scoreBandLabels[deterministicResult?.band ?? analysis.score.band],
      tone: scoreBandTones[deterministicResult?.band ?? analysis.score.band],
      baselineMeaning: `50 means roughly even with ${profile.scenario.origin.selectedPlace.city} for your current inputs.`,
      boundary:
        "Not a probability, universal city grade, city ranking, or instruction to move.",
      range:
        (deterministicResult?.range ?? analysis.score.range) === null
          ? null
          : {
              label: `${(deterministicResult?.range ?? analysis.score.range)!.min}–${(deterministicResult?.range ?? analysis.score.range)!.max}`,
              explanation:
                "This range reruns the low and high financial estimates so you can see whether the answer is fragile.",
            },
      exactFinance: {
        label: "Monthly cushion difference",
        value: formatMoney(financialChange.monthlyCushionDeltaCents),
        direction: financialChange.classification,
      },
      evidenceConfidence: {
        label: confidenceLabels[profile.confidence.level],
        explanation: confidenceExplanation,
      },
      activeBlocker: deterministicResult
        ? deterministicBlockerCode === undefined
          ? null
          : {
              ...deterministicBlockerCopy[deterministicBlockerCode],
              scoreCap: deterministicResult.appliedCap ?? 59,
              evidenceRefs: [] as string[],
              inputPaths: [] as string[],
            }
        : analysis.insights.activeBlocker === null
          ? null
          : {
              ...scoreBlockerCopy[analysis.insights.activeBlocker.code],
              scoreCap: analysis.insights.activeBlocker.scoreCap,
              evidenceRefs: [...analysis.insights.activeBlocker.evidenceRefs],
              inputPaths: [...analysis.insights.activeBlocker.inputPaths],
            },
      strongestImprovement:
        analysis.insights.strongestImprovement === null
          ? null
          : {
              label:
                scoreMetricLabels[
                  analysis.insights.strongestImprovement.metricId
                ],
              contribution: analysis.insights.strongestImprovement.contribution,
              evidenceRefs: [
                ...analysis.insights.strongestImprovement.evidenceRefs,
              ],
            },
      strongestTradeoff:
        analysis.insights.strongestTradeoff === null
          ? null
          : {
              label:
                scoreMetricLabels[analysis.insights.strongestTradeoff.metricId],
              contribution: analysis.insights.strongestTradeoff.contribution,
              evidenceRefs: [
                ...analysis.insights.strongestTradeoff.evidenceRefs,
              ],
            },
      strongestEffect:
        (deterministicResult
          ? deterministicStrongestEffect
          : strongestEffect) === undefined
          ? null
          : {
              label: deterministicResult
                ? deterministicStrongestEffect!.label
                : scoreMetricLabels[strongestEffect!.metricId],
              contribution: deterministicResult
                ? deterministicStrongestEffect!.contribution
                : strongestEffect!.contribution,
              kind: (
                deterministicResult
                  ? deterministicStrongestEffect!.contribution > 0
                  : strongestEffect!.kind === "lift"
              )
                ? ("lift" as const)
                : ("tradeoff" as const),
            },
      decisionChangingAssumption: deterministicResult
        ? deterministicDecisionChange === undefined
          ? null
          : {
              label:
                scoreThresholdLabels[deterministicDecisionChange.inputPath] ??
                deterministicDecisionChange.inputPath,
              currentValue: formatMoney(
                deterministicDecisionChange.currentValueCents,
              ),
              threshold: formatMoney(
                deterministicDecisionChange.thresholdCents,
              ),
              operator:
                deterministicDecisionChange.operator === "at_or_above"
                  ? "at least"
                  : "at or below",
              distance: formatMoney(deterministicDecisionChange.distanceCents),
              changesConditionTo:
                deterministicConditionCopy[
                  deterministicDecisionChange.changesConditionTo
                ].label,
              withinPlausibleRange:
                deterministicDecisionChange.withinPlausibleRange,
              evidenceRefs: [...deterministicDecisionChange.evidenceRefs],
            }
        : decisionChangingAssumption === null
          ? null
          : {
              label:
                scoreThresholdLabels[decisionChangingAssumption.inputPath] ??
                decisionChangingAssumption.inputPath,
              currentValue: formatMoney(
                decisionChangingAssumption.currentValueCents,
              ),
              threshold: formatMoney(decisionChangingAssumption.thresholdCents),
              operator:
                decisionChangingAssumption.operator === "at_or_above"
                  ? "at least"
                  : "at or below",
              distance: formatMoney(decisionChangingAssumption.distanceCents),
              changesConditionTo:
                conditionCopy[decisionChangingAssumption.changesConditionTo]
                  .label,
              withinPlausibleRange:
                decisionChangingAssumption.withinPlausibleRange,
              evidenceRefs: [...decisionChangingAssumption.evidenceRefs],
            },
      missingComponents:
        deterministicMissingComponents ??
        analysis.insights.missingComponents.map(
          (componentId) => scoreComponentLabels[componentId],
        ),
      calculationEvidenceRefs: deterministic
        ? [
            `input:${deterministic.reproducibility.inputFingerprintSha256}`,
            `household:${deterministic.reproducibility.householdAnswerSha256}`,
            `benchmark:${deterministic.reproducibility.benchmarkSnapshotSha256}`,
            ...(deterministicDecisionChange?.evidenceRefs ?? []),
          ]
        : scoreCalculationEvidenceRefs,
      scoreVersion: deterministic?.ruleVersion ?? analysis.score.scoreVersion,
      mode: deterministicResult
        ? ("deterministic" as const)
        : ("legacy" as const),
      essentialSummary,
      readiness: financialReadiness,
      cautionCodes: deterministicResult
        ? [...deterministicResult.cautionCodes]
        : [],
    },
    household: deterministicHousehold,
    confidence: {
      level: profile.confidence.level,
      explanation: confidenceExplanation,
    },
    stability: {
      level: profile.stability.level,
      explanation:
        profile.stability.level === "assumption_sensitive"
          ? "At least one exact condition-changing threshold falls inside the declared estimate ranges."
          : profile.stability.level === "stable"
            ? "No condition-changing threshold falls inside the declared estimate ranges."
            : "Plausible ranges are required before stability can be evaluated.",
    },
    finances: {
      origin: {
        takeHome: formatMoney(
          profile.financialPosition.origin.monthlyTakeHomeIncomeCents,
        ),
        gross:
          profile.financialPosition.origin.monthlyGrossIncomeCents === null
            ? "Not available"
            : formatMoney(
                profile.financialPosition.origin.monthlyGrossIncomeCents,
              ),
        housing: formatMoney(
          profile.financialPosition.origin.monthlyHousingCostCents,
        ),
        recurring: formatMoney(
          profile.financialPosition.origin.monthlyRecurringExpensesCents,
        ),
        retainedPropertyNet: formatMoney(
          profile.financialPosition.origin.monthlyRetainedPropertyNetCents,
        ),
        cushion: formatMoney(
          profile.financialPosition.origin.monthlyCushionCents,
        ),
        burden: formatPercent(
          profile.financialPosition.origin.housingBurdenBps,
        ),
      },
      destination: {
        takeHome: formatMoney(
          profile.financialPosition.destination.monthlyTakeHomeIncomeCents,
        ),
        gross:
          profile.financialPosition.destination.monthlyGrossIncomeCents === null
            ? "Not available"
            : formatMoney(
                profile.financialPosition.destination.monthlyGrossIncomeCents,
              ),
        housing: formatMoney(
          profile.financialPosition.destination.monthlyHousingCostCents,
        ),
        recurring: formatMoney(
          profile.financialPosition.destination.monthlyRecurringExpensesCents,
        ),
        retainedPropertyNet: formatMoney(
          profile.financialPosition.destination.monthlyRetainedPropertyNetCents,
        ),
        cushion: formatMoney(
          profile.financialPosition.destination.monthlyCushionCents,
        ),
        burden: formatPercent(
          profile.financialPosition.destination.housingBurdenBps,
        ),
      },
      cushionDelta: formatMoney(financialChange.monthlyCushionDeltaCents),
      classification: financialChange.classification,
      reading: financialReading,
    },
    comparison: {
      financialRows,
    },
    incomeLaborContext: incomeGuidance
      ? {
          role: incomeGuidance.role,
          originMedianHouseholdIncome: dollars.format(
            incomeGuidance.origin.annualMedianHouseholdIncomeDollars,
          ),
          destinationMedianHouseholdIncome: dollars.format(
            incomeGuidance.destination.annualMedianHouseholdIncomeDollars,
          ),
          destinationToOriginRatio: `${(
            incomeGuidance.destinationToOriginRatioBps / 100
          ).toFixed(1)}%`,
          reading: incomeLaborReading(
            profile.scenario.destination.selectedPlace.city,
            profile.scenario.origin.selectedPlace.city,
            incomeGuidance.direction,
          ),
          laborMarketBoundary: incomeGuidance.laborMarketBoundary,
          sourceLabel: `${incomeGuidance.source.publisher} · ACS table ${incomeGuidance.source.tableId}`,
        }
      : null,
    familyCostContext: familyCostGuidance
      ? {
          role: familyCostGuidance.role,
          originMonthlyExpenses: dollars.format(
            familyCostGuidance.originMonthlyExpensesDollars,
          ),
          destinationMonthlyExpenses: dollars.format(
            familyCostGuidance.destinationMonthlyExpensesDollars,
          ),
          difference:
            familyCostGuidance.monthlyDifferenceDollars === 0
              ? "$0 difference"
              : `${dollars.format(
                  Math.abs(familyCostGuidance.monthlyDifferenceDollars),
                )} ${
                  familyCostGuidance.monthlyDifferenceDollars < 0
                    ? "lower"
                    : "higher"
                }`,
          reading: familyCostGuidance.summary,
          childcareBoundary: familyCostGuidance.childcareBoundary,
          sourceLabel: `${familyCostGuidance.source.publisher} · ${familyCostGuidance.source.tableId} line ${familyCostGuidance.source.lineCode}`,
        }
      : null,
    climateRiskContext: climateRiskGuidance
      ? {
          role: climateRiskGuidance.role,
          originAnchorCounty: climateRiskGuidance.origin.anchorCounty,
          destinationAnchorCounty: climateRiskGuidance.destination.anchorCounty,
          originOverallRisk: climateRiskGuidance.origin.overallRiskRating,
          destinationOverallRisk:
            climateRiskGuidance.destination.overallRiskRating,
          destinationExpectedAnnualLoss:
            climateRiskGuidance.destination.expectedAnnualLossRating,
          destinationSocialVulnerability:
            climateRiskGuidance.destination.socialVulnerabilityRating,
          destinationCommunityResilience:
            climateRiskGuidance.destination.communityResilienceRating,
          prominentHazards: climateRiskGuidance.destinationProminentHazards.map(
            ({ label, rating }) => `${label}: ${rating}`,
          ),
          reading: climateRiskReading(
            profile.scenario.destination.selectedPlace.city,
            profile.scenario.origin.selectedPlace.city,
            climateRiskGuidance.riskDirection,
          ),
          boundary: climateRiskGuidance.boundary,
          sourceLabel: `${climateRiskGuidance.source.publisher} · ${climateRiskGuidance.source.dataset} ${climateRiskGuidance.source.datasetVersion}`,
        }
      : null,
    ownershipContext: ownershipGuidance
      ? {
          role: ownershipGuidance.role,
          originOwnerValue: dollars.format(
            ownershipGuidance.origin.medianOwnerOccupiedValueDollars,
          ),
          destinationOwnerValue: dollars.format(
            ownershipGuidance.destination.medianOwnerOccupiedValueDollars,
          ),
          ownerValueDifference:
            ownershipGuidance.ownerValueDifferenceDollars === 0
              ? "$0 difference"
              : `${dollars.format(
                  Math.abs(ownershipGuidance.ownerValueDifferenceDollars),
                )} ${
                  ownershipGuidance.ownerValueDifferenceDollars < 0
                    ? "lower"
                    : "higher"
                }`,
          originMonthlyOwnerCostsWithMortgage: dollars.format(
            ownershipGuidance.origin
              .monthlySelectedOwnerCostsWithMortgageDollars,
          ),
          destinationMonthlyOwnerCostsWithMortgage: dollars.format(
            ownershipGuidance.destination
              .monthlySelectedOwnerCostsWithMortgageDollars,
          ),
          monthlyOwnerCostDifference:
            ownershipGuidance.monthlyOwnerCostWithMortgageDifferenceDollars ===
            0
              ? "$0 difference"
              : `${dollars.format(
                  Math.abs(
                    ownershipGuidance.monthlyOwnerCostWithMortgageDifferenceDollars,
                  ),
                )} ${
                  ownershipGuidance.monthlyOwnerCostWithMortgageDifferenceDollars <
                  0
                    ? "lower"
                    : "higher"
                }`,
          reading: ownershipReading(
            profile.scenario.destination.selectedPlace.city,
            profile.scenario.origin.selectedPlace.city,
            ownershipGuidance.ownerValueDirection,
            ownershipGuidance.ownerCostDirection,
          ),
          boundary: ownershipGuidance.boundary,
          sourceLabel: `${ownershipGuidance.source.publisher} · ACS tables ${ownershipGuidance.source.ownerValueTableId}/${ownershipGuidance.source.selectedOwnerCostsTableId}`,
        }
      : null,
    housingContext: {
      decisionUse: housingContext.decisionUse,
      boundary: "Area context—not your budget",
      originValue: formatMoney(housingContext.metric.originValue),
      destinationValue: formatMoney(housingContext.metric.destinationValue),
      originMoe: formatMoney(housingContext.metric.marginOfError90.origin),
      destinationMoe: formatMoney(
        housingContext.metric.marginOfError90.destination,
      ),
      delta: formatMoney(housingContext.metric.deltaValue),
      reading: housingReading,
      caveats: [...housingContext.caveats],
      evidence: {
        definition: housingContext.metric.definition,
        dataset: housingContext.metric.source.dataset,
        publisher: housingContext.metric.source.publisher,
        tableId: housingContext.metric.source.tableId.toUpperCase(),
        sourceUrl: housingContext.metric.source.sourceUrl,
        observationPeriod: housingContext.metric.observationPeriod,
        releasedOn: housingContext.metric.releasedOn,
        verifiedOn: housingContext.metric.verifiedOn,
        snapshotSha256: housingContext.snapshot.sha256,
        rawSnapshotSha256: housingContext.snapshot.rawSnapshot.sha256,
      },
    },
    priority:
      priority.weight === 0
        ? null
        : {
            label: "Typical one-way commute",
            originValue: `${commuteMetric.originValue.toFixed(1)} min`,
            destinationValue: `${commuteMetric.destinationValue.toFixed(1)} min`,
            originMoe: commuteMetric.quality.marginOfError?.origin ?? null,
            destinationMoe:
              commuteMetric.quality.marginOfError?.destination ?? null,
            classification: priority.classification,
            weight: priority.weight,
            quality: commuteMetric.quality.grade.value,
            interpretation: priorityInterpretation,
            mobilityContext: mobilityGuidance
              ? {
                  role: "Context only",
                  originCommuteAwayShare: formatPercent(
                    mobilityGuidance.origin.commuteAwayShareBps,
                  ),
                  destinationCommuteAwayShare: formatPercent(
                    mobilityGuidance.destination.commuteAwayShareBps,
                  ),
                  reading: mobilityContextReading(
                    profile.scenario.destination.selectedPlace.city,
                    profile.scenario.origin.selectedPlace.city,
                    formatPercent(
                      mobilityGuidance.destination.commuteAwayShareBps,
                    ),
                    mobilityGuidance.commuteAwayShareDifferenceBps,
                  ),
                  sourceLabel: `${mobilityGuidance.source.publisher} · ACS tables ${mobilityGuidance.source.commuteTableId} and ${mobilityGuidance.source.workerModeTableId}`,
                  boundary: mobilityGuidance.boundary,
                }
              : null,
          },
    climate:
      climatePriority.weight === 0
        ? null
        : {
            label: "Climate",
            preference: heatPreference,
            originSummary: originClimate?.summary ?? "",
            destinationSummary: destinationClimate?.summary ?? "",
            traitChanges:
              climateComparison?.traits.map(({ description }) => description) ??
              [],
            classification: climatePriority.classification,
            weight: climatePriority.weight,
            interpretation: climateInterpretation,
          },
    findings: {
      drivers: profile.findings.drivers.map(findingText),
      tradeoffs: profile.findings.tradeoffs.map(findingText),
      blockers: profile.findings.blockers.map(findingText),
      assumptions: deterministicResult
        ? []
        : profile.findings.assumptions.map(findingText),
    },
    nextSteps: deterministicResult
      ? deterministicHouseholdSteps
      : [nextStepCopy.review_decision_evidence, ...profileVerificationSteps],
    evidence: {
      definition: commuteMetric.definition,
      dataset: commuteMetric.source.dataset,
      publisher: commuteMetric.source.publisher,
      sourceUrl: commuteMetric.source.sourceUrl,
      termsUrl: commuteMetric.source.termsUrl,
      observationPeriod: commuteMetric.observationPeriod,
      releasedOn: commuteMetric.releasedOn,
      verifiedOn: commuteMetric.verifiedOn,
      originGeography: commuteMetric.geographies.origin.label,
      destinationGeography: commuteMetric.geographies.destination.label,
      originMoe: commuteMetric.quality.marginOfError?.origin ?? null,
      destinationMoe: commuteMetric.quality.marginOfError?.destination ?? null,
      transformationId: commuteMetric.transformation.id,
      transformationVersion: commuteMetric.transformation.version,
      snapshotVersion: profile.scenario.benchmarkSnapshot.version,
      snapshotSha256: profile.scenario.benchmarkSnapshot.sha256,
      rawSnapshotSha256: profile.scenario.benchmarkSnapshot.rawSnapshot.sha256,
      delineationVersion: profile.scenario.benchmarkSnapshot.delineationVersion,
    },
    climateEvidence:
      climatePriority.weight === 0
        ? null
        : {
            definition: climateMetric.definition,
            dataset: climateMetric.source.dataset,
            publisher: climateMetric.source.publisher,
            sourceUrl: climateMetric.source.sourceUrl,
            termsUrl: climateMetric.source.termsUrl,
            observationPeriod: climateMetric.observationPeriod,
            releasedOn: climateMetric.releasedOn,
            verifiedOn: climateMetric.verifiedOn,
            originGeography: climateMetric.geographies.origin.label,
            destinationGeography: climateMetric.geographies.destination.label,
            selectionRationale: selection.rationale,
            transformationId: climateMetric.transformation.id,
            transformationVersion: climateMetric.transformation.version,
          },
  };
};

const whatIfControlDefinitions = [
  {
    id: "takeHomeIncomeCents",
    label: "Destination take-home income",
    inputPath: "finances.destination.takeHomeIncome.monthlyCents",
    assumption: (scenario: WhatIfScenario) =>
      scenario.finances.destination.takeHomeIncome,
  },
  {
    id: "housingCostCents",
    label: "Destination housing",
    inputPath: "finances.destination.housingCost.monthlyCents",
    assumption: (scenario: WhatIfScenario) =>
      scenario.finances.destination.housingCost,
  },
  {
    id: "recurringExpensesCents",
    label: "Other recurring expenses",
    inputPath:
      "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
    assumption: (scenario: WhatIfScenario) =>
      scenario.finances.destination.recurringExpensesExcludingHousing,
  },
  {
    id: "retainedPropertyNetCents",
    label: "Retained-property monthly net",
    inputPath: "finances.destination.retainedPropertyNet.monthlyCents",
    assumption: (scenario: WhatIfScenario) =>
      scenario.finances.destination.retainedPropertyNet,
  },
] as const;

export const createVerifiedWhatIfViewModel = (
  baseline: VerifiedResearchEvaluationResult,
  values: ResearchWhatIfValues = whatIfValuesFromScenario(
    baseline.scenarioInput,
  ),
) => {
  const baselineValues = whatIfValuesFromScenario(baseline.scenarioInput);
  const current = evaluateResearchMoveDecision(
    scenarioWithWhatIfValues(baseline.scenarioInput, values),
    baseline.benchmarkComparison,
  );
  const profile = current.decisionProfile;
  const thresholdLabels: Record<string, string> = {
    "finances.destination.takeHomeIncome.monthlyCents": "Take-home income",
    "finances.destination.housingCost.monthlyCents": "Housing",
    "finances.destination.recurringExpensesExcludingHousing.monthlyCents":
      "Recurring expenses",
    "finances.destination.retainedPropertyNet.monthlyCents":
      "Retained-property net",
  };
  const thresholdOrder: Record<string, number> = {
    "finances.destination.takeHomeIncome.monthlyCents": 0,
    "finances.destination.housingCost.monthlyCents": 1,
    "finances.destination.recurringExpensesExcludingHousing.monthlyCents": 2,
    "finances.destination.retainedPropertyNet.monthlyCents": 3,
  };
  const editableDefinitions = whatIfControlDefinitions.filter(
    (control) =>
      control.assumption(baseline.scenarioInput).basis !== "confirmed",
  );
  const editableInputPaths = new Set<string>(
    editableDefinitions.map((control) => control.inputPath),
  );

  return {
    values,
    baselineValues,
    changed: JSON.stringify(values) !== JSON.stringify(baselineValues),
    controls: editableDefinitions.map((control) => ({
      id: control.id,
      label: control.label,
      valueCents: values[control.id],
      valueDollars: String(values[control.id] / 100),
      value: formatMoney(values[control.id]),
      baseline: formatMoney(baselineValues[control.id]),
    })),
    result: {
      condition: conditionCopy[profile.condition.value],
      monthlyCushion: formatMoney(
        profile.financialPosition.destination.monthlyCushionCents,
      ),
      cushionDelta: formatMoney(
        profile.financialPosition.change.monthlyCushionDeltaCents,
      ),
      classification: profile.financialPosition.change.classification,
    },
    baselineCondition: conditionCopy[baseline.decisionProfile.condition.value],
    thresholds: baseline.decisionProfile.breakpoints
      .filter((breakpoint) => breakpoint.kind === "money")
      .filter(
        (breakpoint) =>
          editableInputPaths.has(breakpoint.inputPath) &&
          breakpoint.changesConditionTo === "worth_a_closer_look" &&
          breakpoint.changesConditionTo !==
            baseline.decisionProfile.condition.value,
      )
      .sort(
        (left, right) =>
          (thresholdOrder[left.inputPath] ?? Number.MAX_SAFE_INTEGER) -
          (thresholdOrder[right.inputPath] ?? Number.MAX_SAFE_INTEGER),
      )
      .map((breakpoint) => ({
        id: breakpoint.id,
        label: thresholdLabels[breakpoint.inputPath] ?? breakpoint.inputPath,
        operator:
          breakpoint.operator === "at_or_above" ? "at least" : "at or below",
        threshold: formatMoney(breakpoint.thresholdCents),
        changesConditionTo: conditionCopy[breakpoint.changesConditionTo].label,
      })),
  };
};

export const createResearchWhatIfViewModel = (
  values: ResearchWhatIfValues = baselineWhatIfValues,
) => createVerifiedWhatIfViewModel(evaluateResearchScenario(), values);

export type ResearchResultsViewModel = ReturnType<
  typeof createResearchResultsViewModel
>;
