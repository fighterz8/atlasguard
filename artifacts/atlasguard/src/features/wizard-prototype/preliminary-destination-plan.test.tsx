import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { PreliminaryDestinationPlan } from "./submit-wizard-draft";
import { PreliminaryDestinationPlanExperience } from "./preliminary-destination-plan";

const plan: PreliminaryDestinationPlan = {
  route: {
    origin: "San Diego, CA",
    destination: "Austin, TX",
    originMetro: "San Diego-Chula Vista-Carlsbad, CA",
    destinationMetro: "Austin-Round Rock-Georgetown, TX",
  },
  score: {
    available: false,
    label: "Deterministic score not ready",
    explanation:
      "MoveWise has not filled missing destination values with placeholders.",
  },
  currentBaseline: [
    {
      id: "take_home",
      label: "Take-home income",
      value: "$6,200",
      provenance: "You told us",
    },
    {
      id: "housing",
      label: "Housing",
      value: "$2,600",
      provenance: "You told us",
    },
    {
      id: "recurring_expenses",
      label: "Other recurring expenses",
      value: "$2,100",
      provenance: "You told us",
    },
  ],
  householdPlan: {
    version: "1.0.0",
    items: [
      {
        id: "housing",
        label: "Housing",
        detail: "Rent · apartment or condo · 2 bedrooms · up to $2,600/month",
        stopsMove: true,
      },
    ],
  },
  availableEvidence: [
    {
      id: "metro_rent_context",
      label: "Metro rent context",
      reading: "$2,173 in San Diego · $1,729 in Austin",
      detail: "2024 ACS median gross rent.",
      provenance: "MoveWise calculated",
      boundary: "Area context—not your budget",
    },
  ],
  missingEstimates: [
    {
      id: "destination_take_home",
      label: "Destination take-home income",
      detail: "Confirm pay, taxes, and benefit deductions.",
      provenance: "Needs confirmation",
    },
  ],
  researchSteps: [
    {
      id: "destination_housing",
      label: "Match housing evidence to your household plan",
      detail: "Use tenure, home type, bedrooms, and budget.",
    },
  ],
};

describe("PreliminaryDestinationPlanExperience", () => {
  it("shows provenance, missing estimates, and an explicit no-score boundary", () => {
    const html = renderToStaticMarkup(
      <PreliminaryDestinationPlanExperience
        plan={plan}
        onEditAssumptions={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(html).toContain("Your destination research plan");
    expect(html).toContain("Deterministic score not ready");
    expect(html).toContain("You told us");
    expect(html).toContain("MoveWise calculated");
    expect(html).toContain("Needs confirmation");
    expect(html).toContain("Area context—not your budget");
    expect(html).toContain("Your household plan");
    expect(html).toContain("Could stop the move");
    expect(html).toContain(
      "do not receive favorable or unfavorable score points",
    );
    expect(html).toContain("MoveWise did not substitute this metro median");
    expect(html).toContain("Edit assumptions");
    expect(html).not.toMatch(/>50</);
  });
});
