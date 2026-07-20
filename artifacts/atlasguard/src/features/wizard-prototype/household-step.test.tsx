import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { HouseholdStep } from "./household-step";
import { createInitialWizardDraft } from "./model";

describe("HouseholdStep", () => {
  it("asks for rent-first facts and supplies the bedroom-aware comparison", () => {
    const draft = createInitialWizardDraft();
    Object.assign(draft, {
      originSlug: "san-diego-ca",
      destinationSlug: "austin-tx",
    });
    Object.assign(draft.householdPlan.housing, {
      tenure: "rent_then_buy",
      bedrooms: "4_plus",
      maxMonthlyCost: "2800",
      stopsMove: "yes",
    });
    const html = renderToStaticMarkup(
      <HouseholdStep
        mode="individual"
        originSlug={draft.originSlug}
        destinationSlug={draft.destinationSlug}
        plan={draft.householdPlan}
        errors={{}}
        onPlanChange={vi.fn()}
      />,
    );

    expect(html).toContain("Step 4 of 4");
    expect(html).toContain("Your first rental plan");
    expect(html).toContain("Minimum bedrooms");
    expect(html).toContain("Maximum monthly rent");
    expect(html).toContain("Is this rent ceiling non-negotiable?");
    expect(html).toContain("MoveWise rent estimate");
    expect(html).toContain("Austin");
    expect(html).toContain("$2,491");
    expect(html).toContain("$1,010 less");
    expect(html).toContain("7.8%");
    expect(html).not.toContain("Compared with");
    expect(html).not.toContain("easier");
    expect(html).not.toContain("harder");
    expect(html).not.toContain("+15");
    expect(html).not.toContain("Childcare plan");
    expect(html).not.toContain("School plan");
    expect(html).not.toContain("Nearby support");
    expect(html).not.toContain("Required services");
    expect(html).not.toContain("Car-free routines");
    expect(html).toContain('id="householdPlan-housing-tenure"');
    expect(html).toContain('id="householdPlan-housing-bedrooms"');
  });

  it("keeps the same evidence-backed v1 scope for a family", () => {
    const draft = createInitialWizardDraft();
    const html = renderToStaticMarkup(
      <HouseholdStep
        mode="family"
        originSlug="los-angeles-ca"
        destinationSlug="seattle-wa"
        plan={draft.householdPlan}
        errors={{}}
        onPlanChange={vi.fn()}
      />,
    );

    expect(html).toContain("Rent-first v1 scope");
    expect(html).not.toContain("Childcare plan");
    expect(html).not.toContain("School plan");
  });
});
