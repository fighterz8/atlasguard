import { describe, expect, it } from "vitest";

import { createInitialWizardDraft, type WizardPrototypeDraft } from "./model";
import { submitWizardDraft } from "./submit-wizard-draft";

const reviewedDraft = (): WizardPrototypeDraft => {
  const draft = createInitialWizardDraft();
  draft.originSlug = "san-diego-ca";
  draft.destinationSlug = "austin-tx";
  draft.householdMode = "individual";
  draft.finances.currentHousingTenure = "rent";
  draft.finances.currentTakeHome = "6,200";
  draft.finances.currentHousing = "2,600";
  draft.finances.currentExpenses = "2,100";
  draft.householdPlan.housing = {
    tenure: "rent",
    type: "apartment_or_condo",
    bedrooms: "2",
    bathrooms: "1",
    maxMonthlyCost: "2600",
    stopsMove: "no",
  };
  draft.householdPlan.supportNetwork = { needed: "no", stopsMove: "" };
  draft.householdPlan.requiredServices = { needed: "no", stopsMove: "" };
  draft.householdPlan.carFreeAccess = { needed: "no", stopsMove: "" };
  return draft;
};

describe("Wizard submission routing", () => {
  it("scores a current-only draft from transparent planning defaults", () => {
    const result = submitWizardDraft(reviewedDraft());

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.kind).toBe("deterministic");
    expect(result.deterministicAnalysis.ruleVersion).toBe("0.2.0");
    expect(result.evaluation.scenarioInput.finances.destination).toMatchObject({
      takeHomeIncome: { monthlyCents: 620_000, basis: "user_estimate" },
      housingCost: { monthlyCents: 260_000, basis: "user_estimate" },
      recurringExpensesExcludingHousing: {
        monthlyCents: 210_000,
        basis: "user_estimate",
      },
    });
    expect(result.destinationAssumptions).toEqual({
      takeHome: "movewise_baseline",
      housing: "movewise_baseline",
      expenses: "movewise_baseline",
      currentHousingTenure: "rent",
      destinationHousingTenure: "rent",
    });
  });

  it("preserves the deterministic rule 0.2.0 path for complete overrides", () => {
    const draft = reviewedDraft();
    draft.finances.targetTakeHome = "6,500";
    draft.finances.targetHousing = "2,200";
    draft.finances.targetExpenses = "1,900";

    const result = submitWizardDraft(draft);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.kind).toBe("deterministic");
    if (result.kind !== "deterministic") return;
    expect(result.deterministicAnalysis.ruleVersion).toBe("0.2.0");
    expect(result.evaluation.scenarioInput.finances.destination).toMatchObject({
      takeHomeIncome: { monthlyCents: 650_000 },
      housingCost: { monthlyCents: 220_000 },
      recurringExpensesExcludingHousing: { monthlyCents: 190_000 },
    });
  });

  it("preserves one destination override and prefills the remaining fields", () => {
    const draft = reviewedDraft();
    draft.finances.targetHousing = "2,200";

    const result = submitWizardDraft(draft);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.evaluation.scenarioInput.finances.destination).toMatchObject({
      takeHomeIncome: { monthlyCents: 620_000 },
      housingCost: { monthlyCents: 220_000 },
      recurringExpensesExcludingHousing: { monthlyCents: 210_000 },
    });
    expect(result.destinationAssumptions).toMatchObject({
      takeHome: "movewise_baseline",
      housing: "user_override",
      expenses: "movewise_baseline",
    });
  });
});
