import { describe, expect, it } from "vitest";

import { createInitialWizardDraft } from "./model";
import { saveMoveWiseDraft } from "./wizard-draft-storage";
import { restoreMoveWiseSession } from "./wizard-session-state";

const memoryStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
};

const reviewedDraft = () => {
  const draft = createInitialWizardDraft();
  draft.originSlug = "san-diego-ca";
  draft.destinationSlug = "austin-tx";
  draft.householdMode = "individual";
  draft.finances.currentHousingTenure = "rent";
  draft.finances.currentTakeHome = "6200";
  draft.finances.currentHousing = "2600";
  draft.finances.currentExpenses = "2100";
  draft.commuteImportance = "important";
  draft.climateHeatPreference = "fewer_hot_days";
  draft.climateHeatImportance = "important";
  draft.householdPlan.housing.tenure = "rent";
  draft.householdPlan.housing.type = "apartment_or_condo";
  draft.householdPlan.housing.bedrooms = "2";
  draft.householdPlan.housing.bathrooms = "1";
  draft.householdPlan.housing.maxMonthlyCost = "2600";
  draft.householdPlan.housing.ceilingType = "target";
  draft.householdPlan.housing.stopsMove = "no";
  draft.householdPlan.housing.assessment = "neutral";
  draft.householdPlan.supportNetwork.relevance = "no";
  draft.householdPlan.requiredServices.relevance = "no";
  draft.householdPlan.carFreeAccess.relevance = "no";
  return draft;
};

describe("MoveWise session restoration", () => {
  it("rebuilds review state from the saved user draft", () => {
    const storage = memoryStorage();
    const draft = reviewedDraft();
    saveMoveWiseDraft(storage, {
      draft,
      verificationTasks: [],
      view: "review",
      savedAt: "2026-07-22T04:10:00.000Z",
    });

    const restored = restoreMoveWiseSession(storage);

    expect(restored).toMatchObject({
      status: "wizard",
      step: "review",
      savedAt: "2026-07-22T04:10:00.000Z",
      reviewModel: { routeLabel: "San Diego to Austin" },
    });
  });

  it("recomputes results instead of trusting persisted judgments", () => {
    const storage = memoryStorage();
    const draft = reviewedDraft();
    saveMoveWiseDraft(storage, {
      draft,
      verificationTasks: [],
      view: "results",
      savedAt: "2026-07-22T04:10:00.000Z",
    });

    const restored = restoreMoveWiseSession(storage);

    expect(restored).toMatchObject({
      status: "results",
      draft,
      savedAt: "2026-07-22T04:10:00.000Z",
      resultModel: {
        route: { originCity: "San Diego", destinationCity: "Austin" },
      },
      verificationTasks: [],
    });
    if (restored.status !== "results") return;
    expect(restored.evaluation.scenarioInput.schemaVersion).toBe("1.0.0");
  });

  it("fails closed when a structurally valid draft cannot support its saved view", () => {
    const storage = memoryStorage();
    saveMoveWiseDraft(storage, {
      draft: createInitialWizardDraft(),
      verificationTasks: [],
      view: "results",
      savedAt: "2026-07-22T04:10:00.000Z",
    });

    expect(restoreMoveWiseSession(storage)).toEqual({
      status: "invalid",
      reason: "invalid_progress",
    });
  });
});
