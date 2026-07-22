import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { createInitialWizardDraft } from "./model";
import { createMoveWiseReviewModel } from "./review-model";
import { ReviewStep } from "./review-step";
import { createResearchResultsViewModel } from "../research-results/model";
import { submitWizardDraft } from "./submit-wizard-draft";

const reviewedDraft = () => {
  const draft = createInitialWizardDraft();
  draft.originSlug = "san-diego-ca";
  draft.destinationSlug = "austin-tx";
  draft.householdMode = "family";
  draft.finances.currentHousingTenure = "rent";
  draft.finances.currentTakeHome = "6,200";
  draft.finances.currentHousing = "2,600";
  draft.finances.currentExpenses = "2,100";
  draft.householdPlan.housing = {
    tenure: "rent_then_buy",
    type: "apartment_or_condo",
    bedrooms: "4_plus",
    bathrooms: "2",
    maxMonthlyCost: "2800",
    ceilingType: "hard",
    stopsMove: "yes",
    assessment: "unavailable",
  };
  draft.householdPlan.supportNetwork = {
    relevance: "no",
    importance: "",
    status: "",
  };
  draft.householdPlan.childcare.relevance = "no";
  draft.householdPlan.school.relevance = "no";
  draft.householdPlan.requiredServices = {
    relevance: "no",
    importance: "",
    status: "",
  };
  draft.householdPlan.carFreeAccess = {
    relevance: "no",
    importance: "",
    status: "",
  };
  return draft;
};

describe("MoveWise review step", () => {
  it("builds the pre-result public findings from existing evidence", () => {
    const result = createMoveWiseReviewModel(reviewedDraft());

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.model.routeLabel).toBe("San Diego to Austin");
    expect(result.model.housingStage).toBe("Renting first");
    expect(result.model.housingLaterPlan).toBe(
      "Buying later stays on the checklist",
    );
    expect(result.model.scoringScope).toBe(
      "First-stage rent and monthly budget",
    );
    expect(result.model.findings.map((finding) => finding.id)).toEqual([
      "destination-income",
      "bedroom-rent-fit",
      "rental-supply",
      "rent-ceiling-fit",
      "ownership-later",
      "recurring-expenses",
      "family-operating-costs",
      "household-essentials",
      "climate-risk-context",
      "daily-life-friction",
      "monthly-cushion",
      "biggest-caveat",
    ]);
    expect(result.model.findings[1]).toMatchObject({
      label: "Rent for the home size you need",
      role: "Scored",
      tone: "favorable",
      group: "best_signs",
    });
    expect(
      result.model.findings.find(({ id }) => id === "household-essentials"),
    ).toMatchObject({ group: "family_checks" });
    expect(result.model.assumptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Destination rent",
          value: "$2,491",
          origin: "movewise",
          evidenceStatus: "estimated",
          role: "Scored",
        }),
        expect.objectContaining({
          label: "Rent ceiling",
          value: "$2,800",
          role: "Scored",
        }),
      ]),
    );

    expect(result.model.openChecks.map(({ id }) => id)).toEqual([
      "budget.destination.take-home",
      "budget.destination.housing",
      "budget.destination.recurring-expenses",
      "budget.destination.gross-income",
    ]);
    expect(result.model.decisionGate).toMatchObject({
      counts: {
        known: 3,
        estimated: 3,
        unknown: 1,
        conflict: 0,
        blocked: 0,
      },
      readiness: { state: "preliminary", label: "Preliminary" },
      evidenceConfidence: { level: "limited", label: "Limited" },
    });

    const submission = submitWizardDraft(reviewedDraft());
    expect(submission.success).toBe(true);
    if (!submission.success) return;
    const results = createResearchResultsViewModel(submission.evaluation, {
      analysis: submission.deterministicAnalysis,
      householdAnswers: submission.householdAnswers,
      destinationAssumptions: submission.destinationAssumptions,
    });
    expect(results.brief.openChecks.map(({ id }) => id)).toEqual(
      result.model.openChecks.map(({ id }) => id),
    );
    expect(results.brief.decisionGate).toEqual(result.model.decisionGate);
    expect(results.brief.readiness.label).toBe("Preliminary");
    expect(results.brief.evidenceConfidence.label).toBe("Limited");
  });

  it("keeps value origin independent from evidence status", () => {
    const draft = reviewedDraft();
    Object.assign(draft.finances, {
      targetTakeHome: "6100",
      targetTakeHomeBasis: "confirmed",
      targetHousing: "2400",
      targetHousingBasis: "user_estimate",
      targetExpenses: "1900",
      targetExpensesBasis: "confirmed",
      targetGrossIncomeKnown: true,
      targetGrossIncome: "9000",
      targetGrossIncomeBasis: "confirmed",
    });

    const result = createMoveWiseReviewModel(draft);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(
      result.model.assumptions.find(({ id }) => id === "take-home"),
    ).toMatchObject({ origin: "user", evidenceStatus: "verified" });
    expect(
      result.model.assumptions.find(({ id }) => id === "housing"),
    ).toMatchObject({ origin: "user", evidenceStatus: "estimated" });
    expect(
      result.model.assumptions.find(({ id }) => id === "expenses"),
    ).toMatchObject({ origin: "user", evidenceStatus: "verified" });
    expect(result.model.openChecks).toEqual([
      expect.objectContaining({
        id: "budget.destination.housing",
        origin: "user",
        evidenceStatus: "estimated",
      }),
    ]);
  });

  it("adds stable ledger entries for unresolved household blockers", () => {
    const draft = reviewedDraft();
    draft.householdPlan.supportNetwork = {
      relevance: "yes",
      importance: "blocker",
      status: "not_checked",
    };

    const result = createMoveWiseReviewModel(draft);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.model.openChecks).toContainEqual(
      expect.objectContaining({
        id: "household.support_network",
        knowledge: "unknown",
        role: "blocker",
        severity: "major",
      }),
    );
  });

  it("carries evaluator-owned financial blockers into readiness", () => {
    const draft = reviewedDraft();
    draft.finances.targetTakeHome = "1000";
    draft.finances.targetTakeHomeBasis = "user_estimate";

    const result = createMoveWiseReviewModel(draft);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.model.decisionGate.readiness).toMatchObject({
      state: "blocked",
      label: "Blocked",
    });
    expect(result.model.decisionGate.items).toContainEqual(
      expect.objectContaining({
        id: "budget.destination.monthly-cushion",
        status: "blocked",
        editRoute: "budget",
      }),
    );
  });

  it("keeps every relevant unchecked or unmet household constraint actionable", () => {
    const draft = reviewedDraft();
    draft.householdPlan.supportNetwork = {
      relevance: "yes",
      importance: "important",
      status: "not_checked",
    };
    draft.householdPlan.requiredServices = {
      relevance: "yes",
      importance: "important",
      status: "does_not_work",
    };

    const result = createMoveWiseReviewModel(draft);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.model.openChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "household.support_network",
          fieldId: "householdPlan.supportNetwork.status",
          knowledge: "unknown",
          role: "constraint",
          severity: "check",
        }),
        expect.objectContaining({
          id: "household.required_services_continuity",
          fieldId: "householdPlan.requiredServices.status",
          knowledge: "known",
          role: "constraint",
          severity: "major",
        }),
      ]),
    );
  });

  it("keeps an uncertain rent-ceiling meaning open in the canonical ledger", () => {
    const draft = reviewedDraft();
    draft.householdPlan.housing.ceilingType = "not_sure";
    draft.householdPlan.housing.stopsMove = "no";

    const result = createMoveWiseReviewModel(draft);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.model.openChecks).toContainEqual(
      expect.objectContaining({
        id: "first-home.rent-ceiling-meaning",
        moduleId: "first_home",
        knowledge: "unknown",
        severity: "major",
      }),
    );
  });

  it("renders an explicit review moment before final comparison", () => {
    const result = createMoveWiseReviewModel(reviewedDraft());
    expect(result.success).toBe(true);
    if (!result.success) return;

    const html = renderToStaticMarkup(
      <ReviewStep model={result.model} onEditAssumptions={vi.fn()} />,
    );

    expect(html).toContain("Your relocation brief");
    expect(html).toContain("Check the facts that could change your brief");
    expect(html).toContain("Best signs");
    expect(html).toContain("Pressure points");
    expect(html).toContain("Family checks");
    expect(html).toContain("Expected take-home");
    expect(html).toContain("Rent for the home size you need");
    expect(html).toContain("How common those rentals are");
    expect(html).toContain("Rent ceiling fit");
    expect(html).toContain("Buying later stays on the checklist");
    expect(html).toContain("Everyday bills");
    expect(html).toContain("Household essentials");
    expect(html).toContain("must-have needs");
    expect(html).toContain("Climate and hazard baseline");
    expect(html).toContain("overall baseline risk");
    expect(html).toContain("Daily commute feel");
    expect(html).toContain("commute away from home");
    expect(html).toContain("Monthly breathing room");
    expect(html).toContain("Numbers MoveWise used");
    expect(html).toContain("Destination take-home");
    expect(html).toContain("Destination rent");
    expect(html).toContain("Destination recurring expenses");
    expect(html).toContain("Rent ceiling");
    expect(html).toContain("Decision gate");
    expect(html).toContain(
      "What this brief knows—and what can still change it",
    );
    expect(html).toContain("Preliminary");
    expect(html).toContain("Evidence limited");
    expect(html).toContain("Verify destination take-home");
    expect(html).toContain("MoveWise estimate · Estimated");
    expect(html).toContain("Sources and limits");
    expect(html).toContain("Used to set a starting take-home estimate");
    expect(html).toContain("Used for rent by bedroom count");
    expect(html).toContain("Used for typical commute");
    expect(html).toContain("Used only as buying-later context");
    expect(html).toContain("Used as area-level climate");
    expect(html).toContain("U.S. Bureau of Economic Analysis");
    expect(html).toContain("Edit Budget");
    expect(html).not.toContain("Current read");
    expect(html).not.toContain("not a mortgage quote");
    expect(html).not.toContain("not childcare-price data");
    expect(html).not.toContain("not a car-dependence score");
    expect(html).not.toContain("MoveWise Score");
    expect(html).not.toContain("Affects result");
    expect(html).not.toContain("Used here");
    expect(html).not.toContain("For review");
    expect(html).not.toContain("Scoring scope");
  });
});
