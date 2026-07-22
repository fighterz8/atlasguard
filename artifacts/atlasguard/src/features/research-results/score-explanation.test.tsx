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
  it("leads with the relocation brief instead of the score", () => {
    const model = createResearchResultsViewModel();
    const html = renderToStaticMarkup(<SummaryPanel {...model} />);

    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("Seattle has tradeoffs worth weighing.");
    expect(html).toContain("Move outlook");
    expect(html).toContain("Decision readiness");
    expect(html).toContain("Improves");
    expect(html).toContain("Gets harder");
    expect(html).toContain("Check before deciding");
    expect(html).not.toContain("MoveWise Score");
    expect(html).not.toContain("out of 100");
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
      ceilingType: "hard",
      stopsMove: "yes",
      assessment: "positive",
    };
    draft.householdPlan.supportNetwork = {
      relevance: "yes",
      importance: "blocker",
      status: "not_checked",
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

    expect(summaryHtml).toContain("must-have need is not met");
    expect(summaryHtml).toContain("Move outlook");
    expect(summaryHtml).toContain("Decision readiness");
    expect(summaryHtml).not.toContain("Deterministic 0.2.0");
    expect(summaryHtml).not.toContain("MoveWise Score");
    expect(scoreHtml).toContain("Closest decision change");
    expect(scoreHtml).toContain("Non-negotiable rental requirement");
    expect(scoreHtml).toContain("Budget risk looks high");
    expect(scoreHtml).toContain("MoveWise calculated");
    expect(scoreHtml).toContain("How estimates were calculated");
    expect(scoreHtml).toContain("MoveWise estimates + your inputs");
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

  it("keeps the brief and numbers visible while collapsing deeper analysis", () => {
    (globalThis as typeof globalThis & { React: typeof React }).React = React;
    const html = renderToStaticMarkup(
      <ResearchResultsExperience model={createResearchResultsViewModel()} />,
    );

    expect(html.indexOf("Numbers MoveWise used")).toBeGreaterThan(-1);
    expect(html.indexOf("Explore the full comparison")).toBeGreaterThan(-1);
    expect(html).toContain("metro household income");
    expect(html).not.toContain("not a salary prediction");
    expect(html).not.toContain("not an occupation wage estimate");
    expect(html).toContain("family operating costs");
    expect(html).not.toContain("not childcare-price data");
    expect(html.indexOf("How this was estimated")).toBeGreaterThan(-1);
    expect(html.indexOf("Numbers MoveWise used")).toBeLessThan(
      html.indexOf("How this was estimated"),
    );
  });
});
