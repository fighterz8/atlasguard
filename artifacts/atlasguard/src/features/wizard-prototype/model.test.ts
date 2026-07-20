import { describe, expect, it } from "vitest";

import {
  copyCurrentCosts,
  createInitialWizardDraft,
  getNextStep,
  getPreviousStep,
  validateWizardStep,
  wizardSteps,
} from "./model";

const validDraft = () => ({
  ...createInitialWizardDraft(),
  originSlug: "los-angeles-ca" as const,
  destinationSlug: "seattle-wa" as const,
  householdMode: "individual" as const,
  finances: {
    ...createInitialWizardDraft().finances,
    currentTakeHome: "5000",
    targetTakeHome: "5,250",
    currentHousing: "2000",
    targetHousing: "1750",
    currentExpenses: "1500",
    targetExpenses: "1500",
    retainedPropertyNet: "0",
    targetTakeHomeRangeMin: "4,750",
    targetTakeHomeRangeMax: "5,500",
    targetHousingRangeMin: "1,500",
    targetHousingRangeMax: "2,100",
    targetExpensesRangeMin: "1,200",
    targetExpensesRangeMax: "1,800",
    retainedPropertyNetRangeMin: "-500",
    retainedPropertyNetRangeMax: "500",
  },
});

describe("Wizard prototype model", () => {
  it("copies current costs without treating current take-home as a destination estimate", () => {
    const finances = {
      ...createInitialWizardDraft().finances,
      currentTakeHome: "5000",
      targetTakeHome: "5600",
      currentHousing: "2100",
      targetHousing: "1900",
      currentExpenses: "1400",
      targetExpenses: "1200",
      targetTakeHomeBasis: "confirmed" as const,
      targetHousingBasis: "confirmed" as const,
      targetExpensesBasis: "confirmed" as const,
      targetTakeHomeRangeMin: "5400",
      targetTakeHomeRangeMax: "5800",
    };

    expect(copyCurrentCosts(finances)).toMatchObject({
      targetTakeHome: "5600",
      targetTakeHomeBasis: "confirmed",
      targetTakeHomeRangeMin: "5400",
      targetTakeHomeRangeMax: "5800",
      targetHousing: "2100",
      targetHousingBasis: "user_estimate",
      targetExpenses: "1400",
      targetExpensesBasis: "user_estimate",
    });
  });

  it("uses the accepted four-step decision flow", () => {
    expect(wizardSteps.map(({ id }) => id)).toEqual([
      "move",
      "money",
      "priorities",
      "household",
    ]);
  });

  it("requires two different supported locations", () => {
    const empty = createInitialWizardDraft();
    empty.householdMode = "individual";
    expect(validateWizardStep("move", empty)).toEqual({
      originSlug: "Choose your current location.",
      destinationSlug: "Choose the location you are considering.",
    });

    const same = {
      ...empty,
      originSlug: "seattle-wa" as const,
      destinationSlug: "seattle-wa" as const,
    };
    expect(validateWizardStep("move", same).destinationSlug).toBe(
      "Origin and destination must be different locations.",
    );

    const reverse = {
      ...empty,
      originSlug: "seattle-wa" as const,
      destinationSlug: "los-angeles-ca" as const,
    };
    expect(validateWizardStep("move", reverse)).toEqual({});

    const expanded = {
      ...empty,
      originSlug: "austin-tx" as const,
      destinationSlug: "san-diego-ca" as const,
    };
    expect(validateWizardStep("move", expanded)).toEqual({});
  });

  it("requires the moving-party mode on the move step", () => {
    const draft = validDraft();
    draft.householdMode = "";

    expect(validateWizardStep("move", draft)).toMatchObject({
      householdMode: "Choose who would be making this move.",
    });
  });

  it("accepts a signed retained-property monthly net", () => {
    const draft = validDraft();
    draft.finances.retainedPropertyNet = "-450";

    expect(validateWizardStep("money", draft)).toEqual({});
  });

  it("accepts point estimates and validates a range only when supplied", () => {
    const pointEstimates = validDraft();
    pointEstimates.finances.targetTakeHomeRangeMin = "";
    pointEstimates.finances.targetTakeHomeRangeMax = "";
    pointEstimates.finances.targetHousingRangeMin = "";
    pointEstimates.finances.targetHousingRangeMax = "";
    pointEstimates.finances.targetExpensesRangeMin = "";
    pointEstimates.finances.targetExpensesRangeMax = "";
    pointEstimates.finances.retainedPropertyNetRangeMin = "";
    pointEstimates.finances.retainedPropertyNetRangeMax = "";
    expect(validateWizardStep("money", pointEstimates)).toEqual({});

    const missing = validDraft();
    missing.finances.targetHousingRangeMin = "";
    expect(validateWizardStep("money", missing)).toMatchObject({
      "finances.targetHousingRangeMin":
        "Target housing cost plausible low is required.",
    });

    const inverted = validDraft();
    inverted.finances.targetExpensesRangeMin = "1800";
    inverted.finances.targetExpensesRangeMax = "1200";
    expect(validateWizardStep("money", inverted)).toMatchObject({
      "finances.targetExpensesRangeMax":
        "Target recurring expenses plausible high must be at least the low.",
    });

    const outside = validDraft();
    outside.finances.targetTakeHomeRangeMax = "5000";
    expect(validateWizardStep("money", outside)).toMatchObject({
      "finances.targetTakeHome":
        "Target take-home income must fall within its plausible range.",
    });
  });

  it("does not require a range for confirmed destination values", () => {
    const draft = validDraft();
    draft.finances.targetHousingBasis = "confirmed";
    draft.finances.targetHousingRangeMin = "";
    draft.finances.targetHousingRangeMax = "";

    expect(validateWizardStep("money", draft)).toEqual({});
  });

  it("reports specific money-field errors", () => {
    const draft = validDraft();
    draft.finances.targetTakeHome = "12.50";
    draft.finances.targetHousing = "-1";

    expect(validateWizardStep("money", draft)).toMatchObject({
      "finances.targetTakeHome":
        "Target take-home income must be a whole-dollar amount.",
      "finances.targetHousing": "Target housing cost cannot be negative.",
    });
  });

  it("keeps destination gross income optional and validates it when known", () => {
    const unknown = validDraft();
    unknown.finances.targetGrossIncomeKnown = false;
    expect(validateWizardStep("money", unknown)).toEqual({});

    const known = validDraft();
    known.finances.targetGrossIncomeKnown = true;
    known.finances.targetGrossIncome = "";
    expect(validateWizardStep("money", known)).toMatchObject({
      "finances.targetGrossIncome":
        "Destination gross income is required when marked known.",
    });
  });

  it("requires every mode-applicable household answer explicitly", () => {
    const draft = validDraft();
    expect(validateWizardStep("household", draft)).toMatchObject({
      "household.space_fit.role": "Choose the role of Enough suitable space.",
      "household.support_network.role":
        "Choose the role of Being near people you rely on.",
    });

    for (const factorId of [
      "space_fit",
      "support_network",
      "required_services_continuity",
      "car_free_access",
    ] as const) {
      draft.householdFactors[factorId] = {
        role: "not_applicable",
        impact: "",
      };
    }
    expect(validateWizardStep("household", draft)).toEqual({});
  });

  it("does not advance when the current step is invalid", () => {
    expect(getNextStep("move", createInitialWizardDraft()).step).toBe("move");
    expect(getNextStep("move", validDraft())).toEqual({
      step: "money",
      errors: {},
    });
    expect(getNextStep("priorities", validDraft()).step).toBe("household");
  });

  it("moves backward without mutating the draft", () => {
    const draft = validDraft();
    const before = structuredClone(draft);

    expect(getPreviousStep("household")).toBe("priorities");
    expect(draft).toEqual(before);
  });
});
