import { describe, expect, it } from "vitest";

import { createInitialWizardDraft } from "./model";
import { createBudgetEquationModel } from "./budget-equation-model";

const createBudgetDraft = () => {
  const draft = createInitialWizardDraft();
  draft.originSlug = "san-diego-ca";
  draft.destinationSlug = "austin-tx";
  draft.finances.currentHousingTenure = "rent";
  draft.finances.currentTakeHome = "6200";
  draft.finances.currentHousing = "2600";
  draft.finances.currentExpenses = "2100";
  return draft;
};

describe("Budget equation model", () => {
  it("shows current room left while keeping destination housing explicitly open", () => {
    const draft = createBudgetDraft();
    const model = createBudgetEquationModel(
      draft.finances,
      draft.originSlug,
      draft.destinationSlug,
    );

    expect(model.current).toMatchObject({
      takeHome: 6200,
      housing: 2600,
      expenses: 2100,
      roomLeft: 1500,
      roomLeftText: "$1,500",
    });
    expect(model.destination).toMatchObject({
      takeHome: 5675,
      takeHomeSource: "movewise_estimate",
      housing: null,
      housingSource: "waiting_on_first_home",
      expenses: 1896,
      expensesSource: "movewise_estimate",
      roomLeft: null,
      roomLeftText: "Waiting on First home",
    });
    expect(model.change).toMatchObject({ amount: null, tone: "open" });
    expect(model.consequence).toMatchObject({
      headline: "$1,500 left in your current month",
      detail: "Destination room left waits on your First home plan.",
      compact: "$1,500 now · Home plan needed",
      estimateCount: 2,
      openCount: 1,
    });
  });

  it("calculates a signed destination change after all destination values exist", () => {
    const draft = createBudgetDraft();
    draft.finances.targetHousing = "2200";
    const model = createBudgetEquationModel(
      draft.finances,
      draft.originSlug,
      draft.destinationSlug,
    );

    expect(model.destination).toMatchObject({
      roomLeft: 1579,
      roomLeftText: "$1,579",
    });
    expect(model.change).toMatchObject({
      amount: 79,
      text: "+$79",
      tone: "favorable",
    });
    expect(model.consequence).toMatchObject({
      headline: "$79 more room each month",
      detail: "The destination plan leaves $1,579 after monthly costs.",
      compact: "+$79 room · 2 estimates",
      openCount: 0,
    });
  });

  it("uses the First home estimate without turning it into a user override", () => {
    const draft = createBudgetDraft();
    const model = createBudgetEquationModel(
      draft.finances,
      draft.originSlug,
      draft.destinationSlug,
      2177,
    );

    expect(model.destination).toMatchObject({
      housing: 2177,
      housingSource: "movewise_estimate",
      roomLeft: 1602,
      roomLeftText: "$1,602",
    });
    expect(model.change).toMatchObject({ amount: 102, tone: "favorable" });
    expect(model.consequence).toMatchObject({
      estimateCount: 3,
      openCount: 0,
      compact: "+$102 room · 3 estimates",
    });
    expect(draft.finances.targetHousing).toBe("");
  });

  it("respects user overrides and includes an owner's retained-property impact", () => {
    const draft = createBudgetDraft();
    draft.finances.currentHousingTenure = "own";
    draft.finances.targetTakeHome = "5800";
    draft.finances.targetHousing = "2200";
    draft.finances.targetExpenses = "1900";
    draft.finances.retainedPropertyNet = "-300";
    const model = createBudgetEquationModel(
      draft.finances,
      draft.originSlug,
      draft.destinationSlug,
    );

    expect(model.destination).toMatchObject({
      takeHomeSource: "user_value",
      housingSource: "user_value",
      expensesSource: "user_value",
      retainedPropertyNet: -300,
      roomLeft: 1400,
    });
    expect(model.consequence.estimateCount).toBe(0);
  });

  it("never turns incomplete or invalid entries into zero-dollar facts", () => {
    const draft = createBudgetDraft();
    draft.finances.currentTakeHome = "not-a-number";
    draft.finances.currentHousing = "";
    const model = createBudgetEquationModel(
      draft.finances,
      draft.originSlug,
      draft.destinationSlug,
    );

    expect(model.current.roomLeft).toBeNull();
    expect(model.current.roomLeftText).toBe("Complete your month now");
    expect(model.destination.takeHome).toBeNull();
    expect(model.destination.expenses).toBe(1896);
    expect(model.consequence).toMatchObject({
      headline: "Complete your month now",
      compact: "Budget summary needs your current numbers",
    });
  });
});
