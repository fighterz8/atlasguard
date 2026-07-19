import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ScoreExplanation } from "./score-explanation";
import { createResearchResultsViewModel } from "./model";
import { SummaryPanel } from "./summary-panel";

describe("MoveWise score presentation", () => {
  it("introduces the relative score without displacing the canonical decision", () => {
    const model = createResearchResultsViewModel();
    const html = renderToStaticMarkup(<SummaryPanel {...model} />);

    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("No clear advantage yet");
    expect(html).toContain("MoveWise Score");
    expect(html).toContain("52");
    expect(html).toContain("out of 100");
    expect(html).toContain(
      "50 means roughly even with Los Angeles for your current inputs.",
    );
    expect(html).toContain("Not a probability");
  });

  it("keeps score sensitivity, evidence, unavailable dimensions, and the closest threshold together", () => {
    const { score } = createResearchResultsViewModel();
    const html = renderToStaticMarkup(<ScoreExplanation score={score} />);

    expect(html).toContain('aria-labelledby="score-explanation-heading"');
    expect(html).toContain("Estimate sensitivity");
    expect(html).toContain("Monthly cushion difference");
    expect(html).toContain("Limited evidence");
    expect(html).toContain("Household fit");
    expect(html).toContain("Opportunity context");
    expect(html).toContain("Destination housing");
    expect(html).toContain("$1,750");
    expect(html).toContain("Worth a closer look");
    expect(html).toContain("input.destination.housing");
    expect(html).toContain("Score rule 0.1.0");
  });

  it("makes an active cap explicit rather than letting the score imply safety", () => {
    const { score } = createResearchResultsViewModel();
    const html = renderToStaticMarkup(
      <ScoreExplanation
        score={{
          ...score,
          activeBlocker: {
            label: "Negative destination cushion",
            explanation:
              "The destination budget falls below zero, so the registered rule prevents a favorable score.",
            scoreCap: 59,
            evidenceRefs: ["derived.financial.destination_monthly_cushion"],
            inputPaths: ["finances.destination.takeHomeIncome.monthlyCents"],
          },
        }}
      />,
    );

    expect(html).toContain("Score capped at 59");
    expect(html).toContain("Negative destination cushion");
    expect(html).toContain("prevents a favorable score");
  });
});
