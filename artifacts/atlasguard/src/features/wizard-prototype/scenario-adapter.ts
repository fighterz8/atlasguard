import {
  MAX_MONTHLY_CENTS,
  SCENARIO_SCHEMA_VERSION,
  ScenarioInputSchema,
  type PriorityWeight,
  type ScenarioInput,
} from "@workspace/contracts";

import {
  validateWizardStep,
  type PriorityImportance,
  type WizardErrors,
  type WizardPrototypeDraft,
} from "./model";

export type WizardScenarioAdapterResult =
  | { success: true; scenario: ScenarioInput }
  | { success: false; errors: WizardErrors };

const MAX_MONTHLY_DOLLARS = BigInt(MAX_MONTHLY_CENTS / 100);

const priorityWeight: Record<PriorityImportance, PriorityWeight> = {
  must_have: 5,
  important: 4,
  nice_to_have: 2,
  does_not_matter: 0,
};

const dollarsToCents = (
  value: string,
  field: string,
  errors: WizardErrors,
): number | null => {
  const normalized = value.trim().replaceAll(",", "");

  try {
    const dollars = BigInt(normalized);
    if (dollars < -MAX_MONTHLY_DOLLARS || dollars > MAX_MONTHLY_DOLLARS) {
      errors[field] = "Amount must be between -$100,000,000 and $100,000,000.";
      return null;
    }
    return Number(dollars * 100n);
  } catch {
    errors[field] = "Amount must be a whole-dollar amount.";
    return null;
  }
};

export function adaptWizardDraftToScenarioInput(
  draft: WizardPrototypeDraft,
): WizardScenarioAdapterResult {
  const errors = validateWizardStep("review", draft);
  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const cents = {
    currentTakeHome: dollarsToCents(
      draft.finances.currentTakeHome,
      "finances.currentTakeHome",
      errors,
    ),
    targetTakeHome: dollarsToCents(
      draft.finances.targetTakeHome,
      "finances.targetTakeHome",
      errors,
    ),
    currentHousing: dollarsToCents(
      draft.finances.currentHousing,
      "finances.currentHousing",
      errors,
    ),
    targetHousing: dollarsToCents(
      draft.finances.targetHousing,
      "finances.targetHousing",
      errors,
    ),
    currentExpenses: dollarsToCents(
      draft.finances.currentExpenses,
      "finances.currentExpenses",
      errors,
    ),
    targetExpenses: dollarsToCents(
      draft.finances.targetExpenses,
      "finances.targetExpenses",
      errors,
    ),
    retainedPropertyNet: dollarsToCents(
      draft.finances.retainedPropertyNet,
      "finances.retainedPropertyNet",
      errors,
    ),
  };

  if (
    Object.keys(errors).length > 0 ||
    Object.values(cents).some((value) => value === null)
  ) {
    return { success: false, errors };
  }

  const assumption = (
    monthlyCents: number,
    basis: "confirmed" | "user_estimate",
  ) => ({ monthlyCents, basis, plausibleRangeCents: null });

  const parsed = ScenarioInputSchema.safeParse({
    schemaVersion: SCENARIO_SCHEMA_VERSION,
    originMetroSlug: draft.originSlug,
    destinationMetroSlug: draft.destinationSlug,
    finances: {
      origin: {
        takeHomeIncome: assumption(cents.currentTakeHome!, "confirmed"),
        grossIncome: null,
        housingCost: assumption(cents.currentHousing!, "confirmed"),
        recurringExpensesExcludingHousing: assumption(
          cents.currentExpenses!,
          "confirmed",
        ),
      },
      destination: {
        takeHomeIncome: assumption(
          cents.targetTakeHome!,
          draft.finances.targetTakeHomeBasis,
        ),
        grossIncome: null,
        housingCost: assumption(
          cents.targetHousing!,
          draft.finances.targetHousingBasis,
        ),
        recurringExpensesExcludingHousing: assumption(
          cents.targetExpenses!,
          draft.finances.targetExpensesBasis,
        ),
        retainedPropertyNet: assumption(
          cents.retainedPropertyNet!,
          draft.finances.retainedPropertyNetBasis,
        ),
      },
    },
    priorities: [
      {
        priorityId: "commute_time",
        preferredDirection: "lower",
        weight: priorityWeight[draft.commuteImportance],
      },
    ],
  });

  if (!parsed.success) {
    return {
      success: false,
      errors: {
        scenario:
          "These assumptions could not be converted into a valid MoveWise scenario.",
      },
    };
  }

  return { success: true, scenario: parsed.data };
}
