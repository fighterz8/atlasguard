import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createInitialWizardDraft } from "./model";
import { MoneyStep } from "./money-step";

describe("MoneyStep", () => {
  it("shows editable destination defaults and explicit current tenure", () => {
    (globalThis as typeof globalThis & { React: typeof React }).React = React;
    const finances = createInitialWizardDraft().finances;
    finances.currentTakeHome = "6200";
    const html = renderToStaticMarkup(
      <MoneyStep
        finances={finances}
        originSlug="san-diego-ca"
        destinationSlug="austin-tx"
        errors={{}}
        onValueChange={() => undefined}
        onBasisChange={() => undefined}
        onGrossKnownChange={() => undefined}
        onCurrentHousingTenureChange={() => undefined}
      />,
    );

    expect(html).toContain(
      "State wage taxes may improve destination take-home",
    );
    expect(html).toContain("Official state context");
    expect(html).toContain("does not calculate your paycheck");
    expect(html).toContain("California Franchise Tax Board");
    expect(html).toContain("Texas Legislative Council");
    expect(html).toContain("Your current monthly baseline");
    expect(html).toContain("Do you currently rent or own?");
    expect(html).toContain("Your destination starting assumptions");
    expect(html).toContain("MoveWise public-data estimate");
    expect(html).toContain("MoveWise starting assumption");
    expect(html).toContain("$5,675");
    expect(html).toContain("$5,469");
    expect(html).toContain("$5,888");
    expect(html).toContain("U.S. Census Bureau");
    expect(html).toContain("View official Census source");
    expect(html).toContain("Available metro rent context");
    expect(html).not.toContain("deterministic score should wait");
    expect(html).not.toContain("Enter all three destination amounts");
  });
});
