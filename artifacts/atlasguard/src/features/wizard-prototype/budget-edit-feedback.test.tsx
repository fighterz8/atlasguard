import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  BudgetEditBanner,
  BudgetEditSummaryPanel,
} from "./budget-edit-feedback";

describe("Budget edit feedback", () => {
  it("states that Results edits are an unsaved working copy", () => {
    const html = renderToStaticMarkup(<BudgetEditBanner origin="results" />);

    expect(html).toContain("Editing Budget from Results");
    expect(html).toContain("This is a working copy");
    expect(html).toContain("Cancel to keep the evaluated brief unchanged");
  });

  it("announces the saved change and exposes exact before/after values", () => {
    const html = renderToStaticMarkup(
      <BudgetEditSummaryPanel
        summary={{
          hasChanges: true,
          count: 1,
          headline: "1 Budget assumption updated",
          detail: "Current room left changed from $1,500 to $2,000.",
          items: [
            {
              key: "currentTakeHome",
              label: "Current income after tax",
              before: "$5,000",
              after: "$5,500",
            },
          ],
        }}
      />,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("1 Budget assumption updated");
    expect(html).toContain("Current income after tax:");
    expect(html).toContain("$5,000");
    expect(html).toContain("$5,500");
  });
});
