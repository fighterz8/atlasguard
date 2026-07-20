import { describe, expect, it } from "vitest";

import { createDestinationPlanningDraft } from "./destination-planning-assumptions";
import { createInitialWizardDraft } from "./model";

const currentOnlyDraft = () => {
  const draft = createInitialWizardDraft();
  draft.originSlug = "san-diego-ca";
  draft.destinationSlug = "austin-tx";
  draft.finances.currentHousingTenure = "rent";
  draft.finances.currentTakeHome = "6,200";
  draft.finances.currentHousing = "2,600";
  draft.finances.currentExpenses = "2,100";
  draft.householdPlan.housing.tenure = "buy";
  return draft;
};

describe("destination planning assumptions", () => {
  it("prefills destination income from public metro data and other blanks from the current baseline", () => {
    const draft = currentOnlyDraft();
    const result = createDestinationPlanningDraft(draft);

    expect(result.evaluatedDraft.finances).toMatchObject({
      targetTakeHome: "5675",
      targetHousing: "2,600",
      targetExpenses: "2,100",
      targetTakeHomeBasis: "user_estimate",
      targetTakeHomeRangeMin: "5469",
      targetTakeHomeRangeMax: "5888",
      targetHousingBasis: "user_estimate",
      targetExpensesBasis: "user_estimate",
    });
    expect(result.assumptions).toMatchObject({
      takeHome: "movewise_public_estimate",
      housing: "movewise_baseline",
      expenses: "movewise_baseline",
      currentHousingTenure: "rent",
      destinationHousingTenure: "buy",
      incomeGuidance: {
        suggestedMonthlyTakeHomeDollars: 5_675,
        destinationToOriginRatioBps: 9_154,
      },
    });
    expect(draft.finances.targetTakeHome).toBe("");
  });

  it("preserves a field-level user override and fills only the remaining blanks", () => {
    const draft = currentOnlyDraft();
    draft.finances.targetHousing = "2,200";
    draft.finances.targetHousingBasis = "confirmed";

    const result = createDestinationPlanningDraft(draft);

    expect(result.evaluatedDraft.finances.targetHousing).toBe("2,200");
    expect(result.evaluatedDraft.finances.targetHousingBasis).toBe("confirmed");
    expect(result.assumptions).toMatchObject({
      takeHome: "movewise_public_estimate",
      housing: "user_override",
      expenses: "movewise_baseline",
    });
  });
});
