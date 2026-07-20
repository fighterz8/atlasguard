import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { HouseholdStep } from "./household-step";
import { createInitialWizardDraft } from "./model";

describe("HouseholdStep", () => {
  it("shows only mode-applicable factors with explicitly labeled controls", () => {
    const draft = createInitialWizardDraft();
    const html = renderToStaticMarkup(
      <HouseholdStep
        mode="individual"
        plan={draft.householdPlan}
        errors={{
          "householdPlan.supportNetwork.needed":
            "Choose whether nearby support matters for this move.",
        }}
        onPlanChange={vi.fn()}
      />,
    );

    expect(html).toContain("Step 4 of 4");
    expect(html).toContain("Your household plan");
    expect(html).toContain("What kind of home needs to work?");
    expect(html).toContain("Maximum monthly housing cost");
    expect(html).toContain("Would missing this housing plan stop the move?");
    expect(html).toContain("Nearby support");
    expect(html).toContain("Required services");
    expect(html).toContain("Car-free routines");
    expect(html).not.toContain("Childcare plan");
    expect(html).not.toContain("School plan");
    expect(html).not.toContain("What role does this play");
    expect(html).not.toContain("Choose the expected change");
    expect(html).not.toContain("Essential —");
    expect(html).toContain('id="householdPlan-housing-tenure"');
    expect(html).toContain('id="householdPlan-supportNetwork-needed"');
    expect(html).toContain('aria-invalid="true"');
  });

  it("adds concrete childcare and school planning for a family", () => {
    const draft = createInitialWizardDraft();
    draft.householdPlan.childcare.needed = "yes";
    draft.householdPlan.school.needed = "yes";
    const html = renderToStaticMarkup(
      <HouseholdStep
        mode="family"
        plan={draft.householdPlan}
        errors={{}}
        onPlanChange={vi.fn()}
      />,
    );

    expect(html).toContain("Childcare plan");
    expect(html).toContain("What childcare arrangement do you need?");
    expect(html).toContain("School plan");
    expect(html).toContain("Which grade band should we plan for?");
    expect(html).toContain("What must a workable school path support?");
    expect(html).toContain("This does not rate schools or predict placement");
  });
});
