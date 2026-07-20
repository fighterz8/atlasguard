import { describe, expect, it } from "vitest";

import { createInitialWizardDraft } from "./model";
import { adaptWizardDraftToHouseholdAnswers } from "./household-answer-adapter";

describe("Wizard household-answer adapter", () => {
  it("derives the rent requirement from evaluated dollars instead of user opinion", () => {
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
        stopsMove: "yes",
        assessment: "strong_negative",
      },
      supportNetwork: {
        needed: "no",
        stopsMove: "",
        assessment: "unavailable",
      },
      requiredServices: {
        needed: "yes",
        stopsMove: "no",
        assessment: "negative",
      },
      carFreeAccess: {
        needed: "yes",
        stopsMove: "yes",
        assessment: "strong_positive",
      },
    };
    draft.finances.targetHousing = "1859";

    const result = adaptWizardDraftToHouseholdAnswers(draft);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.answers).toMatchObject({
      schemaVersion: "1.0.0",
      questionVersion: "4.0.0",
      mode: "individual",
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      factors: [
        {
          factorId: "space_fit",
          importance: "essential",
          impact: "unavailable",
          essentialStatus: "confirmed_met",
        },
        {
          factorId: "support_network",
          importance: "not_applicable",
          impact: "excluded",
          essentialStatus: null,
        },
        {
          factorId: "required_services_continuity",
          importance: "not_applicable",
          impact: "excluded",
          essentialStatus: null,
        },
        {
          factorId: "car_free_access",
          importance: "not_applicable",
          impact: "excluded",
          essentialStatus: null,
        },
      ],
    });
    expect(Object.isFrozen(result.answers)).toBe(true);
  });

  it("marks a non-negotiable rent ceiling unmet when the estimate exceeds it", () => {
    const draft = createInitialWizardDraft();
    draft.householdMode = "individual";
    Object.assign(draft.householdPlan.housing, {
      tenure: "rent",
      bedrooms: "3",
      maxMonthlyCost: "2200",
      stopsMove: "yes",
    });
    draft.finances.targetHousing = "2500";

    const result = adaptWizardDraftToHouseholdAnswers(draft);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.answers.factors[0]).toEqual({
      factorId: "space_fit",
      importance: "essential",
      impact: "unavailable",
      essentialStatus: "confirmed_unmet",
    });
  });

  it("fails closed when an applicable answer is incomplete", () => {
    const draft = createInitialWizardDraft();
    draft.householdMode = "family";

    expect(adaptWizardDraftToHouseholdAnswers(draft)).toEqual({
      success: false,
      errors: expect.objectContaining({
        "householdPlan.housing.tenure": expect.any(String),
        "householdPlan.housing.bedrooms": expect.any(String),
        "householdPlan.housing.maxMonthlyCost": expect.any(String),
      }),
    });
  });
});
