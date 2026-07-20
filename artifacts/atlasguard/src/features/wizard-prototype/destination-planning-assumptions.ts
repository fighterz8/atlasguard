import type { WizardPrototypeDraft } from "./model";

export type DestinationPlanningSource = "movewise_baseline" | "user_override";

export type DestinationPlanningAssumptions = Readonly<{
  takeHome: DestinationPlanningSource;
  housing: DestinationPlanningSource;
  expenses: DestinationPlanningSource;
  currentHousingTenure: "rent" | "own";
  destinationHousingTenure: "rent" | "buy" | "either";
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
  const takeHome = useDestinationValue(
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
          takeHome.source === "movewise_baseline"
            ? "user_estimate"
            : draft.finances.targetTakeHomeBasis,
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
    },
  };
}
