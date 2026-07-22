import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { HouseholdStep } from "./household-step";
import { createInitialWizardDraft } from "./model";

describe("HouseholdStep", () => {
  it("contains only the household constraints that apply to an individual", () => {
    const draft = createInitialWizardDraft();
    Object.assign(draft, {
      originSlug: "san-diego-ca",
      destinationSlug: "austin-tx",
    });
    const html = renderToStaticMarkup(
      <HouseholdStep
        mode="individual"
        plan={draft.householdPlan}
        errors={{}}
        onPlanChange={vi.fn()}
      />,
    );

    expect(html).toContain("Step 5 of 6");
    expect(html).toContain("Household constraints");
    expect(html).not.toContain("First housing stage");
    expect(html).not.toContain("Minimum bedrooms");
    expect(html).not.toContain("Maximum monthly rent");
    expect(html).not.toContain("MoveWise rent estimate");
    expect(html).not.toContain("Compared with");
    expect(html).not.toContain("easier");
    expect(html).not.toContain("harder");
    expect(html).not.toContain("+15");
    expect(html).toContain("Your status board");
    expect(html).toContain("Nearby support");
    expect(html).toContain("Required services");
    expect(html).toContain("Car-free routines");
    expect(html).not.toContain("Current read");
    expect(html).not.toContain("Looks workable");
    expect(html).not.toContain("Looks difficult");
    expect(html).toContain("Workable childcare");
    expect(html).toContain("Suitable school path");
    expect(html).toContain("Not applicable to this move");
    expect(html).not.toContain('id="householdPlan-housing-tenure"');
    expect(html).not.toContain('id="householdPlan-housing-bedrooms"');
  });

  it("keeps the same evidence-backed v1 scope for a family", () => {
    const draft = createInitialWizardDraft();
    draft.householdPlan.childcare.relevance = "yes";
    draft.householdPlan.school.relevance = "yes";
    const html = renderToStaticMarkup(
      <HouseholdStep
        mode="family"
        plan={draft.householdPlan}
        errors={{}}
        onPlanChange={vi.fn()}
      />,
    );

    expect(html).toContain("Household constraints");
    expect(html).toContain("Workable childcare");
    expect(html).toContain("Suitable school path");
    expect(html).toContain("Care arrangement");
    expect(html).toContain("School preference");
  });

  it("renders a three-dimension status board with explicit unchecked state", () => {
    const draft = createInitialWizardDraft();
    draft.householdMode = "individual";
    Object.assign(draft.householdPlan.supportNetwork, {
      relevance: "yes",
      importance: "blocker",
      status: "not_checked",
    });

    const html = renderToStaticMarkup(
      <HouseholdStep
        mode="individual"
        plan={draft.householdPlan}
        errors={{}}
        onPlanChange={vi.fn()}
      />,
    );

    expect(html).toContain("1. Does it matter?");
    expect(html).toContain("2. How important is it?");
    expect(html).toContain("Could block the move");
    expect(html).toContain("3. What is its status?");
    expect(html).toContain("Works");
    expect(html).toContain("Does not work");
    expect(html).toContain("Not checked");
    expect(html).toContain("Not asked for an individual move.");
    expect(html).not.toContain("Could this stop the move?");
  });
});
