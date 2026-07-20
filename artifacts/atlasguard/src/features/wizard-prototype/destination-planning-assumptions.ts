import { getResearchMetroIncomeGuidance } from "@workspace/benchmark-data";
import type { ResearchMetroIncomeGuidance } from "@workspace/benchmark-data";

import type { HousingTenure, WizardPrototypeDraft } from "./model";

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
  const incomeGuidance = getResearchMetroIncomeGuidance(
    draft.originSlug,
    draft.destinationSlug,
    currentTakeHome,
  );
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
  const housing = useDestinationValue(
    draft.finances.targetHousing,
    draft.finances.currentHousing,
  );
  const expenses = useDestinationValue(
    draft.finances.targetExpenses,
    draft.finances.currentExpenses,
  );

  if (
    draft.finances.currentHousingTenure === "" ||
    draft.householdPlan.housing.tenure === ""
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
        targetHousingBasis:
          housing.source === "movewise_baseline"
            ? "user_estimate"
            : draft.finances.targetHousingBasis,
        targetExpensesBasis:
          expenses.source === "movewise_baseline"
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
    },
  };
}
