import {
  compareResearchMetroClimateRatings,
  getResearchMetroClimateRating,
  getResearchMetroHousingContext,
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
    label: "High financial risk under these assumptions",
    summary:
      "At least one financial condition needs to be resolved before proceeding.",
  },
} as const;

const deterministicConditionCopy = {
  likely_better_move: {
    label: "Likely better under these assumptions",
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
      "The current assumptions do not show a clear enough advantage, or a caution or unmet household need is holding the result back.",
  },
  high_financial_risk: {
    label: "High financial risk under these assumptions",
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

const nextStepCopy: Record<string, string> = {
  review_decision_evidence:
    "Add any household factors that could materially change day-to-day life.",
  resolve_negative_target_cushion:
    "Change income, housing, or recurring-expense assumptions until the destination budget is viable.",
  verify_target_housing_burden:
    "Verify target housing and gross-income assumptions before treating the move as viable.",
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
  strong_negative: "Much harder",
  negative: "Somewhat harder",
  neutral: "About the same",
  positive: "Somewhat better",
  strong_positive: "Much better",
  unavailable: "Not sure yet",
  excluded: "Excluded",
} as const;

type DeterministicResultsContext = Readonly<{
  analysis: MoveWiseDeterministicAnalysis;
  householdAnswers: VerifiedMoveWiseHouseholdAnswers;
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
  const destinationAssumptions = result.scenarioInput.finances.destination;
  const cushionInputs = [
    destinationAssumptions.takeHomeIncome,
    destinationAssumptions.housingCost,
    destinationAssumptions.recurringExpensesExcludingHousing,
    destinationAssumptions.retainedPropertyNet,
  ];
  const needsConfirmation = (basis: string) => basis !== "confirmed";
  const cushionNeedsConfirmation = cushionInputs.some(({ basis }) =>
    needsConfirmation(basis),
  );
  const destinationEstimateCount = [
    ...cushionInputs,
    ...(destinationAssumptions.grossIncome === null
      ? []
      : [destinationAssumptions.grossIncome]),
  ].filter(({ basis }) => needsConfirmation(basis)).length;
  const financialReadiness =
    destinationAssumptions.grossIncome === null
      ? {
          label: "Preliminary",
          tone: "caution" as const,
          explanation:
            "The housing-burden safety check could not run because destination gross income was not provided. The score is shown, but treat it as preliminary.",
        }
      : destinationEstimateCount > 0
        ? {
            label: "Needs confirmation",
            tone: "caution" as const,
            explanation: `${destinationEstimateCount} destination ${destinationEstimateCount === 1 ? "amount is" : "amounts are"} still estimates. MoveWise calculated the result from them, but did not independently verify them.`,
          }
        : {
            label: "Inputs confirmed",
            tone: "favorable" as const,
            explanation:
              "You marked every destination money input as confirmed. The result still inherits the limits of the available city evidence.",
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
            needsConfirmation: cushionNeedsConfirmation,
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
            sourceLabel: "You told us",
            sourceTone: "neutral" as const,
            needsConfirmation: needsConfirmation(
              destinationAssumptions.takeHomeIncome.basis,
            ),
          }
        : {}),
    },
    {
      id: "housing_cost",
      label: "Housing",
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
            sourceLabel: "You told us",
            sourceTone: "neutral" as const,
            needsConfirmation: needsConfirmation(
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
            sourceLabel: "You told us",
            sourceTone: "neutral" as const,
            needsConfirmation: needsConfirmation(
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
                  sourceLabel: "You told us",
                  sourceTone: "neutral" as const,
                  needsConfirmation: needsConfirmation(
                    destinationAssumptions.retainedPropertyNet.basis,
                  ),
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
          factors: deterministicAnswers.factors.map((answer) => {
            const signal =
              deterministicResult.metricContributions.household.signals.find(
                ({ signalId }) => signalId === answer.factorId,
              );
            const statusLabel =
              answer.importance === "not_applicable"
                ? "Not part of my decision"
                : answer.importance === "important"
                  ? "Important"
                  : answer.essentialStatus === "confirmed_met"
                    ? "Essential — confirmed"
                    : answer.essentialStatus === "unconfirmed"
                      ? "Essential — not confirmed"
                      : "Essential — not met";
            const tone =
              answer.importance === "not_applicable"
                ? ("unavailable" as const)
                : answer.essentialStatus === "confirmed_unmet"
                  ? ("risk" as const)
                  : answer.essentialStatus === "unconfirmed" ||
                      answer.impact === "unavailable"
                    ? ("caution" as const)
                    : (signal?.contribution ?? 0) > 0
                      ? ("favorable" as const)
                      : (signal?.contribution ?? 0) < 0
                        ? ("risk" as const)
                        : ("neutral" as const);
            return {
              id: answer.factorId,
              label: householdFactorLabels[answer.factorId],
              statusLabel,
              impactLabel: householdImpactLabels[answer.impact],
              contribution: signal?.contribution ?? 0,
              tone,
            };
          }),
        }
      : null;
  const deterministicMissingComponents = deterministicResult
    ? [
        ...(deterministicResult.metricContributions.household.status ===
          "excluded" ||
        deterministicResult.metricContributions.household.status ===
          "unavailable"
          ? ["Household fit"]
          : []),
        "Opportunity context",
      ]
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

  return {
    releaseStatus: result.releaseStatus,
    route: {
      originCity: profile.scenario.origin.selectedPlace.city,
      destinationCity: profile.scenario.destination.selectedPlace.city,
      originMetro: profile.scenario.origin.label,
      destinationMetro: profile.scenario.destination.label,
    },
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
                "This estimate sensitivity range reruns the accepted low and high financial estimates. It is not a confidence interval.",
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
      assumptions: profile.findings.assumptions.map(findingText),
    },
    nextSteps: deterministicResult
      ? [...deterministicHouseholdSteps, ...profileVerificationSteps]
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
