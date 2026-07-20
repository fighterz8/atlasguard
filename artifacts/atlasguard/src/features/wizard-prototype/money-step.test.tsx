import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createInitialWizardDraft } from "./model";
import { MoneyStep } from "./money-step";

describe("MoneyStep", () => {
  it("grounds a California-to-Texas comparison without inventing take-home", () => {
    (globalThis as typeof globalThis & { React: typeof React }).React = React;
    const html = renderToStaticMarkup(
      <MoneyStep
        finances={createInitialWizardDraft().finances}
        originSlug="san-diego-ca"
        destinationSlug="austin-tx"
        errors={{}}
        onValueChange={() => undefined}
        onBasisChange={() => undefined}
        onGrossKnownChange={() => undefined}
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
    expect(html).toContain("MoveWise builds the destination side");
    expect(html).toContain("I already know destination numbers");
    expect(html).toContain("Optional override");
    expect(html).toContain("Available metro rent context");
    expect(html).not.toContain("Copy current costs");
    expect(html).not.toContain("Start with current");
  });
});
