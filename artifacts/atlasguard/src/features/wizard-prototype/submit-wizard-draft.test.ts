import { describe, expect, it } from "vitest";

import { createInitialWizardDraft, type WizardPrototypeDraft } from "./model";
import { submitWizardDraft } from "./submit-wizard-draft";

const reviewedDraft = (): WizardPrototypeDraft => {
  const draft = createInitialWizardDraft();
  draft.originSlug = "san-diego-ca";
  draft.destinationSlug = "austin-tx";
  draft.householdMode = "individual";
  draft.finances.currentTakeHome = "6,200";
  draft.finances.currentHousing = "2,600";
  draft.finances.currentExpenses = "2,100";
  draft.householdPlan.housing = {
    tenure: "rent",
    type: "apartment_or_condo",
    bedrooms: "2",
    bathrooms: "1",
    maxMonthlyCost: "2600",
    stopsMove: "no",
  };
  draft.householdPlan.supportNetwork = { needed: "no", stopsMove: "" };
  draft.householdPlan.requiredServices = { needed: "no", stopsMove: "" };
  draft.householdPlan.carFreeAccess = { needed: "no", stopsMove: "" };
  return draft;
};

describe("Wizard submission routing", () => {
  it("routes a current-only draft to an unscored destination plan", () => {
    const result = submitWizardDraft(reviewedDraft());

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.kind).toBe("preliminary");
    if (result.kind !== "preliminary") return;
    expect(result.plan).toMatchObject({
      route: {
        origin: "San Diego, CA",
        destination: "Austin, TX",
      },
      score: {
        available: false,
        label: "Deterministic score not ready",
      },
      currentBaseline: [
        {
          id: "take_home",
          value: "$6,200",
          provenance: "You told us",
        },
        {
          id: "housing",
          value: "$2,600",
          provenance: "You told us",
        },
        {
          id: "recurring_expenses",
          value: "$2,100",
          provenance: "You told us",
        },
      ],
    });
    expect(result.plan.availableEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "metro_rent_context",
          provenance: "MoveWise calculated",
          boundary: "Area context—not your budget",
        }),
      ]),
    );
    expect(result.plan.missingEstimates.map(({ id }) => id)).toEqual([
      "destination_take_home",
      "destination_housing",
      "destination_recurring_expenses",
      "destination_gross_income",
    ]);
    expect(
      result.plan.missingEstimates.every(
        ({ provenance }) => provenance === "Needs confirmation",
      ),
    ).toBe(true);
    expect("evaluation" in result).toBe(false);
  });

  it("preserves the deterministic rule 0.2.0 path for complete overrides", () => {
    const draft = reviewedDraft();
    draft.finances.targetTakeHome = "6,500";
    draft.finances.targetHousing = "2,200";
    draft.finances.targetExpenses = "1,900";

    const result = submitWizardDraft(draft);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.kind).toBe("deterministic");
    if (result.kind !== "deterministic") return;
    expect(result.deterministicAnalysis.ruleVersion).toBe("0.2.0");
    expect(result.evaluation.scenarioInput.finances.destination).toMatchObject({
      takeHomeIncome: { monthlyCents: 650_000 },
      housingCost: { monthlyCents: 220_000 },
      recurringExpensesExcludingHousing: { monthlyCents: 190_000 },
    });
  });

  it("fails closed for a partial destination override", () => {
    const draft = reviewedDraft();
    draft.finances.targetHousing = "2,200";

    expect(submitWizardDraft(draft)).toEqual({
      success: false,
      errors: expect.objectContaining({
        "finances.targetTakeHome":
          "Destination take-home is required to use your own destination numbers.",
        "finances.targetExpenses":
          "Destination recurring expenses are required to use your own destination numbers.",
      }),
    });
  });
});
