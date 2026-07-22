import { describe, expect, it } from "vitest";

import { createInitialWizardDraft } from "./model";
import {
  createBudgetEditSession,
  createBudgetEditSummary,
} from "./budget-edit-session";

const createEvaluatedBudget = () => {
  const draft = createInitialWizardDraft();
  draft.originSlug = "los-angeles-ca";
  draft.destinationSlug = "seattle-wa";
  draft.finances.currentHousingTenure = "rent";
  draft.finances.currentTakeHome = "5000";
  draft.finances.currentHousing = "2000";
  draft.finances.currentExpenses = "1500";
  return draft;
};

describe("Budget edit session", () => {
  it("creates isolated baseline and working copies", () => {
    const source = createEvaluatedBudget();
    const session = createBudgetEditSession("results", source);

    session.workingDraft.finances.currentTakeHome = "5500";

    expect(source.finances.currentTakeHome).toBe("5000");
    expect(session.baselineDraft.finances.currentTakeHome).toBe("5000");
    expect(session.workingDraft.finances.currentTakeHome).toBe("5500");
  });

  it("summarizes exact changed assumptions and their monthly consequence", () => {
    const before = createEvaluatedBudget();
    const after = createEvaluatedBudget();
    after.finances.currentTakeHome = "5500";
    after.finances.targetExpenses = "1600";

    expect(createBudgetEditSummary(before, after)).toMatchObject({
      hasChanges: true,
      count: 2,
      headline: "2 Budget assumptions updated",
      detail: "Current room left changed from $1,500 to $2,000.",
      items: [
        {
          key: "currentTakeHome",
          label: "Current income after tax",
          before: "$5,000",
          after: "$5,500",
        },
        {
          key: "targetExpenses",
          label: "Destination everything else",
          before: "MoveWise estimate",
          after: "$1,600",
        },
      ],
    });
  });

  it("reports an unchanged working copy without inventing a recalculation", () => {
    const draft = createEvaluatedBudget();
    expect(createBudgetEditSummary(draft, draft)).toEqual({
      hasChanges: false,
      count: 0,
      headline: "No Budget changes yet",
      detail: "Your evaluated brief is unchanged.",
      items: [],
    });
  });
});
