import {
  loadLosAngelesToSeattleCommuteBenchmark,
  losAngelesToSeattleBalancedResearchScenario,
} from "@workspace/benchmark-data";
import type { Finding, MetricEvidence } from "@workspace/contracts";
import { evaluateResearchMoveDecision } from "@workspace/decision-core";

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const formatMoney = (cents: number) => dollars.format(cents / 100);
const formatPercent = (basisPoints: number | null) =>
  basisPoints === null ? "Not available" : `${(basisPoints / 100).toFixed(1)}%`;

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

const findingCopy: Record<string, string> = {
  financial_cushion_improves: "Monthly financial cushion improves materially.",
  financial_cushion_worsens: "Monthly financial cushion worsens materially.",
  commute_time_improves: "Typical commute time improves materially.",
  commute_time_worsens: "Typical commute time worsens materially.",
  negative_target_cushion:
    "The destination budget produces a negative monthly cushion.",
  target_housing_burden_at_or_above_50_percent:
    "Destination housing is at least half of gross income.",
};

const findingText = (finding: Finding) =>
  findingCopy[finding.code] ?? finding.code.replaceAll("_", " ");

const nextStepCopy: Record<string, string> = {
  review_decision_evidence:
    "Review the source evidence and add the missing factors that matter to this household.",
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

export const createResearchResultsViewModel = () => {
  const result = evaluateResearchMoveDecision(
    losAngelesToSeattleBalancedResearchScenario,
    loadLosAngelesToSeattleCommuteBenchmark(),
  );
  const profile = result.decisionProfile;
  const metric = profile.evidence.find(
    (entry): entry is MetricEvidence => entry.kind === "benchmark_metric",
  );
  const priority = profile.priorityChanges[0];
  if (
    metric === undefined ||
    priority === undefined ||
    metric.originValue === null ||
    metric.destinationValue === null ||
    metric.deltaValue === null
  ) {
    throw new Error(
      "Research preview requires one promoted benchmark priority.",
    );
  }

  const financialChange = profile.financialPosition.change;
  const financialReading =
    financialChange.monthlyCushionDeltaCents === 0
      ? "The fixed scenario uses equal finances in both metros, so money does not favor either side."
      : `The fixed scenario classifies the monthly cushion change as ${financialChange.classification}.`;
  const priorityInterpretation =
    priority.classification === "similar"
      ? `The ${Math.abs(metric.deltaValue).toFixed(1)}-minute difference is below the registered materiality threshold. “Similar” is more defensible than declaring a winner.`
      : `The registered transformation classifies this change as ${priority.classification}.`;

  return {
    releaseStatus: result.releaseStatus,
    route: {
      originCity: profile.scenario.origin.selectedPlace.city,
      destinationCity: profile.scenario.destination.selectedPlace.city,
      originMetro: profile.scenario.origin.label,
      destinationMetro: profile.scenario.destination.label,
    },
    condition: conditionCopy[profile.condition.value],
    confidence: {
      level: profile.confidence.level,
      explanation:
        "Limited because this slice evaluates one ACS commute metric and does not report coverage as a promotion input.",
    },
    stability: {
      level: profile.stability.level,
      explanation:
        "Not evaluated. Income, housing, and expense breakpoints are not implemented in this slice.",
    },
    finances: {
      origin: {
        takeHome: formatMoney(
          profile.financialPosition.origin.monthlyTakeHomeIncomeCents,
        ),
        housing: formatMoney(
          profile.financialPosition.origin.monthlyHousingCostCents,
        ),
        recurring: formatMoney(
          profile.financialPosition.origin.monthlyRecurringExpensesCents,
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
        housing: formatMoney(
          profile.financialPosition.destination.monthlyHousingCostCents,
        ),
        recurring: formatMoney(
          profile.financialPosition.destination.monthlyRecurringExpensesCents,
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
    priority: {
      label: "Typical one-way commute",
      originValue: `${metric.originValue?.toFixed(1)} min`,
      destinationValue: `${metric.destinationValue?.toFixed(1)} min`,
      originMoe: metric.quality.marginOfError?.origin ?? null,
      destinationMoe: metric.quality.marginOfError?.destination ?? null,
      classification: priority.classification,
      weight: priority.weight,
      quality: metric.quality.grade.value,
      interpretation: priorityInterpretation,
    },
    findings: {
      drivers: profile.findings.drivers.map(findingText),
      tradeoffs: profile.findings.tradeoffs.map(findingText),
      blockers: profile.findings.blockers.map(findingText),
      assumptions: profile.findings.assumptions.map(findingText),
    },
    nextSteps: profile.nextSteps.map(
      (step) => nextStepCopy[step.code] ?? step.code.replaceAll("_", " "),
    ),
    evidence: {
      definition: metric.definition,
      dataset: metric.source.dataset,
      publisher: metric.source.publisher,
      sourceUrl: metric.source.sourceUrl,
      termsUrl: metric.source.termsUrl,
      observationPeriod: metric.observationPeriod,
      releasedOn: metric.releasedOn,
      verifiedOn: metric.verifiedOn,
      originGeography: metric.geographies.origin.label,
      destinationGeography: metric.geographies.destination.label,
      originMoe: metric.quality.marginOfError?.origin ?? null,
      destinationMoe: metric.quality.marginOfError?.destination ?? null,
      transformationId: metric.transformation.id,
      transformationVersion: metric.transformation.version,
      snapshotVersion: profile.scenario.benchmarkSnapshot.version,
      snapshotSha256: profile.scenario.benchmarkSnapshot.sha256,
      rawSnapshotSha256: profile.scenario.benchmarkSnapshot.rawSnapshot.sha256,
      delineationVersion: profile.scenario.benchmarkSnapshot.delineationVersion,
    },
  };
};

export type ResearchResultsViewModel = ReturnType<
  typeof createResearchResultsViewModel
>;
