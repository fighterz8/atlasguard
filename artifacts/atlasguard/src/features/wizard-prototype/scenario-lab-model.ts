import type { VerifiedResearchEvaluationResult } from "@workspace/contracts";

import {
  createResearchResultsViewModel,
  type ResearchResultsViewModel,
} from "../research-results/model";
import { clonePlainData } from "../../lib/clone-plain-data";

import type { WizardErrors, WizardPrototypeDraft } from "./model";
import { submitWizardDraft } from "./submit-wizard-draft";

export type ScenarioLabValues = Readonly<{
  takeHomeIncomeCents: number;
  housingCostCents: number;
  recurringExpensesCents: number;
  retainedPropertyNetCents: number;
}>;

export type ScenarioLabDraft = Readonly<{
  name: string;
  values: ScenarioLabValues;
}>;

type ScenarioLabValueKey = keyof ScenarioLabValues;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const formatCents = (valueCents: number) => money.format(valueCents / 100);

const conditionLabels = {
  likely_better_move: "Likely better move",
  worth_closer_look: "Worth a closer look",
  promising_if: "Promising if",
  no_clear_advantage: "No clear advantage yet",
  meaningful_tradeoff: "Meaningful tradeoff",
  high_financial_risk: "High financial risk",
} as const;

const controlDefinitions = [
  {
    id: "takeHomeIncomeCents",
    label: "Destination income after tax",
    inputPath: "finances.destination.takeHomeIncome.monthlyCents",
    draftValue: "targetTakeHome",
    basis: "targetTakeHomeBasis",
    rangeMin: "targetTakeHomeRangeMin",
    rangeMax: "targetTakeHomeRangeMax",
  },
  {
    id: "housingCostCents",
    label: "Destination housing",
    inputPath: "finances.destination.housingCost.monthlyCents",
    draftValue: "targetHousing",
    basis: "targetHousingBasis",
    rangeMin: "targetHousingRangeMin",
    rangeMax: "targetHousingRangeMax",
  },
  {
    id: "recurringExpensesCents",
    label: "Other recurring expenses",
    inputPath:
      "finances.destination.recurringExpensesExcludingHousing.monthlyCents",
    draftValue: "targetExpenses",
    basis: "targetExpensesBasis",
    rangeMin: "targetExpensesRangeMin",
    rangeMax: "targetExpensesRangeMax",
  },
  {
    id: "retainedPropertyNetCents",
    label: "Retained-property monthly impact",
    inputPath: "finances.destination.retainedPropertyNet.monthlyCents",
    draftValue: "retainedPropertyNet",
    basis: "retainedPropertyNetBasis",
    rangeMin: "retainedPropertyNetRangeMin",
    rangeMax: "retainedPropertyNetRangeMax",
  },
] as const;

const valuesFromEvaluation = (
  evaluation: VerifiedResearchEvaluationResult,
): ScenarioLabValues => ({
  takeHomeIncomeCents:
    evaluation.scenarioInput.finances.destination.takeHomeIncome.monthlyCents,
  housingCostCents:
    evaluation.scenarioInput.finances.destination.housingCost.monthlyCents,
  recurringExpensesCents:
    evaluation.scenarioInput.finances.destination
      .recurringExpensesExcludingHousing.monthlyCents,
  retainedPropertyNetCents:
    evaluation.scenarioInput.finances.destination.retainedPropertyNet
      .monthlyCents,
});

const editableValueIds = (evaluation: VerifiedResearchEvaluationResult) => {
  const destination = evaluation.scenarioInput.finances.destination;
  const bases: Record<ScenarioLabValueKey, string> = {
    takeHomeIncomeCents: destination.takeHomeIncome.basis,
    housingCostCents: destination.housingCost.basis,
    recurringExpensesCents: destination.recurringExpensesExcludingHousing.basis,
    retainedPropertyNetCents: destination.retainedPropertyNet.basis,
  };
  return new Set<ScenarioLabValueKey>(
    controlDefinitions
      .filter(({ id }) => bases[id] !== "confirmed")
      .map(({ id }) => id),
  );
};

const createSnapshot = (
  name: string,
  evaluation: VerifiedResearchEvaluationResult,
  results: ResearchResultsViewModel,
) => ({
  name,
  route: `${results.route.originCity} to ${results.route.destinationCity}`,
  fingerprint: evaluation.decisionProfile.inputFingerprintSha256,
  condition: results.condition.label,
  outlook: results.brief.outlook.label,
  readiness: results.brief.readiness.label,
  evidenceConfidence: results.brief.evidenceConfidence.label,
  monthlyCushion: results.finances.destination.cushion,
});

const evaluateDraft = (draft: WizardPrototypeDraft) => {
  const submitted = submitWizardDraft(draft);
  if (!submitted.success) return submitted;
  const results = createResearchResultsViewModel(submitted.evaluation, {
    analysis: submitted.deterministicAnalysis,
    householdAnswers: submitted.householdAnswers,
    destinationAssumptions: submitted.destinationAssumptions,
  });
  return { success: true as const, submitted, results };
};

export function applyScenarioLabValues(
  baselineDraft: WizardPrototypeDraft,
  baselineValues: ScenarioLabValues,
  scenarioValues: ScenarioLabValues,
): WizardPrototypeDraft {
  const next = clonePlainData(baselineDraft);

  controlDefinitions.forEach((definition) => {
    if (scenarioValues[definition.id] === baselineValues[definition.id]) return;
    if (next.finances[definition.basis] === "confirmed") return;
    if (
      definition.id === "retainedPropertyNetCents" &&
      next.finances.currentHousingTenure !== "own"
    )
      return;

    next.finances[definition.draftValue] = String(
      scenarioValues[definition.id] / 100,
    );
    next.finances[definition.basis] = "user_estimate";
    next.finances[definition.rangeMin] = "";
    next.finances[definition.rangeMax] = "";
  });

  return next;
}

export type ScenarioLabInitialization =
  | Readonly<{
      success: true;
      draft: ScenarioLabDraft;
      baseline: ReturnType<typeof createSnapshot>;
    }>
  | Readonly<{ success: false; errors: WizardErrors }>;

export function createInitialScenarioLabDraft(
  baselineDraft: WizardPrototypeDraft,
): ScenarioLabInitialization {
  const baseline = evaluateDraft(baselineDraft);
  if (!baseline.success) return baseline;
  const values = valuesFromEvaluation(baseline.submitted.evaluation);
  return {
    success: true,
    draft: { name: "", values },
    baseline: createSnapshot(
      "Current brief",
      baseline.submitted.evaluation,
      baseline.results,
    ),
  };
}

export type ScenarioLabModelResult =
  | Readonly<{
      success: true;
      model: Readonly<{
        baseline: ReturnType<typeof createSnapshot>;
        scenario: ReturnType<typeof createSnapshot>;
        values: ScenarioLabValues;
        controls: readonly Readonly<{
          id: ScenarioLabValueKey;
          label: string;
          valueCents: number;
          valueDollars: string;
          baseline: string;
        }>[];
        deltas: readonly Readonly<{
          id: ScenarioLabValueKey;
          label: string;
          baseline: string;
          scenario: string;
          difference: string;
        }>[];
        thresholds: readonly Readonly<{
          id: string;
          label: string;
          operator: "at least" | "at or below";
          threshold: string;
          distance: string;
          changesConditionTo: string;
          withinPlausibleRange: boolean;
        }>[];
        changed: boolean;
        nameError: string | null;
        canMakeActive: boolean;
        activeDraft: WizardPrototypeDraft;
      }>;
    }>
  | Readonly<{ success: false; errors: WizardErrors }>;

export function createScenarioLabModel(
  baselineDraft: WizardPrototypeDraft,
  scenarioDraft: ScenarioLabDraft,
): ScenarioLabModelResult {
  const baseline = evaluateDraft(baselineDraft);
  if (!baseline.success) return baseline;
  const baselineValues = valuesFromEvaluation(baseline.submitted.evaluation);
  const editableIds = editableValueIds(baseline.submitted.evaluation);
  const normalizedValues = { ...baselineValues };
  controlDefinitions.forEach(({ id }) => {
    if (editableIds.has(id)) normalizedValues[id] = scenarioDraft.values[id];
  });
  const activeDraft = applyScenarioLabValues(
    baselineDraft,
    baselineValues,
    normalizedValues,
  );
  const scenario = evaluateDraft(activeDraft);
  if (!scenario.success) return scenario;

  const deltas = controlDefinitions.flatMap((definition) => {
    if (!editableIds.has(definition.id)) return [];
    const before = baselineValues[definition.id];
    const after = normalizedValues[definition.id];
    if (before === after) return [];
    const difference = Math.abs(after - before);
    return [
      {
        id: definition.id,
        label: definition.label,
        baseline: formatCents(before),
        scenario: formatCents(after),
        difference: `${formatCents(difference)} ${after > before ? "higher" : "lower"}`,
      },
    ];
  });
  const normalizedName = scenarioDraft.name.trim();
  const nameError =
    normalizedName === ""
      ? "Name this scenario to continue."
      : normalizedName.length > 60
        ? "Use 60 characters or fewer."
        : null;
  const labelByPath = Object.fromEntries(
    controlDefinitions.map(({ inputPath, label }) => [inputPath, label]),
  );
  const definitionByPath: ReadonlyMap<
    string,
    (typeof controlDefinitions)[number]
  > = new Map(
    controlDefinitions.map((definition) => [definition.inputPath, definition]),
  );

  return {
    success: true,
    model: {
      baseline: createSnapshot(
        "Current brief",
        baseline.submitted.evaluation,
        baseline.results,
      ),
      scenario: createSnapshot(
        normalizedName || "Unnamed scenario",
        scenario.submitted.evaluation,
        scenario.results,
      ),
      values: normalizedValues,
      controls: controlDefinitions.flatMap((definition) =>
        editableIds.has(definition.id)
          ? [
              {
                id: definition.id,
                label: definition.label,
                valueCents: normalizedValues[definition.id],
                valueDollars: String(normalizedValues[definition.id] / 100),
                baseline: formatCents(baselineValues[definition.id]),
              },
            ]
          : [],
      ),
      deltas,
      thresholds: scenario.submitted.deterministicAnalysis.decisionChanges
        .filter(({ inputPath }) => {
          const definition = definitionByPath.get(inputPath);
          return definition !== undefined && editableIds.has(definition.id);
        })
        .map((change) => ({
          id: `${change.inputPath}:${change.operator}:${change.thresholdCents}`,
          label: labelByPath[change.inputPath] ?? change.inputPath,
          operator:
            change.operator === "at_or_above"
              ? ("at least" as const)
              : ("at or below" as const),
          threshold: formatCents(change.thresholdCents),
          distance: formatCents(change.distanceCents),
          changesConditionTo: conditionLabels[change.changesConditionTo],
          withinPlausibleRange: change.withinPlausibleRange,
        })),
      changed: deltas.length > 0,
      nameError,
      canMakeActive: deltas.length > 0 && nameError === null,
      activeDraft,
    },
  };
}
