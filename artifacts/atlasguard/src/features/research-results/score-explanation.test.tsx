import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ScoreExplanation } from "./score-explanation";
import { HouseholdFit } from "./household-fit";
import { DecisionNotes } from "./decision-notes";
import { createResearchResultsViewModel } from "./model";
import { SummaryPanel } from "./summary-panel";
import { evaluateWizardDraft } from "../wizard-prototype/evaluate-wizard-draft";
import { createInitialWizardDraft } from "../wizard-prototype/model";
import { ResearchResultsExperience } from "../../pages/results";

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
    expect(html).toContain('data-score-tone="caution"');
    expect(html).toContain('data-tone="neutral"');
    expect(html).toContain('data-tone="caution"');
  });

  it("prioritizes the strongest effect and a contextual decision-changing condition", () => {
    const { score } = createResearchResultsViewModel();
    const html = renderToStaticMarkup(<ScoreExplanation score={score} />);

    expect(html).toContain('aria-labelledby="score-explanation-heading"');
    expect(html).toContain("Monthly cushion difference");
    expect(html).toContain("Strongest supported effect");
    expect(html).toContain("Typical commute time");
    expect(html).toContain("+2 score points");
    expect(html).toContain("Closest decision change");
    expect(html).toContain("Destination housing");
    expect(html).toContain("At or below $1,750/month");
    expect(html).toContain("Currently $2,000/month");
    expect(html).toContain("$250/month away");
    expect(html).toContain("Worth a closer look");
    expect(html).toContain("Household fit");
    expect(html).toContain("Opportunity context");
    expect(html).not.toContain("Estimate sensitivity");
    expect(html).not.toContain("Evidence confidence");
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

  it("does not announce an essential override when no essentials are marked", () => {
    const { score } = createResearchResultsViewModel();
    const html = renderToStaticMarkup(
      <ScoreExplanation
        score={{
          ...score,
          mode: "deterministic",
          essentialSummary: {
            label: "No essentials marked",
            tone: "neutral",
            active: false,
          },
        }}
      />,
    );

    expect(html).not.toContain("Essential-needs override");
  });

  it("uses one estimate-method disclosure without confirmation noise", () => {
    const draft = createInitialWizardDraft();
    Object.assign(draft, {
      originSlug: "los-angeles-ca",
      destinationSlug: "seattle-wa",
      householdMode: "individual",
    });
    Object.assign(draft.finances, {
      currentHousingTenure: "rent",
      currentTakeHome: "5000",
      targetTakeHome: "5250",
      currentHousing: "2000",
      targetHousing: "1750",
      currentExpenses: "1500",
      targetExpenses: "1250",
    });
    draft.householdPlan.housing = {
      tenure: "rent",
      type: "apartment_or_condo",
      bedrooms: "2",
      bathrooms: "1",
      maxMonthlyCost: "1700",
      stopsMove: "yes",
      assessment: "positive",
    };
    draft.householdPlan.supportNetwork = {
      needed: "yes",
      stopsMove: "yes",
      assessment: "unavailable",
    };
    draft.householdPlan.requiredServices = {
      needed: "no",
      stopsMove: "",
      assessment: "unavailable",
    };
    draft.householdPlan.carFreeAccess = {
      needed: "no",
      stopsMove: "",
      assessment: "unavailable",
    };
    const evaluation = evaluateWizardDraft(draft);
    expect(evaluation.success).toBe(true);
    if (!evaluation.success) return;
    const model = createResearchResultsViewModel(evaluation.evaluation, {
      analysis: evaluation.deterministicAnalysis,
      householdAnswers: evaluation.householdAnswers,
    });
    expect(model.household).not.toBeNull();
    if (!model.household) return;

    const summaryHtml = renderToStaticMarkup(<SummaryPanel {...model} />);
    const scoreHtml = renderToStaticMarkup(
      <ScoreExplanation score={model.score} />,
    );
    const householdHtml = renderToStaticMarkup(
      <HouseholdFit household={model.household} />,
    );
    const decisionNotesHtml = renderToStaticMarkup(
      <DecisionNotes {...model} />,
    );

    expect(summaryHtml).toContain("No clear advantage yet");
    expect(summaryHtml).toContain("Deterministic 0.2.0");
    expect(summaryHtml).toContain("1 essential need not met");
    expect(scoreHtml).toContain("Closest decision change");
    expect(scoreHtml).toContain("Non-negotiable rental requirement");
    expect(scoreHtml).toContain("High financial risk under these assumptions");
    expect(scoreHtml).toContain("MoveWise calculated");
    expect(scoreHtml).toContain("How estimates were calculated");
    expect(scoreHtml).toContain("Public estimates + your inputs");
    expect(scoreHtml).not.toContain("Preliminary");
    expect(scoreHtml).not.toContain("Needs confirmation");
    expect(scoreHtml).toContain("housing-burden safety check could not run");
    expect(scoreHtml).toContain("Score rule 0.2.0");
    expect(householdHtml).not.toContain("Expected change");
    expect(householdHtml).not.toContain("Household score effect");
    expect(householdHtml).not.toContain("Not sure yet");
    expect(decisionNotesHtml).not.toContain("Verify the expected destination");
    expect(decisionNotesHtml).not.toContain("Assumptions to watch");
  });

  it("shows what changes before score mechanics in the guided Results read", () => {
    (globalThis as typeof globalThis & { React: typeof React }).React = React;
    const html = renderToStaticMarkup(
      <ResearchResultsExperience model={createResearchResultsViewModel()} />,
    );

    expect(html.indexOf("What changes if you move")).toBeGreaterThan(-1);
    expect(html.indexOf("What sits behind the score")).toBeGreaterThan(-1);
    expect(html.indexOf("What changes if you move")).toBeLessThan(
      html.indexOf("What sits behind the score"),
    );
  });
});
