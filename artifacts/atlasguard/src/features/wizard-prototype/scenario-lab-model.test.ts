import { describe, expect, it } from "vitest";

import { createInitialWizardDraft } from "./model";
import {
  applyScenarioLabValues,
  createInitialScenarioLabDraft,
  createScenarioLabModel,
} from "./scenario-lab-model";

const reviewedDraft = () => {
  const draft = createInitialWizardDraft();
  draft.originSlug = "san-diego-ca";
  draft.destinationSlug = "austin-tx";
  draft.householdMode = "individual";
  draft.finances.currentHousingTenure = "rent";
  draft.finances.currentTakeHome = "6200";
  draft.finances.currentHousing = "2600";
  draft.finances.currentExpenses = "2100";
  draft.householdPlan.housing = {
    tenure: "rent",
    type: "apartment_or_condo",
    bedrooms: "2",
    bathrooms: "1",
    maxMonthlyCost: "2600",
    ceilingType: "target",
    stopsMove: "no",
    assessment: "unavailable",
  };
  draft.householdPlan.supportNetwork = {
    relevance: "no",
    importance: "",
    status: "",
  };
  draft.householdPlan.requiredServices = {
    relevance: "no",
    importance: "",
    status: "",
  };
  draft.householdPlan.carFreeAccess = {
    relevance: "no",
    importance: "",
    status: "",
  };
  return draft;
};

describe("MoveWise Scenario lab model", () => {
  it("creates an immutable named baseline from the evaluated brief", () => {
    const baselineDraft = reviewedDraft();
    const original = structuredClone(baselineDraft);

    const initial = createInitialScenarioLabDraft(baselineDraft);

    expect(initial.success).toBe(true);
    if (!initial.success) return;
    expect(initial.draft).toEqual({
      name: "",
      values: {
        takeHomeIncomeCents: 567_500,
        housingCostCents: 185_900,
        recurringExpensesCents: 189_600,
        retainedPropertyNetCents: 0,
      },
    });
    expect(initial.baseline).toMatchObject({
      name: "Current brief",
      route: "San Diego to Austin",
      fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      outlook: expect.any(String),
      readiness: expect.any(String),
      evidenceConfidence: expect.any(String),
    });
    expect(baselineDraft).toEqual(original);
  });

  it("shows explicit deltas and canonical recalculated states without mutating the baseline", () => {
    const baselineDraft = reviewedDraft();
    const original = structuredClone(baselineDraft);
    const initial = createInitialScenarioLabDraft(baselineDraft);
    expect(initial.success).toBe(true);
    if (!initial.success) return;

    const comparison = createScenarioLabModel(baselineDraft, {
      name: "Lower-rent option",
      values: {
        ...initial.draft.values,
        housingCostCents: 165_000,
      },
    });

    expect(comparison.success).toBe(true);
    if (!comparison.success) return;
    expect(comparison.model.changed).toBe(true);
    expect(comparison.model.canMakeActive).toBe(true);
    expect(comparison.model.deltas).toEqual([
      expect.objectContaining({
        id: "housingCostCents",
        label: "Destination housing",
        baseline: "$1,859",
        scenario: "$1,650",
        difference: "$209 lower",
      }),
    ]);
    expect(comparison.model.scenario).toMatchObject({
      name: "Lower-rent option",
      fingerprint: expect.not.stringMatching(
        new RegExp(`^${comparison.model.baseline.fingerprint}$`),
      ),
      outlook: expect.any(String),
      readiness: expect.any(String),
      evidenceConfidence: expect.any(String),
    });
    expect(comparison.model.thresholds.length).toBeGreaterThan(0);
    expect(baselineDraft).toEqual(original);
  });

  it("requires a name and a material delta before activation", () => {
    const baselineDraft = reviewedDraft();
    const initial = createInitialScenarioLabDraft(baselineDraft);
    expect(initial.success).toBe(true);
    if (!initial.success) return;

    const unnamed = createScenarioLabModel(baselineDraft, {
      name: "  ",
      values: {
        ...initial.draft.values,
        housingCostCents: 165_000,
      },
    });
    expect(unnamed.success).toBe(true);
    if (!unnamed.success) return;
    expect(unnamed.model.canMakeActive).toBe(false);
    expect(unnamed.model.nameError).toBe("Name this scenario to continue.");

    const unchanged = createScenarioLabModel(baselineDraft, {
      name: "Same plan",
      values: initial.draft.values,
    });
    expect(unchanged.success).toBe(true);
    if (!unchanged.success) return;
    expect(unchanged.model.changed).toBe(false);
    expect(unchanged.model.canMakeActive).toBe(false);
  });

  it("promotes only changed values and leaves MoveWise baseline estimates intact", () => {
    const baselineDraft = reviewedDraft();
    const original = structuredClone(baselineDraft);
    const initial = createInitialScenarioLabDraft(baselineDraft);
    expect(initial.success).toBe(true);
    if (!initial.success) return;

    const activeDraft = applyScenarioLabValues(
      baselineDraft,
      initial.draft.values,
      {
        ...initial.draft.values,
        housingCostCents: 165_000,
      },
    );

    expect(activeDraft.finances).toMatchObject({
      targetTakeHome: "",
      targetHousing: "1650",
      targetExpenses: "",
      targetHousingBasis: "user_estimate",
      targetHousingRangeMin: "",
      targetHousingRangeMax: "",
    });
    expect(baselineDraft).toEqual(original);
  });
});
