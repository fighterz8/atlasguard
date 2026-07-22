import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { FirstHomeStep } from "./first-home-step";
import { createInitialWizardDraft } from "./model";

describe("FirstHomeStep", () => {
  it("owns requirements, source-backed rent, ceiling meaning, and the gap", () => {
    const draft = createInitialWizardDraft();
    draft.originSlug = "san-diego-ca";
    draft.destinationSlug = "austin-tx";
    Object.assign(draft.householdPlan.housing, {
      tenure: "rent_then_buy",
      type: "townhome",
      bedrooms: "4_plus",
      bathrooms: "2",
      maxMonthlyCost: "2200",
      ceilingType: "hard",
      stopsMove: "yes",
    });

    const html = renderToStaticMarkup(
      <FirstHomeStep
        originSlug={draft.originSlug}
        destinationSlug={draft.destinationSlug}
        housing={draft.householdPlan.housing}
        errors={{}}
        onHousingChange={vi.fn()}
      />,
    );

    expect(html).toContain("Step 3 of 6");
    expect(html).toContain("Plan the first home");
    expect(html).toContain("Home type");
    expect(html).toContain("Minimum bedrooms");
    expect(html).toContain("Minimum bathrooms");
    expect(html).toContain("How firm is this ceiling?");
    expect(html).toContain("Hard limit");
    expect(html).toContain("Target");
    expect(html).toContain("Flexible");
    expect(html).toContain("Not sure");
    expect(html).toContain("MoveWise estimate");
    expect(html).toContain("$2,491");
    expect(html).toContain("$291 over your hard limit");
    expect(html).toContain(
      "This conflict can block favorable housing-fit language",
    );
    expect(html).toContain("U.S. Census Bureau");
  });
});
