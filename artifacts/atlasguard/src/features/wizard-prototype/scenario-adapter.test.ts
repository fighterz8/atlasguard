import { describe, expect, it } from "vitest";

import {
  createInitialWizardDraft,
  type PriorityImportance,
  type WizardPrototypeDraft,
} from "./model";
import { enableExpenseWorksheet } from "./expense-worksheet";
import { adaptWizardDraftToScenarioInput } from "./scenario-adapter";

const validDraft = (): WizardPrototypeDraft => ({
  ...createInitialWizardDraft(),
  originSlug: "los-angeles-ca",
  destinationSlug: "seattle-wa",
  householdMode: "individual",
  householdPlan: {
    ...createInitialWizardDraft().householdPlan,
    housing: {
      tenure: "rent",
      type: "apartment_or_condo",
      bedrooms: "2",
      bathrooms: "1",
      maxMonthlyCost: "2000",
      stopsMove: "no",
    },
    supportNetwork: { relevance: "no", importance: "", status: "" },
    requiredServices: { relevance: "no", importance: "", status: "" },
    carFreeAccess: { relevance: "no", importance: "", status: "" },
  },
  finances: {
    ...createInitialWizardDraft().finances,
    currentHousingTenure: "own",
    currentTakeHome: "5,000",
    targetTakeHome: "5250",
    currentHousing: "2000",
    targetHousing: "1750",
    targetGrossIncomeKnown: true,
    targetGrossIncome: "7000",
    currentExpenses: "1500",
    targetExpenses: "1,250",
    retainedPropertyNet: "-400",
    targetHousingRangeMin: "1500",
    targetHousingRangeMax: "2000",
    targetExpensesRangeMin: "1000",
    targetExpensesRangeMax: "1500",
    retainedPropertyNetRangeMin: "-600",
    retainedPropertyNetRangeMax: "100",
    targetTakeHomeBasis: "confirmed",
    retainedPropertyNetBasis: "user_estimate",
  },
  commuteImportance: "important",
  climateHeatPreference: "fewer_hot_days",
  climateHeatImportance: "important",
});

describe("Wizard scenario adapter", () => {
  it("keeps evaluator input identical when a worksheet emits the same expense total", () => {
    const direct = validDraft();
    const brokenDown = validDraft();
    brokenDown.finances.expenseWorksheet = enableExpenseWorksheet("1500");

    expect(adaptWizardDraftToScenarioInput(brokenDown)).toEqual(
      adaptWizardDraftToScenarioInput(direct),
    );
  });

  it("uses a non-editable structural zero for renters", () => {
    const draft = validDraft();
    draft.finances.currentHousingTenure = "rent";
    draft.finances.retainedPropertyNet = "";
    draft.finances.retainedPropertyNetRangeMin = "";
    draft.finances.retainedPropertyNetRangeMax = "";

    const result = adaptWizardDraftToScenarioInput(draft);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.scenario.finances.destination.retainedPropertyNet).toEqual({
      monthlyCents: 0,
      basis: "confirmed",
      plausibleRangeCents: null,
    });
  });

  it("gives untouched daily-life answers zero decision weight", () => {
    const draft = validDraft();
    draft.commuteImportance = "";
    draft.climateHeatPreference = "";
    draft.climateHeatImportance = "";

    const result = adaptWizardDraftToScenarioInput(draft);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.scenario.priorities).toEqual([
      {
        priorityId: "climate_heat",
        preferredDirection: "lower",
        weight: 0,
      },
      {
        priorityId: "commute_time",
        preferredDirection: "lower",
        weight: 0,
      },
    ]);
  });

  it("converts reviewed whole-dollar values into canonical monthly cents", () => {
    const result = adaptWizardDraftToScenarioInput(validDraft());

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.scenario).toMatchObject({
      schemaVersion: "1.0.0",
      originMetroSlug: "los-angeles-ca",
      destinationMetroSlug: "seattle-wa",
      finances: {
        origin: {
          takeHomeIncome: {
            monthlyCents: 500_000,
            basis: "confirmed",
            plausibleRangeCents: null,
          },
          grossIncome: null,
        },
        destination: {
          takeHomeIncome: {
            monthlyCents: 525_000,
            basis: "confirmed",
            plausibleRangeCents: null,
          },
          grossIncome: {
            monthlyCents: 700_000,
            basis: "user_estimate",
            plausibleRangeCents: null,
          },
          retainedPropertyNet: {
            monthlyCents: -40_000,
            basis: "user_estimate",
            plausibleRangeCents: { min: -60_000, max: 10_000 },
          },
        },
      },
      priorities: [
        {
          priorityId: "climate_heat",
          preferredDirection: "lower",
          weight: 4,
        },
        {
          priorityId: "commute_time",
          preferredDirection: "lower",
          weight: 4,
        },
      ],
    });
  });

  it.each([
    ["must_have", 5],
    ["important", 4],
    ["nice_to_have", 2],
    ["does_not_matter", 0],
  ] satisfies Array<[PriorityImportance, number]>)(
    "maps %s commute importance to weight %i",
    (importance, weight) => {
      const draft = validDraft();
      draft.commuteImportance = importance;
      const result = adaptWizardDraftToScenarioInput(draft);

      expect(result.success).toBe(true);
      if (result.success)
        expect(
          result.scenario.priorities.find(
            ({ priorityId }) => priorityId === "commute_time",
          )?.weight,
        ).toBe(weight);
    },
  );

  it.each([
    ["fewer_hot_days", "lower", 4],
    ["more_hot_days", "higher", 4],
    ["does_not_matter", "lower", 0],
  ] as const)(
    "maps %s to an explicit climate direction and weight",
    (preference, direction, weight) => {
      const draft = validDraft();
      draft.climateHeatPreference = preference;
      const result = adaptWizardDraftToScenarioInput(draft);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(
        result.scenario.priorities.find(
          ({ priorityId }) => priorityId === "climate_heat",
        ),
      ).toMatchObject({ preferredDirection: direction, weight });
    },
  );

  it("adapts a reverse comparison from the promoted cohort", () => {
    const draft = validDraft();
    draft.originSlug = "seattle-wa";
    draft.destinationSlug = "los-angeles-ca";

    const result = adaptWizardDraftToScenarioInput(draft);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.scenario).toMatchObject({
      originMetroSlug: "seattle-wa",
      destinationMetroSlug: "los-angeles-ca",
    });
  });

  it("keeps confirmed assumptions range-free and converts reviewed estimates", () => {
    const result = adaptWizardDraftToScenarioInput(validDraft());

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.scenario.finances.origin.grossIncome).toBeNull();
    expect(result.scenario.finances.destination.grossIncome).toMatchObject({
      monthlyCents: 700_000,
      basis: "user_estimate",
    });
    expect(
      result.scenario.finances.destination.takeHomeIncome.plausibleRangeCents,
    ).toBeNull();
    expect(
      result.scenario.finances.destination.housingCost.plausibleRangeCents,
    ).toEqual({ min: 150_000, max: 200_000 });
  });

  it("preserves unknown destination gross income as null", () => {
    const draft = validDraft();
    draft.finances.targetGrossIncomeKnown = false;
    draft.finances.targetGrossIncome = "";

    const result = adaptWizardDraftToScenarioInput(draft);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.scenario.finances.destination.grossIncome).toBeNull();
    }
  });

  it("keeps point estimates valid when no uncertainty range is supplied", () => {
    const draft = validDraft();
    draft.finances.targetHousingRangeMin = "";
    draft.finances.targetHousingRangeMax = "";
    draft.finances.targetExpensesRangeMin = "";
    draft.finances.targetExpensesRangeMax = "";
    draft.finances.retainedPropertyNetRangeMin = "";
    draft.finances.retainedPropertyNetRangeMax = "";

    const result = adaptWizardDraftToScenarioInput(draft);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(
      result.scenario.finances.destination.housingCost.plausibleRangeCents,
    ).toBeNull();
    expect(
      result.scenario.finances.destination.recurringExpensesExcludingHousing
        .plausibleRangeCents,
    ).toBeNull();
    expect(
      result.scenario.finances.destination.retainedPropertyNet
        .plausibleRangeCents,
    ).toBeNull();
  });

  it("rejects amounts outside the canonical monthly domain", () => {
    const draft = validDraft();
    draft.finances.targetHousing = "100000001";
    draft.finances.targetHousingBasis = "confirmed";

    expect(adaptWizardDraftToScenarioInput(draft)).toEqual({
      success: false,
      errors: {
        "finances.targetHousing":
          "Amount must be between -$100,000,000 and $100,000,000.",
      },
    });
  });
});
