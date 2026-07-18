import { describe, expect, it } from "vitest";

import { createInitialWizardDraft, type WizardPrototypeDraft } from "./model";
import { evaluateWizardDraft } from "./evaluate-wizard-draft";

const reviewedDraft = (): WizardPrototypeDraft => ({
  ...createInitialWizardDraft(),
  originSlug: "los-angeles-ca",
  destinationSlug: "seattle-wa",
  finances: {
    ...createInitialWizardDraft().finances,
    currentTakeHome: "5000",
    targetTakeHome: "5250",
    currentHousing: "2000",
    targetHousing: "1750",
    currentExpenses: "1500",
    targetExpenses: "1250",
    retainedPropertyNet: "0",
    targetTakeHomeRangeMin: "5000",
    targetTakeHomeRangeMax: "5500",
    targetHousingRangeMin: "1500",
    targetHousingRangeMax: "2000",
    targetExpensesRangeMin: "1000",
    targetExpensesRangeMax: "1500",
    retainedPropertyNetRangeMin: "-250",
    retainedPropertyNetRangeMax: "250",
  },
  commuteImportance: "important",
});

describe("Wizard deterministic evaluation", () => {
  it("evaluates reviewed assumptions through the research-only trust boundary", () => {
    const result = evaluateWizardDraft(reviewedDraft());

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.evaluation.releaseStatus).toBe("research_only");
    expect(result.evaluation.resultMode).toBe("deterministic");
    expect(result.evaluation.scenarioInput.finances.destination).toMatchObject({
      takeHomeIncome: { monthlyCents: 525_000 },
      housingCost: { monthlyCents: 175_000 },
      recurringExpensesExcludingHousing: { monthlyCents: 125_000 },
      retainedPropertyNet: { monthlyCents: 0 },
    });
    expect(result.evaluation.decisionProfile.condition.value).toBe(
      "worth_a_closer_look",
    );
    expect(result.evaluation.decisionProfile.stability.level).not.toBe(
      "not_evaluated",
    );
  });

  it("excludes commute without rejecting the verified benchmark", () => {
    const draft = reviewedDraft();
    draft.commuteImportance = "does_not_matter";

    const result = evaluateWizardDraft(draft);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.evaluation.scenarioInput.priorities).toEqual([
      {
        priorityId: "commute_time",
        preferredDirection: "lower",
        weight: 0,
      },
    ]);
    expect(result.evaluation.decisionProfile.priorityChanges[0]).toMatchObject({
      priorityId: "commute_time",
      weight: 0,
      availability: "unavailable",
      transformationId: "not_evaluated",
      evidenceRefs: [],
    });
    expect(
      result.evaluation.decisionProfile.findings.omittedPriorities,
    ).toContain("commute_time");
  });

  it("returns validation errors without invoking a different data path", () => {
    const draft = reviewedDraft();
    draft.destinationSlug = "los-angeles-ca";

    expect(evaluateWizardDraft(draft)).toEqual({
      success: false,
      errors: {
        destinationSlug: "Origin and destination must be different locations.",
      },
    });
  });
});
