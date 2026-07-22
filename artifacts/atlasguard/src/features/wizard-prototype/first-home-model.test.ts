import { describe, expect, it } from "vitest";

import { createInitialWizardDraft } from "./model";
import { createFirstHomeModel } from "./first-home-model";

describe("First home model", () => {
  it("keeps the public planning rent separate from the household ceiling", () => {
    const draft = createInitialWizardDraft();
    draft.originSlug = "san-diego-ca";
    draft.destinationSlug = "austin-tx";
    Object.assign(draft.householdPlan.housing, {
      bedrooms: "4_plus",
      maxMonthlyCost: "2800",
      ceilingType: "target",
    });

    expect(createFirstHomeModel(draft)).toMatchObject({
      destinationCity: "Austin",
      estimate: {
        monthlyDollars: 2491,
        origin: "movewise",
        evidenceStatus: "estimated",
      },
      ceiling: {
        monthlyDollars: 2800,
        type: "target",
        gapDollars: 309,
        direction: "under",
        conflict: false,
        blocker: false,
      },
    });
  });

  it("keeps a hard-ceiling breach visible without substituting the ceiling for rent", () => {
    const draft = createInitialWizardDraft();
    draft.originSlug = "san-diego-ca";
    draft.destinationSlug = "austin-tx";
    Object.assign(draft.householdPlan.housing, {
      bedrooms: "4_plus",
      maxMonthlyCost: "2200",
      ceilingType: "hard",
    });

    const model = createFirstHomeModel(draft);

    expect(model.estimate?.monthlyDollars).toBe(2491);
    expect(model.ceiling).toMatchObject({
      monthlyDollars: 2200,
      gapDollars: -291,
      direction: "over",
      conflict: true,
      blocker: true,
    });
  });

  it("keeps an uncertain ceiling meaning open rather than silently treating it as hard", () => {
    const draft = createInitialWizardDraft();
    draft.originSlug = "san-diego-ca";
    draft.destinationSlug = "austin-tx";
    Object.assign(draft.householdPlan.housing, {
      bedrooms: "2",
      maxMonthlyCost: "2000",
      ceilingType: "not_sure",
    });

    expect(createFirstHomeModel(draft).ceiling).toMatchObject({
      type: "not_sure",
      meaningOpen: true,
      blocker: false,
    });
  });
});
