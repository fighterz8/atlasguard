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
  draft.householdPlan.housing.tenure = "rent_then_buy";
  draft.householdPlan.housing.bedrooms = "3";
  draft.householdPlan.housing.maxMonthlyCost = "2400";
  draft.householdPlan.housing.ceilingType = "target";
  draft.householdPlan.housing.stopsMove = "no";
  return draft;
};

describe("destination planning assumptions", () => {
  it("prefills blank destination money from public metro evidence instead of copied current values", () => {
    const draft = currentOnlyDraft();
    const result = createDestinationPlanningDraft(draft);

    expect(result.evaluatedDraft.finances).toMatchObject({
      targetTakeHome: "5675",
      targetHousing: "2177",
      targetExpenses: "1896",
      targetTakeHomeBasis: "user_estimate",
      targetTakeHomeRangeMin: "5469",
      targetTakeHomeRangeMax: "5888",
      targetHousingRangeMin: "2129",
      targetHousingRangeMax: "2225",
      targetHousingBasis: "user_estimate",
      targetExpensesBasis: "user_estimate",
    });
    expect(result.assumptions).toMatchObject({
      takeHome: "movewise_public_estimate",
      housing: "movewise_public_estimate",
      expenses: "movewise_public_estimate",
      currentHousingTenure: "rent",
      destinationHousingTenure: "rent_then_buy",
      requestedBedrooms: "3",
      maximumMonthlyRentDollars: 2_400,
      rentCeilingNonNegotiable: false,
      incomeGuidance: {
        suggestedMonthlyTakeHomeDollars: 5_675,
        destinationToOriginRatioBps: 9_154,
      },
      rentGuidance: {
        bedroomNeed: "3",
        destination: {
          monthlyGrossRentDollars: 2_177,
        },
        monthlyDifferenceDollars: -672,
      },
      expenseGuidance: {
        suggestedMonthlyExpensesDollars: 1_896,
        destinationToOriginRatioBps: 9_029,
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
      expenses: "movewise_public_estimate",
    });
  });
});
