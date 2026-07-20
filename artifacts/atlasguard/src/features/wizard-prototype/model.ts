import {
  getSupportedResearchPlace,
  resolveSupportedResearchComparison,
  supportedResearchPlaces,
  type SupportedResearchPlaceSlug,
} from "@workspace/benchmark-data";
import { MOVEWISE_HOUSEHOLD_FACTOR_IDS_BY_MODE } from "@workspace/contracts";
import type {
  MoveWiseHouseholdFactorId,
  MoveWiseHouseholdMode,
} from "@workspace/contracts";

export const wizardSteps = [
  { id: "move", label: "Your move", shortLabel: "Move" },
  { id: "money", label: "Your money", shortLabel: "Money" },
  { id: "priorities", label: "Daily life", shortLabel: "Daily life" },
  { id: "household", label: "Household needs", shortLabel: "Household" },
] as const;

export type WizardStepId = (typeof wizardSteps)[number]["id"];
export type AssumptionBasis = "confirmed" | "user_estimate";
export type PriorityImportance =
  | "must_have"
  | "important"
  | "nice_to_have"
  | "does_not_matter";
export type ClimateHeatPreference =
  | "fewer_hot_days"
  | "more_hot_days"
  | "does_not_matter";
export type HouseholdRole =
  | "important"
  | "essential_met"
  | "essential_unconfirmed"
  | "essential_unmet"
  | "not_applicable";
export type HouseholdImpact =
  | "strong_negative"
  | "negative"
  | "neutral"
  | "positive"
  | "strong_positive"
  | "unavailable";
export type HouseholdFactorDraft = {
  role: HouseholdRole | "";
  impact: HouseholdImpact | "";
};

export const householdFactorLabels = {
  space_fit: "Enough suitable space",
  support_network: "Being near people you rely on",
  childcare_continuity: "Keeping workable childcare arrangements",
  school_continuity: "Keeping a workable school path",
  required_services_continuity:
    "Keeping required therapy, disability, or support services",
  car_free_access: "Completing essential routines without driving",
} as const satisfies Record<MoveWiseHouseholdFactorId, string>;

const createInitialHouseholdFactors = (): Record<
  MoveWiseHouseholdFactorId,
  HouseholdFactorDraft
> => ({
  space_fit: { role: "", impact: "" },
  support_network: { role: "", impact: "" },
  childcare_continuity: { role: "", impact: "" },
  school_continuity: { role: "", impact: "" },
  required_services_continuity: { role: "", impact: "" },
  car_free_access: { role: "", impact: "" },
});

export const supportedPlaces = supportedResearchPlaces;

export type SupportedPlaceSlug = SupportedResearchPlaceSlug;

export type WizardPrototypeDraft = {
  originSlug: SupportedPlaceSlug | "";
  destinationSlug: SupportedPlaceSlug | "";
  householdMode: MoveWiseHouseholdMode | "";
  finances: {
    currentTakeHome: string;
    targetTakeHome: string;
    currentHousing: string;
    targetHousing: string;
    targetGrossIncomeKnown: boolean;
    targetGrossIncome: string;
    currentExpenses: string;
    targetExpenses: string;
    retainedPropertyNet: string;
    targetTakeHomeRangeMin: string;
    targetTakeHomeRangeMax: string;
    targetHousingRangeMin: string;
    targetHousingRangeMax: string;
    targetGrossIncomeRangeMin: string;
    targetGrossIncomeRangeMax: string;
    targetExpensesRangeMin: string;
    targetExpensesRangeMax: string;
    retainedPropertyNetRangeMin: string;
    retainedPropertyNetRangeMax: string;
    targetTakeHomeBasis: AssumptionBasis;
    targetHousingBasis: AssumptionBasis;
    targetGrossIncomeBasis: AssumptionBasis;
    targetExpensesBasis: AssumptionBasis;
    retainedPropertyNetBasis: AssumptionBasis;
  };
  commuteImportance: PriorityImportance;
  climateHeatPreference: ClimateHeatPreference;
  climateHeatImportance: Exclude<PriorityImportance, "does_not_matter">;
  householdFactors: Record<MoveWiseHouseholdFactorId, HouseholdFactorDraft>;
};

export type WizardErrors = Record<string, string>;

export const createInitialWizardDraft = (): WizardPrototypeDraft => ({
  originSlug: "",
  destinationSlug: "",
  householdMode: "",
  finances: {
    currentTakeHome: "",
    targetTakeHome: "",
    currentHousing: "",
    targetHousing: "",
    targetGrossIncomeKnown: false,
    targetGrossIncome: "",
    currentExpenses: "",
    targetExpenses: "",
    retainedPropertyNet: "0",
    targetTakeHomeRangeMin: "",
    targetTakeHomeRangeMax: "",
    targetHousingRangeMin: "",
    targetHousingRangeMax: "",
    targetGrossIncomeRangeMin: "",
    targetGrossIncomeRangeMax: "",
    targetExpensesRangeMin: "",
    targetExpensesRangeMax: "",
    retainedPropertyNetRangeMin: "",
    retainedPropertyNetRangeMax: "",
    targetTakeHomeBasis: "user_estimate",
    targetHousingBasis: "user_estimate",
    targetGrossIncomeBasis: "user_estimate",
    targetExpensesBasis: "user_estimate",
    retainedPropertyNetBasis: "confirmed",
  },
  commuteImportance: "important",
  climateHeatPreference: "fewer_hot_days",
  climateHeatImportance: "important",
  householdFactors: createInitialHouseholdFactors(),
});

export const getPlace = (slug: SupportedPlaceSlug | "") =>
  getSupportedResearchPlace(slug);

const validateMoney = (
  errors: WizardErrors,
  key: keyof WizardPrototypeDraft["finances"],
  value: string,
  label: string,
  allowZero: boolean,
) => {
  const normalized = value.trim().replaceAll(",", "");
  if (normalized === "") {
    errors[`finances.${key}`] = `${label} is required.`;
    return;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
    errors[`finances.${key}`] = `${label} must be a whole-dollar amount.`;
    return;
  }

  if (amount < 0 || (!allowZero && amount === 0)) {
    errors[`finances.${key}`] = allowZero
      ? `${label} cannot be negative.`
      : `${label} must be greater than zero.`;
  }
};

const validateSignedMoney = (
  errors: WizardErrors,
  key: keyof WizardPrototypeDraft["finances"],
  value: string,
  label: string,
) => {
  const normalized = value.trim().replaceAll(",", "");
  if (normalized === "") {
    errors[`finances.${key}`] = `${label} is required.`;
    return;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
    errors[`finances.${key}`] = `${label} must be a whole-dollar amount.`;
  }
};

const wholeDollarAmount = (value: string) => {
  const amount = Number(value.trim().replaceAll(",", ""));
  return Number.isFinite(amount) && Number.isInteger(amount) ? amount : null;
};

const validatePlausibleRange = (
  errors: WizardErrors,
  finances: WizardPrototypeDraft["finances"],
  options: {
    valueKey:
      | "targetTakeHome"
      | "targetHousing"
      | "targetGrossIncome"
      | "targetExpenses"
      | "retainedPropertyNet";
    basisKey:
      | "targetTakeHomeBasis"
      | "targetHousingBasis"
      | "targetGrossIncomeBasis"
      | "targetExpensesBasis"
      | "retainedPropertyNetBasis";
    minKey:
      | "targetTakeHomeRangeMin"
      | "targetHousingRangeMin"
      | "targetGrossIncomeRangeMin"
      | "targetExpensesRangeMin"
      | "retainedPropertyNetRangeMin";
    maxKey:
      | "targetTakeHomeRangeMax"
      | "targetHousingRangeMax"
      | "targetGrossIncomeRangeMax"
      | "targetExpensesRangeMax"
      | "retainedPropertyNetRangeMax";
    label: string;
    signed?: boolean;
    allowZero?: boolean;
  },
) => {
  if (finances[options.basisKey] === "confirmed") return;

  const minValue = finances[options.minKey].trim();
  const maxValue = finances[options.maxKey].trim();
  if (minValue === "" && maxValue === "") return;

  if (options.signed) {
    validateSignedMoney(
      errors,
      options.minKey,
      finances[options.minKey],
      `${options.label} plausible low`,
    );
    validateSignedMoney(
      errors,
      options.maxKey,
      finances[options.maxKey],
      `${options.label} plausible high`,
    );
  } else {
    validateMoney(
      errors,
      options.minKey,
      finances[options.minKey],
      `${options.label} plausible low`,
      options.allowZero ?? true,
    );
    validateMoney(
      errors,
      options.maxKey,
      finances[options.maxKey],
      `${options.label} plausible high`,
      options.allowZero ?? true,
    );
  }

  const point = wholeDollarAmount(finances[options.valueKey]);
  const min = wholeDollarAmount(finances[options.minKey]);
  const max = wholeDollarAmount(finances[options.maxKey]);
  if (
    point === null ||
    min === null ||
    max === null ||
    errors[`finances.${options.valueKey}`] ||
    errors[`finances.${options.minKey}`] ||
    errors[`finances.${options.maxKey}`]
  )
    return;

  if (min > max) {
    errors[`finances.${options.maxKey}`] =
      `${options.label} plausible high must be at least the low.`;
    return;
  }
  if (point < min || point > max) {
    errors[`finances.${options.valueKey}`] =
      `${options.label} must fall within its plausible range.`;
  }
};

export function validateWizardStep(
  step: WizardStepId,
  draft: WizardPrototypeDraft,
): WizardErrors {
  const errors: WizardErrors = {};

  if (step === "move") {
    if (draft.originSlug === "") {
      errors.originSlug = "Choose your current location.";
    }
    if (draft.destinationSlug === "") {
      errors.destinationSlug = "Choose the location you are considering.";
    }
    if (draft.householdMode === "") {
      errors.householdMode = "Choose who would be making this move.";
    }
    if (draft.originSlug !== "" && draft.originSlug === draft.destinationSlug) {
      errors.destinationSlug =
        "Origin and destination must be different locations.";
    } else if (
      draft.originSlug !== "" &&
      draft.destinationSlug !== "" &&
      resolveSupportedResearchComparison(
        draft.originSlug,
        draft.destinationSlug,
      ) === null
    ) {
      errors.destinationSlug =
        "This comparison is not available in the current four-metro research cohort.";
    }
  }

  if (step === "money") {
    validateMoney(
      errors,
      "currentTakeHome",
      draft.finances.currentTakeHome,
      "Current take-home income",
      false,
    );
    validateMoney(
      errors,
      "targetTakeHome",
      draft.finances.targetTakeHome,
      "Target take-home income",
      false,
    );
    validateMoney(
      errors,
      "currentHousing",
      draft.finances.currentHousing,
      "Current housing cost",
      true,
    );
    if (draft.finances.targetGrossIncomeKnown) {
      if (draft.finances.targetGrossIncome.trim() === "") {
        errors["finances.targetGrossIncome"] =
          "Destination gross income is required when marked known.";
      } else {
        validateMoney(
          errors,
          "targetGrossIncome",
          draft.finances.targetGrossIncome,
          "Destination gross income",
          false,
        );
      }
    }
    validateMoney(
      errors,
      "targetHousing",
      draft.finances.targetHousing,
      "Target housing cost",
      true,
    );
    validateMoney(
      errors,
      "currentExpenses",
      draft.finances.currentExpenses,
      "Current recurring expenses",
      true,
    );
    validateMoney(
      errors,
      "targetExpenses",
      draft.finances.targetExpenses,
      "Target recurring expenses",
      true,
    );
    validateSignedMoney(
      errors,
      "retainedPropertyNet",
      draft.finances.retainedPropertyNet,
      "Retained-property monthly net",
    );
    validatePlausibleRange(errors, draft.finances, {
      valueKey: "targetTakeHome",
      basisKey: "targetTakeHomeBasis",
      minKey: "targetTakeHomeRangeMin",
      maxKey: "targetTakeHomeRangeMax",
      label: "Target take-home income",
    });
    validatePlausibleRange(errors, draft.finances, {
      valueKey: "targetHousing",
      basisKey: "targetHousingBasis",
      minKey: "targetHousingRangeMin",
      maxKey: "targetHousingRangeMax",
      label: "Target housing cost",
    });
    if (draft.finances.targetGrossIncomeKnown) {
      validatePlausibleRange(errors, draft.finances, {
        valueKey: "targetGrossIncome",
        basisKey: "targetGrossIncomeBasis",
        minKey: "targetGrossIncomeRangeMin",
        maxKey: "targetGrossIncomeRangeMax",
        label: "Destination gross income",
        allowZero: false,
      });
    }
    validatePlausibleRange(errors, draft.finances, {
      valueKey: "targetExpenses",
      basisKey: "targetExpensesBasis",
      minKey: "targetExpensesRangeMin",
      maxKey: "targetExpensesRangeMax",
      label: "Target recurring expenses",
    });
    validatePlausibleRange(errors, draft.finances, {
      valueKey: "retainedPropertyNet",
      basisKey: "retainedPropertyNetBasis",
      minKey: "retainedPropertyNetRangeMin",
      maxKey: "retainedPropertyNetRangeMax",
      label: "Retained-property monthly net",
      signed: true,
    });
  }

  if (step === "household") {
    if (draft.householdMode === "") {
      errors.householdMode = "Choose who would be making this move.";
      return errors;
    }
    for (const factorId of MOVEWISE_HOUSEHOLD_FACTOR_IDS_BY_MODE[
      draft.householdMode
    ]) {
      const factor = draft.householdFactors[factorId];
      if (factor.role === "") {
        errors[`household.${factorId}.role`] =
          `Choose the role of ${householdFactorLabels[factorId]}.`;
      } else if (factor.role !== "not_applicable" && factor.impact === "") {
        errors[`household.${factorId}.impact`] =
          `Choose how ${householdFactorLabels[factorId]} would change.`;
      }
    }
  }

  return errors;
}

export function validateWizardDraft(draft: WizardPrototypeDraft): WizardErrors {
  return {
    ...validateWizardStep("move", draft),
    ...validateWizardStep("money", draft),
    ...validateWizardStep("household", draft),
  };
}

export function getNextStep(
  current: WizardStepId,
  draft: WizardPrototypeDraft,
): { step: WizardStepId; errors: WizardErrors } {
  const errors = validateWizardStep(current, draft);
  if (Object.keys(errors).length > 0) {
    return { step: current, errors };
  }

  const index = wizardSteps.findIndex((step) => step.id === current);
  return {
    step: wizardSteps[Math.min(index + 1, wizardSteps.length - 1)].id,
    errors: {},
  };
}

export function getPreviousStep(current: WizardStepId): WizardStepId {
  const index = wizardSteps.findIndex((step) => step.id === current);
  return wizardSteps[Math.max(index - 1, 0)].id;
}
