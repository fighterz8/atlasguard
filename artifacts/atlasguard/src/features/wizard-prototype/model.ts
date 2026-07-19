import {
  getSupportedResearchPlace,
  resolveSupportedResearchComparison,
  supportedResearchPlaces,
  type SupportedResearchPlaceSlug,
} from "@workspace/benchmark-data";

export const wizardSteps = [
  { id: "move", label: "Your move", shortLabel: "Move" },
  { id: "money", label: "Your money", shortLabel: "Money" },
  { id: "priorities", label: "What matters", shortLabel: "Priorities" },
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

export const supportedPlaces = supportedResearchPlaces;

export type SupportedPlaceSlug = SupportedResearchPlaceSlug;

export type WizardPrototypeDraft = {
  originSlug: SupportedPlaceSlug | "";
  destinationSlug: SupportedPlaceSlug | "";
  finances: {
    currentTakeHome: string;
    targetTakeHome: string;
    currentHousing: string;
    targetHousing: string;
    currentExpenses: string;
    targetExpenses: string;
    retainedPropertyNet: string;
    targetTakeHomeRangeMin: string;
    targetTakeHomeRangeMax: string;
    targetHousingRangeMin: string;
    targetHousingRangeMax: string;
    targetExpensesRangeMin: string;
    targetExpensesRangeMax: string;
    retainedPropertyNetRangeMin: string;
    retainedPropertyNetRangeMax: string;
    targetTakeHomeBasis: AssumptionBasis;
    targetHousingBasis: AssumptionBasis;
    targetExpensesBasis: AssumptionBasis;
    retainedPropertyNetBasis: AssumptionBasis;
  };
  commuteImportance: PriorityImportance;
  climateHeatPreference: ClimateHeatPreference;
  climateHeatImportance: Exclude<PriorityImportance, "does_not_matter">;
};

export type WizardErrors = Record<string, string>;

export const createInitialWizardDraft = (): WizardPrototypeDraft => ({
  originSlug: "",
  destinationSlug: "",
  finances: {
    currentTakeHome: "",
    targetTakeHome: "",
    currentHousing: "",
    targetHousing: "",
    currentExpenses: "",
    targetExpenses: "",
    retainedPropertyNet: "0",
    targetTakeHomeRangeMin: "",
    targetTakeHomeRangeMax: "",
    targetHousingRangeMin: "",
    targetHousingRangeMax: "",
    targetExpensesRangeMin: "",
    targetExpensesRangeMax: "",
    retainedPropertyNetRangeMin: "",
    retainedPropertyNetRangeMax: "",
    targetTakeHomeBasis: "user_estimate",
    targetHousingBasis: "user_estimate",
    targetExpensesBasis: "user_estimate",
    retainedPropertyNetBasis: "confirmed",
  },
  commuteImportance: "important",
  climateHeatPreference: "fewer_hot_days",
  climateHeatImportance: "important",
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
      | "targetExpenses"
      | "retainedPropertyNet";
    basisKey:
      | "targetTakeHomeBasis"
      | "targetHousingBasis"
      | "targetExpensesBasis"
      | "retainedPropertyNetBasis";
    minKey:
      | "targetTakeHomeRangeMin"
      | "targetHousingRangeMin"
      | "targetExpensesRangeMin"
      | "retainedPropertyNetRangeMin";
    maxKey:
      | "targetTakeHomeRangeMax"
      | "targetHousingRangeMax"
      | "targetExpensesRangeMax"
      | "retainedPropertyNetRangeMax";
    label: string;
    signed?: boolean;
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
      true,
    );
    validateMoney(
      errors,
      options.maxKey,
      finances[options.maxKey],
      `${options.label} plausible high`,
      true,
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

  return errors;
}

export function validateWizardDraft(draft: WizardPrototypeDraft): WizardErrors {
  return {
    ...validateWizardStep("move", draft),
    ...validateWizardStep("money", draft),
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
