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
      ceilingType: "hard" as const,
      stopsMove: "yes" as const,
    },
    supportNetwork: {
      relevance: "no" as const,
      importance: "" as const,
      status: "" as const,
    },
    requiredServices: {
      relevance: "no" as const,
      importance: "" as const,
      status: "" as const,
    },
    carFreeAccess: {
      relevance: "no" as const,
      importance: "" as const,
      status: "" as const,
    },
  },
});

describe("Wizard prototype model", () => {
  it("starts decision-bearing daily-life answers as unknown", () => {
    const draft = createInitialWizardDraft();

    expect(draft).toMatchObject({
      commuteImportance: "",
      climateHeatPreference: "",
      climateHeatImportance: "",
    });
    expect(draft.finances).toMatchObject({
      retainedPropertyNet: "",
      retainedPropertyNetBasis: "user_estimate",
    });
  });

  it("keeps relevant unanswered household needs unknown", () => {
    const individual = createInitialWizardDraft();
    individual.householdMode = "individual";

    expect(validateWizardStep("household", individual)).toMatchObject({
      "householdPlan.supportNetwork.relevance": expect.any(String),
      "householdPlan.requiredServices.relevance": expect.any(String),
      "householdPlan.carFreeAccess.relevance": expect.any(String),
    });
    expect(validateWizardStep("household", individual)).not.toHaveProperty(
      "householdPlan.childcare.relevance",
    );
    expect(validateWizardStep("household", individual)).not.toHaveProperty(
      "householdPlan.school.relevance",
    );

    const family = createInitialWizardDraft();
    family.householdMode = "family";
    expect(validateWizardStep("household", family)).toMatchObject({
      "householdPlan.childcare.relevance": expect.any(String),
      "householdPlan.school.relevance": expect.any(String),
    });
  });

  it("models household constraints as independent relevance, importance, and status", () => {
    const draft = createInitialWizardDraft();
    draft.householdMode = "individual";

    expect(draft.householdPlan.supportNetwork).toEqual({
      relevance: "",
      importance: "",
      status: "",
    });
    expect(validateWizardStep("household", draft)).toMatchObject({
      "householdPlan.supportNetwork.relevance": expect.any(String),
    });

    Object.assign(draft.householdPlan.supportNetwork, {
      relevance: "yes",
      importance: "blocker",
      status: "not_checked",
    });
    Object.assign(draft.householdPlan.requiredServices, { relevance: "no" });
    Object.assign(draft.householdPlan.carFreeAccess, { relevance: "no" });

    expect(validateWizardStep("household", draft)).toEqual({});
  });

  it("uses the accepted six-module decision flow with review before results", () => {
    expect(wizardSteps.map(({ id }) => id)).toEqual([
      "move",
      "money",
      "firstHome",
      "priorities",
      "household",
      "review",
    ]);
  });

  it("validates First home separately from Household constraints", () => {
    const draft = createInitialWizardDraft();
    draft.householdMode = "individual";

    expect(validateWizardStep("firstHome", draft)).toMatchObject({
      "householdPlan.housing.tenure": expect.any(String),
      "householdPlan.housing.type": expect.any(String),
      "householdPlan.housing.bedrooms": expect.any(String),
      "householdPlan.housing.bathrooms": expect.any(String),
      "householdPlan.housing.maxMonthlyCost": expect.any(String),
      "householdPlan.housing.ceilingType": expect.any(String),
    });
    expect(validateWizardStep("household", draft)).not.toHaveProperty(
      "householdPlan.housing.tenure",
    );
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

  it("requires importance and status for household needs marked relevant", () => {
    const draft = validDraft();
    draft.householdPlan.supportNetwork = {
      relevance: "yes",
      importance: "",
      status: "",
    };

    expect(validateWizardStep("household", draft)).toMatchObject({
      "householdPlan.supportNetwork.importance": expect.any(String),
      "householdPlan.supportNetwork.status": expect.any(String),
    });

    draft.householdPlan.supportNetwork.importance = "important";
    draft.householdPlan.supportNetwork.status = "works";
    expect(validateWizardStep("household", draft)).toEqual({});
  });

  it("accepts a signed retained-property monthly net", () => {
    const draft = validDraft();
    draft.finances.currentHousingTenure = "own";
    draft.finances.retainedPropertyNet = "-450";

    expect(validateWizardStep("money", draft)).toEqual({});
  });

  it("requires a retained-property adjustment only for current owners", () => {
    const renter = validDraft();
    renter.finances.currentHousingTenure = "rent";
    renter.finances.retainedPropertyNet = "";
    renter.finances.retainedPropertyNetRangeMin = "";
    renter.finances.retainedPropertyNetRangeMax = "";
    expect(validateWizardStep("money", renter)).toEqual({});

    const owner = validDraft();
    owner.finances.currentHousingTenure = "own";
    owner.finances.retainedPropertyNet = "";
    owner.finances.retainedPropertyNetRangeMin = "";
    owner.finances.retainedPropertyNetRangeMax = "";
    expect(validateWizardStep("money", owner)).toMatchObject({
      "finances.retainedPropertyNet":
        "Enter the monthly impact of keeping the property, or enter 0 if it will not continue after the move.",
    });
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
    draft.finances.retainedPropertyNet = "0";
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

  it("requires the deliberate First home facts MoveWise can evaluate in v1", () => {
    const empty = createInitialWizardDraft();
    empty.householdMode = "individual";

    expect(validateWizardStep("firstHome", empty)).toMatchObject({
      "householdPlan.housing.tenure": "Choose the first housing stage.",
      "householdPlan.housing.type": "Choose the kind of home you need.",
      "householdPlan.housing.maxMonthlyCost":
        "Enter the most you want to spend on housing each month.",
      "householdPlan.housing.bedrooms":
        "Choose the minimum number of bedrooms.",
      "householdPlan.housing.bathrooms":
        "Choose the minimum number of bathrooms.",
      "householdPlan.housing.ceilingType":
        "Choose how firm the rent ceiling is.",
    });
    expect(validateWizardStep("firstHome", validDraft())).toEqual({});
  });

  it("keeps family details optional but requires intent for marked needs", () => {
    const draft = validDraft();
    draft.householdMode = "family";
    draft.householdPlan.childcare.relevance = "yes";
    draft.householdPlan.school.relevance = "yes";

    expect(validateWizardStep("household", draft)).toMatchObject({
      "householdPlan.childcare.importance": expect.any(String),
      "householdPlan.childcare.status": expect.any(String),
      "householdPlan.school.importance": expect.any(String),
      "householdPlan.school.status": expect.any(String),
    });

    draft.householdPlan.childcare.importance = "blocker";
    draft.householdPlan.childcare.status = "not_checked";
    draft.householdPlan.school.importance = "important";
    draft.householdPlan.school.status = "works";
    expect(validateWizardStep("household", draft)).toEqual({});

    draft.householdPlan.childcare = {
      relevance: "no",
      importance: "",
      status: "",
      arrangement: "",
    };
    draft.householdPlan.school = {
      relevance: "no",
      importance: "",
      status: "",
      gradeBand: "",
      preference: "",
      requirements: "",
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
