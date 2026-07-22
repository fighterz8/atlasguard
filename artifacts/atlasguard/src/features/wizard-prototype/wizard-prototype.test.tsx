import { describe, expect, it } from "vitest";

import { createInitialWizardDraft } from "./model";
import { createMovePictureModel } from "./wizard-prototype";

const createStartedDraft = () => {
  const draft = createInitialWizardDraft();
  draft.originSlug = "san-diego-ca";
  draft.destinationSlug = "austin-tx";
  draft.householdMode = "family";
  draft.finances.currentHousingTenure = "rent";
  draft.finances.currentTakeHome = "6200";
  draft.finances.currentHousing = "2600";
  draft.finances.currentExpenses = "2100";
  draft.finances.retainedPropertyNet = "0";
  draft.householdPlan.housing.maxMonthlyCost = "2800";
  draft.householdPlan.housing.stopsMove = "yes";
  return draft;
};

describe("WizardPrototype", () => {
  it("builds a live move picture from the current draft", () => {
    const model = createMovePictureModel(createStartedDraft(), "money", null);

    expect(model).toMatchObject({
      route: "San Diego to Austin",
      flowLabel: "Collecting facts",
      currentCushion: "$1,500",
      rentCeiling: "$2,800/mo",
      destinationAssumptions: "0/3 money assumptions",
      familyChecks: "1 hard-stop check",
    });
  });
});
