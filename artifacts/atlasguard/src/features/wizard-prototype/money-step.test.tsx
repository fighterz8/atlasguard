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
    finances.currentHousing = "2600";
    finances.currentExpenses = "2100";
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
        onExpenseWorksheetEnabledChange={() => undefined}
        onExpenseCategoryChange={() => undefined}
      />,
    );

    expect(html).toContain(
      "State wage taxes may improve destination take-home",
    );
    expect(html).toContain("Official state context");
    expect(html).toContain("does not calculate your paycheck");
    expect(html).toContain("California Franchise Tax Board");
    expect(html).toContain("Texas Legislative Council");
    expect(html).toContain("Build a normal month, not a perfect one");
    expect(html).toContain("Your month now");
    expect(html).toContain("Do you currently rent or own?");
    expect(html).toContain("Income after tax");
    expect(html).toContain("Home");
    expect(html).toContain("Everything else");
    expect(html).toContain("Break this total down");
    expect(html).toContain("Your monthly equation");
    expect(html).toContain("$6,200 − $2,600 − $2,100");
    expect(html).toContain("$1,500 left in your current month");
    expect(html).toContain("First month there");
    expect(html).toContain("MoveWise estimate");
    expect(html).not.toContain("MoveWise starting assumption");
    expect(html).not.toContain('id="targetHousing"');
    expect(html).toContain("Complete First home");
    expect(html).toContain("Not calculated yet");
    expect(html).toMatch(/id="targetExpenses"[^>]*value="1896"/);
    expect(html).toContain("Waiting on plan");
    expect(html).toContain("Destination monthly equation");
    expect(html).toContain("$5,675 − — − $1,896");
    expect(html).toContain("Waiting on First home");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("2 planning estimates · 1 open answer");
    expect(html).toContain("public metro data");
    expect(html).toContain("$5,675");
    expect(html).toContain("$5,469");
    expect(html).toContain("$5,888");
    expect(html).toContain("U.S. Census Bureau");
    expect(html).toContain("Treat this as a starting point to edit.");
    expect(html).toContain("View official Census source");
    expect(html).not.toContain("Available metro rent context");
    expect(html).not.toContain("deterministic score should wait");
    expect(html).not.toContain("Enter all three destination amounts");
    expect(html.indexOf('id="currentTakeHome"')).toBeLessThan(
      html.indexOf("State wage-tax context"),
    );
    expect(html).not.toContain(
      "What would your household’s total monthly income be before taxes",
    );
    expect(html).toContain(
      "only after your First home plan provides a destination housing amount",
    );
  });

  it("shows retained-property entry only for current owners", () => {
    (globalThis as typeof globalThis & { React: typeof React }).React = React;
    const renterFinances = createInitialWizardDraft().finances;
    renterFinances.currentHousingTenure = "rent";
    const renterHtml = renderToStaticMarkup(
      <MoneyStep
        finances={renterFinances}
        originSlug="san-diego-ca"
        destinationSlug="austin-tx"
        errors={{}}
        onValueChange={() => undefined}
        onBasisChange={() => undefined}
        onGrossKnownChange={() => undefined}
        onCurrentHousingTenureChange={() => undefined}
        onExpenseWorksheetEnabledChange={() => undefined}
        onExpenseCategoryChange={() => undefined}
      />,
    );
    expect(renterHtml).not.toContain("Keeping a property after the move?");

    const ownerFinances = createInitialWizardDraft().finances;
    ownerFinances.currentHousingTenure = "own";
    const ownerHtml = renderToStaticMarkup(
      <MoneyStep
        finances={ownerFinances}
        originSlug="san-diego-ca"
        destinationSlug="austin-tx"
        errors={{}}
        onValueChange={() => undefined}
        onBasisChange={() => undefined}
        onGrossKnownChange={() => undefined}
        onCurrentHousingTenureChange={() => undefined}
        onExpenseWorksheetEnabledChange={() => undefined}
        onExpenseCategoryChange={() => undefined}
      />,
    );
    expect(ownerHtml).toContain("Keeping a property after the move?");
    expect(ownerHtml).toMatch(/id="retainedPropertyNet"[^>]*value=""/);
    expect(ownerHtml).not.toContain(
      '<summary class="flex min-h-11 cursor-pointer list-none',
    );
  });

  it("shows the gross-income check only when destination housing is present", () => {
    (globalThis as typeof globalThis & { React: typeof React }).React = React;
    const finances = createInitialWizardDraft().finances;
    finances.currentTakeHome = "6200";
    finances.currentHousing = "2600";
    finances.currentExpenses = "2100";
    finances.targetHousing = "2200";
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
        onExpenseWorksheetEnabledChange={() => undefined}
        onExpenseCategoryChange={() => undefined}
      />,
    );

    expect(html).toContain(
      "What would your household’s total monthly income be before taxes",
    );
    expect(html).not.toContain(
      "only after your First home plan provides a destination housing amount",
    );
    expect(html).toContain("$5,675 − $2,200 − $1,896");
    expect(html).toContain("$1,579");
    expect(html).toContain("$79 more room each month");
  });

  it("renders the optional expense worksheet without adding another evaluator total", () => {
    (globalThis as typeof globalThis & { React: typeof React }).React = React;
    const finances = createInitialWizardDraft().finances;
    finances.currentExpenses = "2300";
    finances.expenseWorksheet = {
      enabled: true,
      values: {
        utilities: "300",
        transport: "650",
        food: "900",
        childcare: "450",
        debt: "",
        insurance: "",
        subscriptions: "",
        other: "",
      },
    };
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
        onExpenseWorksheetEnabledChange={() => undefined}
        onExpenseCategoryChange={() => undefined}
      />,
    );

    expect(html).toContain("Everything else total");
    expect(html).toContain("$2,300");
    expect(html).toContain("Utilities");
    expect(html).toContain("Food &amp; household");
    expect(html).toContain("Do not include rent or mortgage here");
  });

  it("makes retained-property impact visible in an owner's live equation", () => {
    (globalThis as typeof globalThis & { React: typeof React }).React = React;
    const finances = createInitialWizardDraft().finances;
    finances.currentHousingTenure = "own";
    finances.currentTakeHome = "6200";
    finances.currentHousing = "2600";
    finances.currentExpenses = "2100";
    finances.targetTakeHome = "5800";
    finances.targetHousing = "2200";
    finances.targetExpenses = "1900";
    finances.retainedPropertyNet = "-300";
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
        onExpenseWorksheetEnabledChange={() => undefined}
        onExpenseCategoryChange={() => undefined}
      />,
    );

    expect(html).toContain("property impact");
    expect(html).toContain("$5,800 − $2,200 − $1,900 − $300");
    expect(html).toContain("$1,400");
  });
});
