import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { createInitialWizardDraft } from "./model";
import { ScenarioLab } from "./scenario-lab";

const reviewedDraft = () => {
  const draft = createInitialWizardDraft();
  draft.originSlug = "san-diego-ca";
  draft.destinationSlug = "austin-tx";
  draft.householdMode = "individual";
  Object.assign(draft.finances, {
    currentHousingTenure: "rent",
    currentTakeHome: "6200",
    currentHousing: "2600",
    currentExpenses: "2100",
  });
  Object.assign(draft.householdPlan.housing, {
    tenure: "rent",
    type: "apartment_or_condo",
    bedrooms: "2",
    bathrooms: "1",
    maxMonthlyCost: "2600",
    ceilingType: "target",
    stopsMove: "no",
  });
  draft.householdPlan.supportNetwork = {
    relevance: "no",
    importance: "",
    status: "",
  };
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

describe("ScenarioLab", () => {
  it("renders named baseline, direct entry, comparison states, and guarded activation", () => {
    const html = renderToStaticMarkup(
      <ScenarioLab baselineDraft={reviewedDraft()} onMakeActive={vi.fn()} />,
    );

    expect(html).toContain("Scenario lab");
    expect(html).toContain("Test a real alternative");
    expect(html).toContain("Scenario name");
    expect(html).toContain("Current brief");
    expect(html).toContain("Destination income after tax");
    expect(html).toContain("Destination housing");
    expect(html).toContain("Other recurring expenses");
    expect(html).toContain("Outlook");
    expect(html).toContain("Readiness");
    expect(html).toContain("Evidence");
    expect(html).toContain("Make active");
    expect(html).toContain("disabled");
    expect(html).not.toContain('type="range"');
  });
});
