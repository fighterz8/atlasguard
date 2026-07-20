import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { HouseholdStep } from "./household-step";
import { createInitialWizardDraft } from "./model";

describe("HouseholdStep", () => {
  it("shows only mode-applicable factors with explicitly labeled controls", () => {
    const draft = createInitialWizardDraft();
    draft.householdFactors.space_fit = {
      role: "important",
      impact: "positive",
    };
    const html = renderToStaticMarkup(
      <HouseholdStep
        mode="individual"
        factors={draft.householdFactors}
        errors={{
          "household.support_network.role":
            "Choose the role of Nearby support network.",
        }}
        onRoleChange={vi.fn()}
        onImpactChange={vi.fn()}
      />,
    );

    expect(html).toContain("Step 4 of 4");
    expect(html).toContain("Enough suitable space");
    expect(html).toContain("Being near people you rely on");
    expect(html).toContain(
      "Keeping required therapy, disability, or support services",
    );
    expect(html).toContain("Completing essential routines without driving");
    expect(html).not.toContain("Childcare continuity");
    expect(html).not.toContain("School continuity");
    expect(html).toContain('id="household-space_fit-role"');
    expect(html).toContain('id="household-space_fit-impact"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("Essential — I haven’t confirmed it yet");
    expect(html).toContain("Not part of my decision");
  });
});
