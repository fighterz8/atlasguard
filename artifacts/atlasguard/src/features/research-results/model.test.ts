import { describe, expect, it } from "vitest";

import {
  createResearchResultsViewModel,
  createResearchWhatIfViewModel,
} from "./model";
import { evaluateWizardDraft } from "../wizard-prototype/evaluate-wizard-draft";
import {
  createInitialWizardDraft,
  type WizardPrototypeDraft,
} from "../wizard-prototype/model";

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
    retainedPropertyNet: "-100",
  },
  commuteImportance: "important",
});

describe("research results view model", () => {
  it("renders only the canonical research evaluation", () => {
    const model = createResearchResultsViewModel();

    expect(model.releaseStatus).toBe("research_only");
    expect(model.route.originCity).toBe("Los Angeles");
    expect(model.route.destinationCity).toBe("Seattle");
    expect(model.condition.label).toBe("No clear advantage yet");
    expect(model.confidence.level).toBe("limited");
    expect(model.stability.level).toBe("assumption_sensitive");
  });

  it("keeps illustrative finances separate from the benchmark metric", () => {
    const model = createResearchResultsViewModel();

    expect(model.finances.origin.cushion).toBe("$1,500");
    expect(model.finances.destination.cushion).toBe("$1,500");
    expect(model.finances.cushionDelta).toBe("$0");
    expect(model.priority.originValue).toBe("30.7 min");
    expect(model.priority.destinationValue).toBe("30.0 min");
    expect(model.priority.classification).toBe("similar");
    expect(model.housingContext.decisionUse).toBe("context_only");
    expect(model.housingContext.boundary).toBe("Area context—not your budget");
    expect(model.housingContext.originValue).toBe("$2,114");
    expect(model.housingContext.destinationValue).toBe("$2,050");
    expect(model.housingContext.delta).toBe("-$64");
    expect(model.condition.label).toBe("No clear advantage yet");
    expect(model.finances.origin.housing).toBe("$2,000");
    expect(model.finances.destination.housing).toBe("$2,000");
  });

  it("exposes verifiable source lineage", () => {
    const model = createResearchResultsViewModel();

    expect(model.evidence.publisher).toBe("U.S. Census Bureau");
    expect(model.evidence.observationPeriod).toBe("2024 ACS 1-year estimates");
    expect(model.evidence.snapshotSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(model.evidence.rawSnapshotSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(model.nextSteps).toHaveLength(3);
    expect(model.housingContext.evidence.tableId).toBe("B25064");
    expect(model.housingContext.evidence.snapshotSha256).toMatch(
      /^[a-f0-9]{64}$/,
    );
  });

  it("renders a verified user-reviewed evaluation without hidden inputs", () => {
    const evaluation = evaluateWizardDraft(reviewedDraft());
    expect(evaluation.success).toBe(true);
    if (!evaluation.success) return;

    const model = createResearchResultsViewModel(evaluation.evaluation);

    expect(model.finances.origin.gross).toBe("Not available");
    expect(model.finances.destination.gross).toBe("Not available");
    expect(model.finances.destination.takeHome).toBe("$5,250");
    expect(model.finances.destination.housing).toBe("$1,750");
    expect(model.finances.destination.retainedPropertyNet).toBe("-$100");
    expect(model.stability.level).toBe("not_evaluated");
  });

  it("exposes exact favorable thresholds inside the declared ranges", () => {
    const model = createResearchWhatIfViewModel();

    expect(model.controls).toHaveLength(3);
    expect(model.changed).toBe(false);
    expect(model.result.condition.label).toBe("No clear advantage yet");
    expect(model.thresholds).toEqual([
      expect.objectContaining({
        label: "Take-home income",
        operator: "at least",
        threshold: "$5,250",
      }),
      expect.objectContaining({
        label: "Housing",
        operator: "at or below",
        threshold: "$1,750",
      }),
      expect.objectContaining({
        label: "Recurring expenses",
        operator: "at or below",
        threshold: "$1,250",
      }),
    ]);
  });

  it("reevaluates the canonical decision when an assumption changes", () => {
    const model = createResearchWhatIfViewModel({
      takeHomeIncomeCents: 500_000,
      housingCostCents: 175_000,
      recurringExpensesCents: 150_000,
    });

    expect(model.changed).toBe(true);
    expect(model.result.condition.label).toBe("Worth a closer look");
    expect(model.result.monthlyCushion).toBe("$1,750");
    expect(model.result.cushionDelta).toBe("$250");
    expect(model.result.classification).toBe("improves");
  });
});
