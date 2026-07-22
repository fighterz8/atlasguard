import {
  getResearchMetroExpenseGuidance,
  getResearchMetroIncomeGuidance,
  getResearchMetroRentGuidance,
} from "@workspace/benchmark-data";
import type {
  ResearchMetroExpenseGuidance,
  ResearchMetroIncomeGuidance,
  ResearchMetroRentGuidance,
} from "@workspace/benchmark-data";

import type {
  BedroomNeed,
  HousingTenure,
  RentCeilingType,
  WizardPrototypeDraft,
} from "./model";
import { isHardRentCeiling } from "./model";

export type DestinationPlanningSource =
  | "movewise_public_estimate"
  | "movewise_baseline"
  | "user_override";

export type DestinationPlanningAssumptions = Readonly<{
  takeHome: DestinationPlanningSource;
  housing: DestinationPlanningSource;
  expenses: DestinationPlanningSource;
  currentHousingTenure: "rent" | "own";
  destinationHousingTenure: HousingTenure;
  incomeGuidance: ResearchMetroIncomeGuidance | null;
  rentGuidance: ResearchMetroRentGuidance | null;
  expenseGuidance: ResearchMetroExpenseGuidance | null;
  requestedBedrooms: BedroomNeed;
  maximumMonthlyRentDollars: number;
  rentCeilingType: RentCeilingType;
  rentCeilingNonNegotiable: boolean;
}>;

const useDestinationValue = (
  target: string,
  current: string,
): Readonly<{ value: string; source: DestinationPlanningSource }> =>
  target.trim() === ""
    ? { value: current, source: "movewise_baseline" }
    : { value: target, source: "user_override" };

export function createDestinationPlanningDraft(
  draft: WizardPrototypeDraft,
): Readonly<{
  evaluatedDraft: WizardPrototypeDraft;
  assumptions: DestinationPlanningAssumptions;
}> {
  const currentTakeHome = Number(
    draft.finances.currentTakeHome.trim().replace(/,/g, ""),
  );
  const currentExpenses = Number(
    draft.finances.currentExpenses.trim().replace(/,/g, ""),
  );
  const incomeGuidance = getResearchMetroIncomeGuidance(
    draft.originSlug,
    draft.destinationSlug,
    currentTakeHome,
  );
  const rentGuidance = getResearchMetroRentGuidance(
    draft.originSlug,
    draft.destinationSlug,
    draft.householdPlan.housing.bedrooms,
  );
  const expenseGuidance = getResearchMetroExpenseGuidance(
    draft.originSlug,
    draft.destinationSlug,
    currentExpenses,
  );
  const requestedBedrooms = draft.householdPlan.housing.bedrooms;
  const maximumMonthlyRentDollars = Number(
    draft.householdPlan.housing.maxMonthlyCost.trim().replace(/,/g, ""),
  );
  const rentCeilingType = draft.householdPlan.housing.ceilingType;
  const takeHome =
    draft.finances.targetTakeHome.trim() === "" && incomeGuidance !== null
      ? {
          value: String(incomeGuidance.suggestedMonthlyTakeHomeDollars),
          source: "movewise_public_estimate" as const,
        }
      : useDestinationValue(
          draft.finances.targetTakeHome,
          draft.finances.currentTakeHome,
        );
  const housing =
    draft.finances.targetHousing.trim() === "" && rentGuidance !== null
      ? {
          value: String(rentGuidance.destination.monthlyGrossRentDollars),
          source: "movewise_public_estimate" as const,
        }
      : useDestinationValue(
          draft.finances.targetHousing,
          draft.finances.currentHousing,
        );
  const expenses =
    draft.finances.targetExpenses.trim() === "" && expenseGuidance !== null
      ? {
          value: String(expenseGuidance.suggestedMonthlyExpensesDollars),
          source: "movewise_public_estimate" as const,
        }
      : useDestinationValue(
          draft.finances.targetExpenses,
          draft.finances.currentExpenses,
        );

  if (
    draft.finances.currentHousingTenure === "" ||
    draft.householdPlan.housing.tenure === "" ||
    requestedBedrooms === "" ||
    rentCeilingType === "" ||
    !Number.isFinite(maximumMonthlyRentDollars) ||
    maximumMonthlyRentDollars <= 0
  ) {
    throw new Error("Housing tenure must be complete before evaluation.");
  }

  return {
    evaluatedDraft: {
      ...draft,
      finances: {
        ...draft.finances,
        targetTakeHome: takeHome.value,
        targetHousing: housing.value,
        targetExpenses: expenses.value,
        targetTakeHomeBasis:
          takeHome.source !== "user_override"
            ? "user_estimate"
            : draft.finances.targetTakeHomeBasis,
        targetTakeHomeRangeMin:
          takeHome.source === "movewise_public_estimate"
            ? String(incomeGuidance!.plausibleMonthlyTakeHomeRangeDollars.low)
            : draft.finances.targetTakeHomeRangeMin,
        targetTakeHomeRangeMax:
          takeHome.source === "movewise_public_estimate"
            ? String(incomeGuidance!.plausibleMonthlyTakeHomeRangeDollars.high)
            : draft.finances.targetTakeHomeRangeMax,
        targetHousingRangeMin:
          housing.source === "movewise_public_estimate" &&
          rentGuidance!.destination.marginOfError90Dollars !== null
            ? String(
                rentGuidance!.destination.monthlyGrossRentDollars -
                  rentGuidance!.destination.marginOfError90Dollars,
              )
            : draft.finances.targetHousingRangeMin,
        targetHousingRangeMax:
          housing.source === "movewise_public_estimate" &&
          rentGuidance!.destination.marginOfError90Dollars !== null
            ? String(
                rentGuidance!.destination.monthlyGrossRentDollars +
                  rentGuidance!.destination.marginOfError90Dollars,
              )
            : draft.finances.targetHousingRangeMax,
        targetHousingBasis:
          housing.source !== "user_override"
            ? "user_estimate"
            : draft.finances.targetHousingBasis,
        targetExpensesBasis:
          expenses.source !== "user_override"
            ? "user_estimate"
            : draft.finances.targetExpensesBasis,
      },
    },
    assumptions: {
      takeHome: takeHome.source,
      housing: housing.source,
      expenses: expenses.source,
      currentHousingTenure: draft.finances.currentHousingTenure,
      destinationHousingTenure: draft.householdPlan.housing.tenure,
      incomeGuidance,
      rentGuidance,
      expenseGuidance,
      requestedBedrooms,
      maximumMonthlyRentDollars,
      rentCeilingType,
      rentCeilingNonNegotiable: isHardRentCeiling(draft.householdPlan.housing),
    },
  };
}
