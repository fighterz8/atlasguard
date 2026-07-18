import { describe, expect, it } from "vitest";

import {
  createInitialWizardDraft,
  createReviewRows,
  getNextStep,
  getPreviousStep,
  validateWizardStep,
} from "./model";

const validDraft = () => ({
  ...createInitialWizardDraft(),
  originSlug: "los-angeles-ca" as const,
  destinationSlug: "seattle-wa" as const,
  finances: {
    ...createInitialWizardDraft().finances,
    currentTakeHome: "5000",
    targetTakeHome: "5,250",
    currentHousing: "2000",
    targetHousing: "1750",
    currentExpenses: "1500",
    targetExpenses: "1500",
  },
});

describe("Wizard prototype model", () => {
  it("requires two different supported locations", () => {
    const empty = createInitialWizardDraft();
    expect(validateWizardStep("move", empty)).toEqual({
      originSlug: "Choose your current location.",
      destinationSlug: "Choose the location you are considering.",
    });

    const same = {
      ...empty,
      originSlug: "seattle-wa" as const,
      destinationSlug: "seattle-wa" as const,
    };
    expect(validateWizardStep("move", same).destinationSlug).toBe(
      "Origin and destination must be different locations.",
    );
  });

  it("reports specific money-field errors", () => {
    const draft = validDraft();
    draft.finances.targetTakeHome = "12.50";
    draft.finances.targetHousing = "-1";

    expect(validateWizardStep("money", draft)).toMatchObject({
      "finances.targetTakeHome":
        "Target take-home income must be a whole-dollar amount.",
      "finances.targetHousing": "Target housing cost cannot be negative.",
    });
  });

  it("does not advance when the current step is invalid", () => {
    expect(getNextStep("move", createInitialWizardDraft()).step).toBe("move");
    expect(getNextStep("move", validDraft())).toEqual({
      step: "money",
      errors: {},
    });
  });

  it("moves backward without mutating the draft", () => {
    const draft = validDraft();
    const before = structuredClone(draft);

    expect(getPreviousStep("review")).toBe("priorities");
    expect(draft).toEqual(before);
  });

  it("builds a provenance-aware assumption review", () => {
    const rows = createReviewRows(validDraft());

    expect(rows).toContainEqual({
      group: "Money",
      label: "Target take-home income",
      value: "$5,250/month",
      basis: "user_estimate",
      source: "manual_entry",
    });
    expect(rows).toContainEqual({
      group: "Move",
      label: "Destination",
      value: "Seattle, WA",
      basis: "manual_entry",
      source: "manual_entry",
    });
  });
});
