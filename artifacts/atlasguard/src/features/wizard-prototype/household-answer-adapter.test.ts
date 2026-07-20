import { describe, expect, it } from "vitest";

import { createInitialWizardDraft } from "./model";
import { adaptWizardDraftToHouseholdAnswers } from "./household-answer-adapter";

describe("Wizard household-answer adapter", () => {
  it("creates canonical verified individual answers", () => {
    const draft = createInitialWizardDraft();
    draft.householdMode = "individual";
    draft.householdPlan = {
      ...draft.householdPlan,
      housing: {
        tenure: "rent",
        type: "apartment_or_condo",
        bedrooms: "2",
        bathrooms: "1",
        maxMonthlyCost: "2200",
        stopsMove: "no",
      },
      supportNetwork: { needed: "no", stopsMove: "" },
      requiredServices: { needed: "yes", stopsMove: "no" },
      carFreeAccess: { needed: "yes", stopsMove: "yes" },
    };

    const result = adaptWizardDraftToHouseholdAnswers(draft);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.answers).toMatchObject({
      schemaVersion: "1.0.0",
      questionVersion: "2.0.0",
      mode: "individual",
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      factors: [
        {
          factorId: "space_fit",
          importance: "important",
          impact: "unavailable",
          essentialStatus: null,
        },
        {
          factorId: "support_network",
          importance: "not_applicable",
          impact: "excluded",
          essentialStatus: null,
        },
        {
          factorId: "required_services_continuity",
          importance: "important",
          impact: "unavailable",
          essentialStatus: null,
        },
        {
          factorId: "car_free_access",
          importance: "essential",
          impact: "unavailable",
          essentialStatus: "unconfirmed",
        },
      ],
    });
    expect(Object.isFrozen(result.answers)).toBe(true);
  });

  it("fails closed when an applicable answer is incomplete", () => {
    const draft = createInitialWizardDraft();
    draft.householdMode = "family";

    expect(adaptWizardDraftToHouseholdAnswers(draft)).toEqual({
      success: false,
      errors: expect.objectContaining({
        "householdPlan.housing.tenure": expect.any(String),
        "householdPlan.childcare.needed": expect.any(String),
      }),
    });
  });
});
