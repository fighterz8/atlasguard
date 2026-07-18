import { describe, expect, it } from "vitest";

import {
  createInitialWizardDraft,
  type PriorityImportance,
  type WizardPrototypeDraft,
} from "./model";
import { adaptWizardDraftToScenarioInput } from "./scenario-adapter";

const validDraft = (): WizardPrototypeDraft => ({
  ...createInitialWizardDraft(),
  originSlug: "los-angeles-ca",
  destinationSlug: "seattle-wa",
  finances: {
    ...createInitialWizardDraft().finances,
    currentTakeHome: "5,000",
    targetTakeHome: "5250",
    currentHousing: "2000",
    targetHousing: "1750",
    currentExpenses: "1500",
    targetExpenses: "1,250",
    retainedPropertyNet: "-400",
    targetTakeHomeBasis: "confirmed",
    retainedPropertyNetBasis: "user_estimate",
  },
  commuteImportance: "important",
});

describe("Wizard scenario adapter", () => {
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
          grossIncome: null,
          retainedPropertyNet: {
            monthlyCents: -40_000,
            basis: "user_estimate",
            plausibleRangeCents: null,
          },
        },
      },
      priorities: [
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
        expect(result.scenario.priorities[0].weight).toBe(weight);
    },
  );

  it("fails closed for the unsupported reverse comparison", () => {
    const draft = validDraft();
    draft.originSlug = "seattle-wa";
    draft.destinationSlug = "los-angeles-ca";

    expect(adaptWizardDraftToScenarioInput(draft)).toEqual({
      success: false,
      errors: {
        destinationSlug:
          "This research slice currently supports Los Angeles to Seattle only.",
      },
    });
  });

  it("does not fabricate gross income or plausible ranges", () => {
    const result = adaptWizardDraftToScenarioInput(validDraft());

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.scenario.finances.origin.grossIncome).toBeNull();
    expect(result.scenario.finances.destination.grossIncome).toBeNull();
    expect(
      result.scenario.finances.destination.housingCost.plausibleRangeCents,
    ).toBeNull();
  });

  it("rejects amounts outside the canonical monthly domain", () => {
    const draft = validDraft();
    draft.finances.targetHousing = "100000001";

    expect(adaptWizardDraftToScenarioInput(draft)).toEqual({
      success: false,
      errors: {
        "finances.targetHousing":
          "Amount must be between -$100,000,000 and $100,000,000.",
      },
    });
  });
});
