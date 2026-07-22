import { describe, expect, it } from "vitest";

import { createInitialWizardDraft } from "./model";
import { adaptWizardDraftToHouseholdAnswers } from "./household-answer-adapter";

describe("Wizard household-answer adapter", () => {
  it("maps the explicit status-board dimensions into the accepted rule contract", () => {
    const draft = createInitialWizardDraft();
    draft.householdMode = "individual";
    Object.assign(draft.householdPlan.housing, {
      tenure: "rent",
      type: "apartment_or_condo",
      bedrooms: "2",
      bathrooms: "1",
      maxMonthlyCost: "2200",
      ceilingType: "target",
      stopsMove: "no",
    });
    Object.assign(draft.householdPlan.supportNetwork, {
      relevance: "yes",
      importance: "blocker",
      status: "not_checked",
    });
    Object.assign(draft.householdPlan.requiredServices, {
      relevance: "yes",
      importance: "important",
      status: "does_not_work",
    });
    Object.assign(draft.householdPlan.carFreeAccess, {
      relevance: "no",
    });
    draft.finances.targetHousing = "1859";

    const result = adaptWizardDraftToHouseholdAnswers(draft);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.answers.factors.slice(1)).toEqual([
      {
        factorId: "support_network",
        importance: "essential",
        impact: "unavailable",
        essentialStatus: "unconfirmed",
      },
      {
        factorId: "required_services_continuity",
        importance: "important",
        impact: "negative",
        essentialStatus: null,
      },
      {
        factorId: "car_free_access",
        importance: "not_applicable",
        impact: "excluded",
        essentialStatus: null,
      },
    ]);
  });

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
        ceilingType: "hard",
        stopsMove: "yes",
        assessment: "strong_negative",
      },
      supportNetwork: {
        relevance: "no",
        importance: "",
        status: "",
      },
      requiredServices: {
        relevance: "yes",
        importance: "important",
        status: "does_not_work",
      },
      carFreeAccess: {
        relevance: "yes",
        importance: "blocker",
        status: "works",
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
          importance: "important",
          impact: "negative",
          essentialStatus: null,
        },
        {
          factorId: "car_free_access",
          importance: "essential",
          impact: "positive",
          essentialStatus: "confirmed_met",
        },
      ],
    });
    expect(Object.isFrozen(result.answers)).toBe(true);
  });

  it("maps family essentials into existing deterministic household signals", () => {
    const draft = createInitialWizardDraft();
    draft.householdMode = "family";
    Object.assign(draft.householdPlan.housing, {
      tenure: "rent",
      type: "apartment_or_condo",
      bedrooms: "3",
      bathrooms: "1",
      maxMonthlyCost: "2600",
      ceilingType: "target",
      stopsMove: "no",
    });
    draft.householdPlan.supportNetwork = {
      relevance: "yes",
      importance: "important",
      status: "works",
    };
    draft.householdPlan.childcare = {
      relevance: "yes",
      importance: "blocker",
      status: "not_checked",
      arrangement: "center",
    };
    draft.householdPlan.school = {
      relevance: "yes",
      importance: "blocker",
      status: "does_not_work",
      gradeBand: "elementary",
      preference: "public",
      requirements: "",
    };
    draft.householdPlan.requiredServices = {
      relevance: "yes",
      importance: "important",
      status: "not_checked",
    };
    draft.householdPlan.carFreeAccess = {
      relevance: "no",
      importance: "",
      status: "",
    };
    draft.finances.targetHousing = "2400";

    const result = adaptWizardDraftToHouseholdAnswers(draft);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.answers.factors).toEqual([
      {
        factorId: "space_fit",
        importance: "important",
        impact: "unavailable",
        essentialStatus: null,
      },
      {
        factorId: "support_network",
        importance: "important",
        impact: "positive",
        essentialStatus: null,
      },
      {
        factorId: "childcare_continuity",
        importance: "essential",
        impact: "unavailable",
        essentialStatus: "unconfirmed",
      },
      {
        factorId: "school_continuity",
        importance: "essential",
        impact: "negative",
        essentialStatus: "confirmed_unmet",
      },
      {
        factorId: "required_services_continuity",
        importance: "important",
        impact: "unavailable",
        essentialStatus: null,
      },
      {
        factorId: "car_free_access",
        importance: "not_applicable",
        impact: "excluded",
        essentialStatus: null,
      },
    ]);
  });

  it("marks a non-negotiable rent ceiling unmet when the estimate exceeds it", () => {
    const draft = createInitialWizardDraft();
    draft.householdMode = "individual";
    Object.assign(draft.householdPlan.housing, {
      tenure: "rent",
      type: "apartment_or_condo",
      bedrooms: "3",
      bathrooms: "1",
      maxMonthlyCost: "2200",
      ceilingType: "hard",
      stopsMove: "yes",
    });
    draft.householdPlan.supportNetwork.relevance = "no";
    draft.householdPlan.requiredServices.relevance = "no";
    draft.householdPlan.carFreeAccess.relevance = "no";
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
        "householdPlan.supportNetwork.relevance": expect.any(String),
        "householdPlan.childcare.relevance": expect.any(String),
        "householdPlan.school.relevance": expect.any(String),
        "householdPlan.requiredServices.relevance": expect.any(String),
        "householdPlan.carFreeAccess.relevance": expect.any(String),
      }),
    });
  });
});
