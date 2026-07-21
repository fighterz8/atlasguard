import { describe, expect, it } from "vitest";

import {
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
    currentHousingTenure: "rent" as const,
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
  householdPlan: {
    ...createInitialWizardDraft().householdPlan,
    housing: {
      tenure: "rent" as const,
      type: "apartment_or_condo" as const,
      bedrooms: "2" as const,
      bathrooms: "1" as const,
      maxMonthlyCost: "2200",
      stopsMove: "yes" as const,
    },
    supportNetwork: { needed: "no" as const, stopsMove: "" as const },
    requiredServices: { needed: "no" as const, stopsMove: "" as const },
    carFreeAccess: { needed: "no" as const, stopsMove: "" as const },
  },
});

describe("Wizard prototype model", () => {
  it("uses the accepted five-step decision flow with review before results", () => {
    expect(wizardSteps.map(({ id }) => id)).toEqual([
      "move",
      "money",
      "priorities",
      "household",
      "review",
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

  it("requires stop-the-move intent for household needs marked relevant", () => {
    const draft = validDraft();
    draft.householdPlan.supportNetwork = {
      needed: "yes",
      stopsMove: "",
      assessment: "positive",
    };

    expect(validateWizardStep("household", draft)).toMatchObject({
      "householdPlan.supportNetwork.stopsMove":
        "Choose whether nearby support can stop the move.",
    });

    draft.householdPlan.supportNetwork.stopsMove = "no";
    expect(validateWizardStep("household", draft)).toEqual({});
  });

  it("accepts a signed retained-property monthly net", () => {
    const draft = validDraft();
    draft.finances.retainedPropertyNet = "-450";

    expect(validateWizardStep("money", draft)).toEqual({});
  });

  it("requires the current tenure with the current monthly baseline", () => {
    const draft = createInitialWizardDraft();
    draft.originSlug = "san-diego-ca";
    draft.destinationSlug = "austin-tx";
    draft.householdMode = "family";
    draft.finances.currentTakeHome = "6200";
    draft.finances.currentHousing = "2600";
    draft.finances.currentExpenses = "2100";

    expect(validateWizardStep("money", draft)).toMatchObject({
      "finances.currentHousingTenure":
        "Choose whether you currently rent or own.",
    });

    draft.finances.currentHousingTenure = "rent";

    expect(validateWizardStep("money", draft)).toEqual({});
  });

  it("accepts a field-level destination override", () => {
    const draft = createInitialWizardDraft();
    draft.finances.currentTakeHome = "6200";
    draft.finances.currentHousing = "2600";
    draft.finances.currentExpenses = "2100";
    draft.finances.currentHousingTenure = "own";
    draft.finances.targetHousing = "2200";

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
        "Destination take-home income must be a whole-dollar amount.",
      "finances.targetHousing": "Destination housing cost cannot be negative.",
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

  it("requires only the rent-first facts MoveWise can evaluate in v1", () => {
    const empty = createInitialWizardDraft();
    empty.householdMode = "individual";

    expect(validateWizardStep("household", empty)).toMatchObject({
      "householdPlan.housing.tenure": "Choose whether you plan to rent or buy.",
      "householdPlan.housing.maxMonthlyCost":
        "Enter the most you want to spend on housing each month.",
      "householdPlan.housing.bedrooms":
        "Choose the minimum number of bedrooms.",
      "householdPlan.housing.stopsMove":
        "Choose whether the rent ceiling is non-negotiable.",
    });
    expect(validateWizardStep("household", validDraft())).toEqual({});
  });

  it("keeps family details optional but requires intent for marked needs", () => {
    const draft = validDraft();
    draft.householdMode = "family";
    draft.householdPlan.childcare.needed = "yes";
    draft.householdPlan.school.needed = "yes";

    expect(validateWizardStep("household", draft)).toMatchObject({
      "householdPlan.childcare.stopsMove":
        "Choose whether childcare can stop the move.",
      "householdPlan.school.stopsMove":
        "Choose whether school continuity can stop the move.",
    });

    draft.householdPlan.childcare.stopsMove = "yes";
    draft.householdPlan.school.stopsMove = "no";
    expect(validateWizardStep("household", draft)).toEqual({});

    draft.householdPlan.childcare = {
      needed: "no",
      arrangement: "",
      stopsMove: "",
      assessment: "unavailable",
    };
    draft.householdPlan.school = {
      needed: "no",
      gradeBand: "",
      preference: "",
      requirements: "",
      stopsMove: "",
      assessment: "unavailable",
    };
    expect(validateWizardStep("household", draft)).toEqual({});
  });

  it("does not advance when the current step is invalid", () => {
    expect(getNextStep("move", createInitialWizardDraft()).step).toBe("move");
    expect(getNextStep("move", validDraft())).toEqual({
      step: "money",
      errors: {},
    });
    expect(getNextStep("priorities", validDraft()).step).toBe("household");
    expect(getNextStep("household", validDraft()).step).toBe("review");
  });

  it("moves backward without mutating the draft", () => {
    const draft = validDraft();
    const before = structuredClone(draft);

    expect(getPreviousStep("review")).toBe("household");
    expect(draft).toEqual(before);
  });
});
