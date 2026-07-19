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
    expect(
      result.evaluation.decisionProfile.priorityChanges.find(
        ({ priorityId }) => priorityId === "climate_heat",
      ),
    ).toMatchObject({
      weight: 4,
      classification: "improves",
      utilityDeltaBps: 1_560,
    });
  });

  it("excludes commute without rejecting the verified benchmark", () => {
    const draft = reviewedDraft();
    draft.commuteImportance = "does_not_matter";

    const result = evaluateWizardDraft(draft);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(
      result.evaluation.scenarioInput.priorities.find(
        ({ priorityId }) => priorityId === "commute_time",
      ),
    ).toEqual({
      priorityId: "commute_time",
      preferredDirection: "lower",
      weight: 0,
    });
    expect(
      result.evaluation.decisionProfile.priorityChanges.find(
        ({ priorityId }) => priorityId === "commute_time",
      ),
    ).toMatchObject({
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

  it("reverses climate evidence when the user prefers more hot days", () => {
    const draft = reviewedDraft();
    draft.climateHeatPreference = "more_hot_days";
    const result = evaluateWizardDraft(draft);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(
      result.evaluation.decisionProfile.priorityChanges.find(
        ({ priorityId }) => priorityId === "climate_heat",
      ),
    ).toMatchObject({ classification: "worsens", utilityDeltaBps: -1_560 });
  });

  it("excludes climate when the user says it does not matter", () => {
    const draft = reviewedDraft();
    draft.climateHeatPreference = "does_not_matter";
    const result = evaluateWizardDraft(draft);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(
      result.evaluation.decisionProfile.priorityChanges.find(
        ({ priorityId }) => priorityId === "climate_heat",
      ),
    ).toMatchObject({ weight: 0, availability: "unavailable" });
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

  it("evaluates an Austin to San Diego move from the selected profiles", () => {
    const draft = reviewedDraft();
    draft.originSlug = "austin-tx";
    draft.destinationSlug = "san-diego-ca";

    const result = evaluateWizardDraft(draft);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.evaluation.decisionProfile.scenario).toMatchObject({
      origin: { slug: "austin-tx", cbsaCode: "12420" },
      destination: { slug: "san-diego-ca", cbsaCode: "41740" },
    });
    expect(
      result.evaluation.decisionProfile.evidence.find(
        (evidence) =>
          evidence.kind === "benchmark_metric" &&
          evidence.priorityId === "commute_time",
      ),
    ).toMatchObject({
      originValue: expect.closeTo(28.2097375862, 10),
      destinationValue: expect.closeTo(26.0618486909, 10),
    });
  });
});
