import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { createInitialWizardDraft } from "./model";
import { createMoveWiseReviewModel } from "./review-model";
import { ReviewStep } from "./review-step";

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
    stopsMove: "yes",
    assessment: "unavailable",
  };
  draft.householdPlan.supportNetwork = {
    needed: "no",
    stopsMove: "",
    assessment: "unavailable",
  };
  draft.householdPlan.requiredServices = {
    needed: "no",
    stopsMove: "",
    assessment: "unavailable",
  };
  draft.householdPlan.carFreeAccess = {
    needed: "no",
    stopsMove: "",
    assessment: "unavailable",
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
      "Ownership later is context only",
    );
    expect(result.model.scoringScope).toContain("deterministic rule 0.2.0");
    expect(result.model.findings.map((finding) => finding.id)).toEqual([
      "destination-income",
      "bedroom-rent-fit",
      "rental-supply",
      "rent-ceiling-fit",
      "recurring-expenses",
      "monthly-cushion",
      "biggest-caveat",
    ]);
    expect(result.model.findings[1]).toMatchObject({
      label: "Bedroom-aware rent fit",
      role: "Scored",
      tone: "favorable",
    });
    expect(result.model.assumptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Destination rent",
          value: "$2,491",
          role: "Scored",
        }),
        expect.objectContaining({
          label: "Rent ceiling",
          value: "$2,800",
          role: "Scored",
        }),
      ]),
    );
  });

  it("renders an explicit review moment before final comparison", () => {
    const result = createMoveWiseReviewModel(reviewedDraft());
    expect(result.success).toBe(true);
    if (!result.success) return;

    const html = renderToStaticMarkup(
      <ReviewStep model={result.model} onEditAssumptions={vi.fn()} />,
    );

    expect(html).toContain("Step 5 of 5");
    expect(html).toContain("Review MoveWise");
    expect(html).toContain("Before the final score");
    expect(html).toContain("MoveWise found");
    expect(html).toContain("Destination income estimate");
    expect(html).toContain("Bedroom-aware rent fit");
    expect(html).toContain("Rental supply signal");
    expect(html).toContain("Rent ceiling fit");
    expect(html).toContain("Ownership later is context only");
    expect(html).toContain("Recurring expense translation");
    expect(html).toContain("Monthly cushion direction");
    expect(html).toContain("Biggest caveat");
    expect(html).toContain("Assumptions about to be scored");
    expect(html).toContain("Destination take-home");
    expect(html).toContain("Destination rent");
    expect(html).toContain("Destination recurring expenses");
    expect(html).toContain("Rent ceiling");
    expect(html).toContain("Data coverage");
    expect(html).toContain("ACS table B19013");
    expect(html).toContain("ACS tables B25031/B25042");
    expect(html).toContain("U.S. Bureau of Economic Analysis");
    expect(html).toContain("Edit assumptions");
    expect(html).not.toContain("MoveWise Score");
  });
});
