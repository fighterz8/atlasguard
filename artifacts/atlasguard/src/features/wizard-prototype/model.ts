export const wizardSteps = [
  { id: "move", label: "Your move", shortLabel: "Move" },
  { id: "money", label: "Your money", shortLabel: "Money" },
  { id: "priorities", label: "What matters", shortLabel: "Priorities" },
  { id: "review", label: "Review assumptions", shortLabel: "Review" },
] as const;

export type WizardStepId = (typeof wizardSteps)[number]["id"];
export type AssumptionBasis = "confirmed" | "user_estimate";
export type PriorityImportance =
  | "must_have"
  | "important"
  | "nice_to_have"
  | "does_not_matter";

export const supportedPlaces = [
  {
    slug: "los-angeles-ca",
    city: "Los Angeles",
    state: "CA",
    metro: "Los Angeles-Long Beach-Anaheim, CA Metro Area",
  },
  {
    slug: "seattle-wa",
    city: "Seattle",
    state: "WA",
    metro: "Seattle-Tacoma-Bellevue, WA Metro Area",
  },
] as const;

export type SupportedPlaceSlug = (typeof supportedPlaces)[number]["slug"];

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
    targetTakeHomeBasis: AssumptionBasis;
    targetHousingBasis: AssumptionBasis;
    targetExpensesBasis: AssumptionBasis;
  };
  commuteImportance: PriorityImportance;
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
    targetTakeHomeBasis: "user_estimate",
    targetHousingBasis: "user_estimate",
    targetExpensesBasis: "user_estimate",
  },
  commuteImportance: "important",
});

export const getPlace = (slug: SupportedPlaceSlug | "") =>
  supportedPlaces.find((place) => place.slug === slug) ?? null;

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

export function validateWizardStep(
  step: WizardStepId,
  draft: WizardPrototypeDraft,
): WizardErrors {
  const errors: WizardErrors = {};

  if (step === "move" || step === "review") {
    if (draft.originSlug === "") {
      errors.originSlug = "Choose your current location.";
    }
    if (draft.destinationSlug === "") {
      errors.destinationSlug = "Choose the location you are considering.";
    }
    if (draft.originSlug !== "" && draft.originSlug === draft.destinationSlug) {
      errors.destinationSlug =
        "Origin and destination must be different locations.";
    }
  }

  if (step === "money" || step === "review") {
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
  }

  return errors;
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

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const formatMoney = (value: string) => {
  const amount = Number(value.trim().replaceAll(",", ""));
  return Number.isFinite(amount) ? `${money.format(amount)}/month` : "Missing";
};

export function createReviewRows(draft: WizardPrototypeDraft) {
  const origin = getPlace(draft.originSlug);
  const destination = getPlace(draft.destinationSlug);

  return [
    {
      group: "Move",
      label: "Current location",
      value: origin ? `${origin.city}, ${origin.state}` : "Missing",
      basis: "manual_entry" as const,
    },
    {
      group: "Move",
      label: "Destination",
      value: destination
        ? `${destination.city}, ${destination.state}`
        : "Missing",
      basis: "manual_entry" as const,
    },
    {
      group: "Money",
      label: "Current take-home income",
      value: formatMoney(draft.finances.currentTakeHome),
      basis: "confirmed" as const,
    },
    {
      group: "Money",
      label: "Target take-home income",
      value: formatMoney(draft.finances.targetTakeHome),
      basis: draft.finances.targetTakeHomeBasis,
    },
    {
      group: "Money",
      label: "Current housing",
      value: formatMoney(draft.finances.currentHousing),
      basis: "confirmed" as const,
    },
    {
      group: "Money",
      label: "Target housing",
      value: formatMoney(draft.finances.targetHousing),
      basis: draft.finances.targetHousingBasis,
    },
    {
      group: "Money",
      label: "Current recurring expenses",
      value: formatMoney(draft.finances.currentExpenses),
      basis: "confirmed" as const,
    },
    {
      group: "Money",
      label: "Target recurring expenses",
      value: formatMoney(draft.finances.targetExpenses),
      basis: draft.finances.targetExpensesBasis,
    },
    {
      group: "Priority",
      label: "Typical commute time",
      value: draft.commuteImportance.replaceAll("_", " "),
      basis: "user_priority" as const,
    },
  ];
}
