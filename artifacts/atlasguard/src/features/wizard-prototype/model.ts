import {
  getSupportedResearchPlace,
  resolveSupportedResearchComparison,
  supportedResearchPlaces,
  type SupportedResearchPlaceSlug,
} from "@workspace/benchmark-data";
import type {
  MoveWiseHouseholdFactorId,
  MoveWiseHouseholdMode,
} from "@workspace/contracts";

export const wizardSteps = [
  { id: "move", label: "Your move", shortLabel: "Move" },
  { id: "money", label: "Your money", shortLabel: "Money" },
  { id: "priorities", label: "Daily life", shortLabel: "Daily life" },
  { id: "household", label: "Household needs", shortLabel: "Household" },
  { id: "review", label: "Review", shortLabel: "Review" },
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
export const HOUSEHOLD_PLAN_VERSION = "1.0.0" as const;

export const householdFactorLabels = {
  space_fit: "Suitable housing",
  support_network: "Nearby support",
  childcare_continuity: "Workable childcare",
  school_continuity: "A suitable school path",
  required_services_continuity: "Required services",
  car_free_access: "Car-free routines",
} as const satisfies Record<MoveWiseHouseholdFactorId, string>;

export type YesNoAnswer = "yes" | "no";
export type HouseholdFitAssessment =
  | "strong_negative"
  | "negative"
  | "neutral"
  | "positive"
  | "strong_positive"
  | "unavailable";
export type HousingTenure = "rent" | "buy" | "rent_then_buy" | "either";
export type HousingType =
  | "apartment_or_condo"
  | "townhome"
  | "detached"
  | "flexible";
export type BedroomNeed = "studio" | "1" | "2" | "3" | "4_plus";
export type BathroomNeed = "1" | "1_5" | "2" | "3_plus";
export type ChildcareArrangement =
  | "center"
  | "home_based"
  | "in_home_caregiver"
  | "family_or_friend"
  | "before_after_school"
  | "flexible";
export type SchoolGradeBand =
  | "preschool"
  | "elementary"
  | "middle"
  | "high"
  | "multiple";
export type SchoolPreference = "public" | "private" | "either";

export type ConditionalHouseholdNeed = {
  needed: YesNoAnswer | "";
  stopsMove: YesNoAnswer | "";
  assessment: HouseholdFitAssessment;
};

export type HouseholdPlanDraft = {
  version: typeof HOUSEHOLD_PLAN_VERSION;
  housing: {
    tenure: HousingTenure | "";
    type: HousingType | "";
    bedrooms: BedroomNeed | "";
    bathrooms: BathroomNeed | "";
    maxMonthlyCost: string;
    stopsMove: YesNoAnswer | "";
    assessment: HouseholdFitAssessment;
  };
  childcare: ConditionalHouseholdNeed & {
    arrangement: ChildcareArrangement | "";
  };
  school: ConditionalHouseholdNeed & {
    gradeBand: SchoolGradeBand | "";
    preference: SchoolPreference | "";
    requirements: string;
  };
  supportNetwork: ConditionalHouseholdNeed;
  requiredServices: ConditionalHouseholdNeed;
  carFreeAccess: ConditionalHouseholdNeed;
};

export const createInitialHouseholdPlan = (): HouseholdPlanDraft => ({
  version: HOUSEHOLD_PLAN_VERSION,
  housing: {
    tenure: "",
    type: "",
    bedrooms: "",
    bathrooms: "",
    maxMonthlyCost: "",
    stopsMove: "",
    assessment: "unavailable",
  },
  childcare: {
    needed: "",
    arrangement: "",
    stopsMove: "",
    assessment: "unavailable",
  },
  school: {
    needed: "",
    gradeBand: "",
    preference: "",
    requirements: "",
    stopsMove: "",
    assessment: "unavailable",
  },
  supportNetwork: { needed: "", stopsMove: "", assessment: "unavailable" },
  requiredServices: { needed: "", stopsMove: "", assessment: "unavailable" },
  carFreeAccess: { needed: "", stopsMove: "", assessment: "unavailable" },
});

export const supportedPlaces = supportedResearchPlaces;

export type SupportedPlaceSlug = SupportedResearchPlaceSlug;

export type WizardPrototypeDraft = {
  originSlug: SupportedPlaceSlug | "";
  destinationSlug: SupportedPlaceSlug | "";
  householdMode: MoveWiseHouseholdMode | "";
  finances: {
    currentHousingTenure: "rent" | "own" | "";
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
  householdPlan: HouseholdPlanDraft;
};

export type WizardErrors = Record<string, string>;

export const createInitialWizardDraft = (): WizardPrototypeDraft => ({
  originSlug: "",
  destinationSlug: "",
  householdMode: "",
  finances: {
    currentHousingTenure: "",
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
  householdPlan: createInitialHouseholdPlan(),
});

const destinationOverrideKeys = [
  "targetTakeHome",
  "targetHousing",
  "targetExpenses",
] as const;

export type DestinationFinanceOverrideStatus = "none" | "partial" | "complete";

export const getDestinationFinanceOverrideStatus = (
  finances: WizardPrototypeDraft["finances"],
): DestinationFinanceOverrideStatus => {
  const supplied = destinationOverrideKeys.filter(
    (key) => finances[key].trim() !== "",
  ).length;
  if (supplied === 0) return "none";
  return supplied === destinationOverrideKeys.length ? "complete" : "partial";
};

export const getPlace = (slug: SupportedPlaceSlug | "") =>
  getSupportedResearchPlace(slug);

const validateMoney = (
  errors: WizardErrors,
  key: keyof WizardPrototypeDraft["finances"],
  value: string,
  label: string,
  allowZero: boolean,
) => {
  const normalized = value.trim().replace(/,/g, "");
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
  const normalized = value.trim().replace(/,/g, "");
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
  const amount = Number(value.trim().replace(/,/g, ""));
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
    if (draft.finances.currentHousingTenure === "") {
      errors["finances.currentHousingTenure"] =
        "Choose whether you currently rent or own.";
    }
    validateMoney(
      errors,
      "currentTakeHome",
      draft.finances.currentTakeHome,
      "Current take-home income",
      false,
    );
    validateMoney(
      errors,
      "currentHousing",
      draft.finances.currentHousing,
      "Current housing cost",
      true,
    );
    if (draft.finances.targetTakeHome.trim() !== "")
      validateMoney(
        errors,
        "targetTakeHome",
        draft.finances.targetTakeHome,
        "Destination take-home income",
        false,
      );
    if (draft.finances.targetHousing.trim() !== "")
      validateMoney(
        errors,
        "targetHousing",
        draft.finances.targetHousing,
        "Destination housing cost",
        true,
      );
    if (draft.finances.targetExpenses.trim() !== "")
      validateMoney(
        errors,
        "targetExpenses",
        draft.finances.targetExpenses,
        "Destination recurring expenses",
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
      "currentExpenses",
      draft.finances.currentExpenses,
      "Current recurring expenses",
      true,
    );
    validateSignedMoney(
      errors,
      "retainedPropertyNet",
      draft.finances.retainedPropertyNet,
      "Retained-property monthly net",
    );
    if (draft.finances.targetTakeHome.trim() !== "")
      validatePlausibleRange(errors, draft.finances, {
        valueKey: "targetTakeHome",
        basisKey: "targetTakeHomeBasis",
        minKey: "targetTakeHomeRangeMin",
        maxKey: "targetTakeHomeRangeMax",
        label: "Target take-home income",
      });
    if (draft.finances.targetHousing.trim() !== "")
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
    if (draft.finances.targetExpenses.trim() !== "")
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
    const { householdPlan } = draft;
    const requiredHousingFields = [
      ["tenure", "Choose whether you plan to rent or buy."],
      ["bedrooms", "Choose the minimum number of bedrooms."],
      ["stopsMove", "Choose whether the rent ceiling is non-negotiable."],
    ] as const;
    for (const [field, message] of requiredHousingFields) {
      if (householdPlan.housing[field] === "") {
        errors[`householdPlan.housing.${field}`] = message;
      }
    }

    const normalizedBudget = householdPlan.housing.maxMonthlyCost
      .trim()
      .replace(/,/g, "");
    if (normalizedBudget === "") {
      errors["householdPlan.housing.maxMonthlyCost"] =
        "Enter the most you want to spend on housing each month.";
    } else if (!/^\d+$/.test(normalizedBudget)) {
      errors["householdPlan.housing.maxMonthlyCost"] =
        "Housing budget must be a whole-dollar amount.";
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
