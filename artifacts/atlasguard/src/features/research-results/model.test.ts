import { describe, expect, it } from "vitest";

import {
  createResearchResultsViewModel,
  createResearchWhatIfViewModel,
  createVerifiedWhatIfViewModel,
} from "./model";
import { evaluateWizardDraft } from "../wizard-prototype/evaluate-wizard-draft";
import { submitWizardDraft } from "../wizard-prototype/submit-wizard-draft";
import {
  createInitialWizardDraft,
  type WizardPrototypeDraft,
} from "../wizard-prototype/model";

const reviewedDraft = (): WizardPrototypeDraft => ({
  ...createInitialWizardDraft(),
  originSlug: "los-angeles-ca",
  destinationSlug: "seattle-wa",
  householdMode: "individual",
  householdPlan: {
    ...createInitialWizardDraft().householdPlan,
    housing: {
      tenure: "rent",
      type: "apartment_or_condo",
      bedrooms: "2",
      bathrooms: "1",
      maxMonthlyCost: "2000",
      stopsMove: "no",
    },
    supportNetwork: { needed: "no", stopsMove: "" },
    requiredServices: { needed: "no", stopsMove: "" },
    carFreeAccess: { needed: "no", stopsMove: "" },
  },
  finances: {
    ...createInitialWizardDraft().finances,
    currentHousingTenure: "rent",
    currentTakeHome: "5000",
    targetTakeHome: "5250",
    currentHousing: "2000",
    targetHousing: "1750",
    currentExpenses: "1500",
    targetExpenses: "1250",
    retainedPropertyNet: "-100",
    targetTakeHomeRangeMin: "5000",
    targetTakeHomeRangeMax: "5500",
    targetHousingRangeMin: "1500",
    targetHousingRangeMax: "2000",
    targetExpensesRangeMin: "1000",
    targetExpensesRangeMax: "1500",
    retainedPropertyNetRangeMin: "-300",
    retainedPropertyNetRangeMax: "100",
  },
  commuteImportance: "important",
});

describe("research results view model", () => {
  it("renders only the canonical research evaluation", () => {
    const model = createResearchResultsViewModel();

    expect(model.releaseStatus).toBe("research_only");
    expect(model.route.originCity).toBe("Los Angeles");
    expect(model.route.destinationCity).toBe("Seattle");
    expect(model.condition.label).toBe("No clear advantage yet");
    expect(model.confidence.level).toBe("limited");
    expect(model.stability.level).toBe("assumption_sensitive");
    expect(model.decisionMeta).toEqual({
      routeLabel: "Los Angeles to Seattle",
      monthlyDifference: "$0",
      financialDirection: "similar",
      confidenceLabel: "Limited evidence",
      stabilityLabel: "Assumption sensitive",
    });
    expect(model.score).toMatchObject({
      value: 52,
      outOf: 100,
      bandLabel: "Mixed or similar",
      tone: "caution",
      baselineMeaning:
        "50 means roughly even with Los Angeles for your current inputs.",
      boundary:
        "Not a probability, universal city grade, city ranking, or instruction to move.",
      range: {
        label: expect.stringMatching(/^\d+–\d+$/),
        explanation: expect.stringContaining("estimate sensitivity"),
      },
      exactFinance: {
        label: "Monthly cushion difference",
        value: "$0",
        direction: "similar",
      },
      evidenceConfidence: {
        label: "Limited evidence",
        explanation: expect.stringContaining("ACS coverage"),
      },
      activeBlocker: null,
      strongestImprovement: {
        label: "Typical commute time",
        contribution: 2,
        evidenceRefs: ["benchmark.commute_time.acs1.2024.la_seattle"],
      },
      strongestTradeoff: null,
      strongestEffect: {
        label: "Typical commute time",
        contribution: 2,
        kind: "lift",
      },
      decisionChangingAssumption: {
        label: "Destination housing",
        currentValue: "$2,000",
        threshold: "$1,750",
        operator: "at or below",
        distance: "$250",
        changesConditionTo: "Worth a closer look",
        withinPlausibleRange: true,
        evidenceRefs: ["input.destination.housing"],
      },
      missingComponents: ["Household fit", "Opportunity context"],
      calculationEvidenceRefs: expect.arrayContaining([
        "benchmark.commute_time.acs1.2024.la_seattle",
        "input.destination.housing",
      ]),
      scoreVersion: "0.1.0",
    });
    expect(model.comparison.financialRows).toMatchObject([
      { id: "monthly_cushion", classification: "similar" },
      { id: "take_home_income", classification: "similar" },
      { id: "housing_cost", classification: "similar" },
      { id: "recurring_expenses", classification: "similar" },
    ]);
  });

  it("does not fabricate a score range and keeps unavailable dimensions visible", () => {
    const draft = reviewedDraft();
    draft.commuteImportance = "does_not_matter";
    draft.climateHeatPreference = "does_not_matter";
    draft.finances.targetTakeHomeRangeMin = "";
    draft.finances.targetTakeHomeRangeMax = "";
    draft.finances.targetHousingRangeMin = "";
    draft.finances.targetHousingRangeMax = "";
    draft.finances.targetExpensesRangeMin = "";
    draft.finances.targetExpensesRangeMax = "";
    draft.finances.retainedPropertyNetRangeMin = "";
    draft.finances.retainedPropertyNetRangeMax = "";
    const evaluation = evaluateWizardDraft(draft);
    expect(evaluation.success).toBe(true);
    if (!evaluation.success) return;

    const model = createResearchResultsViewModel(evaluation.evaluation);

    expect(model.score.range).toBeNull();
    expect(model.score.missingComponents).toEqual([
      "Daily-life fit",
      "Household fit",
      "Opportunity context",
    ]);
    expect(model.score.strongestTradeoff).toBeNull();
    expect(model.score.boundary).toContain("Not a probability");
  });

  it("surfaces a registered score cap when the destination budget is not viable", () => {
    const draft = reviewedDraft();
    draft.finances.targetTakeHome = "2000";
    draft.finances.targetHousing = "2500";
    draft.finances.targetExpenses = "1500";
    draft.finances.targetTakeHomeRangeMin = "";
    draft.finances.targetTakeHomeRangeMax = "";
    draft.finances.targetHousingRangeMin = "";
    draft.finances.targetHousingRangeMax = "";
    draft.finances.targetExpensesRangeMin = "";
    draft.finances.targetExpensesRangeMax = "";
    draft.finances.retainedPropertyNetRangeMin = "";
    draft.finances.retainedPropertyNetRangeMax = "";
    const evaluation = evaluateWizardDraft(draft);
    expect(evaluation.success).toBe(true);
    if (!evaluation.success) return;

    expect(
      createResearchResultsViewModel(evaluation.evaluation).score.activeBlocker,
    ).toMatchObject({
      label: "Negative destination cushion",
      scoreCap: 59,
      explanation: expect.stringContaining("prevents a favorable score"),
      evidenceRefs: expect.arrayContaining([
        "derived.financial.destination_monthly_cushion",
      ]),
    });
  });

  it("keeps illustrative finances separate from the benchmark metric", () => {
    const model = createResearchResultsViewModel();

    expect(model.finances.origin.cushion).toBe("$1,500");
    expect(model.finances.destination.cushion).toBe("$1,500");
    expect(model.finances.cushionDelta).toBe("$0");
    expect(model.priority.originValue).toBe("30.7 min");
    expect(model.priority.destinationValue).toBe("30.0 min");
    expect(model.priority.classification).toBe("similar");
    expect(model.housingContext.decisionUse).toBe("context_only");
    expect(model.housingContext.boundary).toBe("Area context—not your budget");
    expect(model.housingContext.originValue).toBe("$2,114");
    expect(model.housingContext.destinationValue).toBe("$2,050");
    expect(model.housingContext.delta).toBe("-$64");
    expect(model.condition.label).toBe("No clear advantage yet");
    expect(model.finances.origin.housing).toBe("$2,000");
    expect(model.finances.destination.housing).toBe("$2,000");
    expect(model.comparison.financialRows).toEqual([
      {
        id: "monthly_cushion",
        label: "Monthly cushion",
        originValue: "$1,500",
        destinationValue: "$1,500",
        deltaValue: "$0",
        classification: "similar",
        emphasis: true,
      },
      {
        id: "take_home_income",
        label: "Take-home income",
        originValue: "$5,000",
        destinationValue: "$5,000",
        deltaValue: "$0",
        classification: "similar",
        emphasis: false,
      },
      {
        id: "housing_cost",
        label: "Housing",
        originValue: "$2,000",
        destinationValue: "$2,000",
        deltaValue: "$0",
        classification: "similar",
        emphasis: false,
      },
      {
        id: "recurring_expenses",
        label: "Other recurring expenses",
        originValue: "$1,500",
        destinationValue: "$1,500",
        deltaValue: "$0",
        classification: "similar",
        emphasis: false,
      },
    ]);
  });

  it("exposes verifiable source lineage", () => {
    const model = createResearchResultsViewModel();

    expect(model.evidence.publisher).toBe("U.S. Census Bureau");
    expect(model.evidence.observationPeriod).toBe("2024 ACS 1-year estimates");
    expect(model.evidence.snapshotSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(model.evidence.rawSnapshotSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(model.climateEvidence).toBeNull();
    expect(model.nextSteps).toHaveLength(4);
    expect(model.housingContext.evidence.tableId).toBe("B25064");
    expect(model.housingContext.evidence.snapshotSha256).toMatch(
      /^[a-f0-9]{64}$/,
    );
  });

  it("renders a verified user-reviewed evaluation without hidden inputs", () => {
    const evaluation = evaluateWizardDraft(reviewedDraft());
    expect(evaluation.success).toBe(true);
    if (!evaluation.success) return;

    const model = createResearchResultsViewModel(evaluation.evaluation);

    expect(model.finances.origin.gross).toBe("Not available");
    expect(model.finances.destination.gross).toBe("Not available");
    expect(model.finances.destination.takeHome).toBe("$5,250");
    expect(model.finances.destination.housing).toBe("$1,750");
    expect(model.finances.destination.retainedPropertyNet).toBe("-$100");
    expect(model.stability.level).not.toBe("not_evaluated");
    expect(model.climate).toMatchObject({
      preference: "fewer hot days",
      classification: "improves",
      originSummary: expect.stringContaining("Warm to hot"),
      destinationSummary: expect.stringContaining("Mild summers"),
      traitChanges: [
        "noticeably milder summers",
        "noticeably colder winters",
        "noticeably more humid",
        "noticeably wetter",
        "much less sunny",
      ],
    });
    expect(model.climate).not.toHaveProperty("originStation");
    expect(model.climate).not.toHaveProperty("destinationStation");
    expect(model.climateEvidence).toMatchObject({
      publisher: expect.stringContaining("NOAA"),
      observationPeriod: "1991-2020 climate normal",
    });
    expect(model.comparison.financialRows.map(({ id }) => id)).toContain(
      "retained_property_net",
    );
    expect(model.nextSteps[0]).toBe(
      "Add any household factors that could materially change day-to-day life.",
    );
  });

  it("activates deterministic rule 0.2.0 only with its verified Wizard context", () => {
    const draft = reviewedDraft();
    draft.householdPlan.housing.stopsMove = "yes";
    draft.householdPlan.housing.maxMonthlyCost = "1700";
    const evaluation = evaluateWizardDraft(draft);
    expect(evaluation.success).toBe(true);
    if (!evaluation.success) return;

    const model = createResearchResultsViewModel(evaluation.evaluation, {
      analysis: evaluation.deterministicAnalysis,
      householdAnswers: evaluation.householdAnswers,
    });

    expect(model.condition.label).toBe("No clear advantage yet");
    expect(model.score).toMatchObject({
      value: evaluation.deterministicAnalysis.result.value,
      scoreVersion: "0.2.0",
      mode: "deterministic",
      decisionChangingAssumption: {
        changesConditionTo: "High financial risk under these assumptions",
      },
      readiness: {
        label: "Public estimates + your inputs",
        tone: "benchmark",
        explanation: expect.stringContaining(
          "housing-burden safety check could not run",
        ),
      },
      essentialSummary: {
        label: "1 essential need not met",
        tone: "risk",
        active: true,
      },
    });
    expect(model.comparison.financialRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "monthly_cushion",
          sourceLabel: "MoveWise calculated",
        }),
        expect.objectContaining({
          id: "take_home_income",
          sourceLabel: "You told us",
        }),
      ]),
    );
    expect(model.household).toMatchObject({
      modeLabel: "Individual move",
      rentalPlan: null,
    });
    expect(model.household).not.toHaveProperty("factors");
    expect(model.score.missingComponents).toEqual([
      "Expanded household and ownership fit",
      "Opportunity context",
    ]);
    expect(model.nextSteps[0]).toBe(
      "Resolve the unmet essential need: suitable housing.",
    );
    expect(model.nextSteps).not.toContain(
      "Add any household factors that could materially change day-to-day life.",
    );
  });

  it("explains how the source-backed rental requirement affects the score", () => {
    const draft = reviewedDraft();
    draft.finances.targetHousing = "";
    draft.finances.targetTakeHome = "";
    draft.finances.targetExpenses = "";
    draft.householdPlan.housing.assessment = "positive";
    draft.householdPlan.supportNetwork = {
      needed: "yes",
      stopsMove: "no",
      assessment: "positive",
    };
    const submission = submitWizardDraft(draft);
    expect(submission.success).toBe(true);
    if (!submission.success) return;

    const model = createResearchResultsViewModel(submission.evaluation, {
      analysis: submission.deterministicAnalysis,
      householdAnswers: submission.householdAnswers,
      destinationAssumptions: submission.destinationAssumptions,
    });

    expect(model.household).toMatchObject({
      modeLabel: "Individual move",
      rentalPlan: {
        stageLabel: "First stage: renting",
        laterPlanLabel: "No ownership timeline in this score",
        bedroomLabel: "2-bedroom rental",
        originRent: "$2,263",
        destinationRent: "$2,162",
        rentDifference: "$101 less",
        originStockShare: "38.1%",
        destinationStockShare: "34.1%",
        supplySignal: expect.stringContaining("smaller share"),
        realitySummary: expect.stringContaining("above your rent ceiling"),
        ceiling: "$2,000",
        ceilingStatus: "Above preferred rent ceiling",
        ceilingDifference: "$162 over",
        scorePath: expect.stringContaining(
          "already included in monthly cushion and the MoveWise Score",
        ),
      },
    });
    expect(model.household).not.toHaveProperty("factors");
    expect(submission.householdAnswers.questionVersion).toBe("4.0.0");
    expect(model.score.missingComponents).toEqual([
      "Expanded household and ownership fit",
      "Opportunity context",
    ]);
    expect(model.score.readiness).toMatchObject({
      label: "Public estimates + your inputs",
      tone: "benchmark",
    });
    expect(model.score.readiness.explanation).not.toContain("Preliminary");
    expect(model.score.readiness.explanation).not.toContain(
      "Needs confirmation",
    );
    expect(model.nextSteps).toEqual([]);
  });

  it("labels public estimates, baselines, overrides, and transition tenure separately", () => {
    const evaluation = evaluateWizardDraft(reviewedDraft());
    expect(evaluation.success).toBe(true);
    if (!evaluation.success) return;

    const model = createResearchResultsViewModel(evaluation.evaluation, {
      analysis: evaluation.deterministicAnalysis,
      householdAnswers: evaluation.householdAnswers,
      destinationAssumptions: {
        takeHome: "movewise_public_estimate",
        housing: "user_override",
        expenses: "movewise_baseline",
        currentHousingTenure: "own",
        destinationHousingTenure: "rent_then_buy",
        incomeGuidance: null,
        rentGuidance: null,
        expenseGuidance: null,
        requestedBedrooms: "2",
        maximumMonthlyRentDollars: 2000,
        rentCeilingNonNegotiable: false,
      },
    });

    expect(model.score.readiness.explanation).toContain(
      "user-edited destination amounts",
    );
    expect(model.comparison.financialRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "take_home_income",
          sourceLabel: "MoveWise public-data estimate",
        }),
        expect.objectContaining({
          id: "housing_cost",
          label: "Housing · owning → first stage rent",
          sourceLabel: "You told us",
        }),
        expect.objectContaining({
          id: "recurring_expenses",
          sourceLabel: "Fallback estimate",
        }),
      ]),
    );
    expect(
      model.comparison.financialRows.some((row) => row.needsConfirmation),
    ).toBe(false);
  });

  it("builds pair-specific Austin to San Diego results", () => {
    const draft = reviewedDraft();
    draft.originSlug = "austin-tx";
    draft.destinationSlug = "san-diego-ca";
    const evaluation = evaluateWizardDraft(draft);
    expect(evaluation.success).toBe(true);
    if (!evaluation.success) return;

    const model = createResearchResultsViewModel(evaluation.evaluation);

    expect(model.route).toMatchObject({
      originCity: "Austin",
      destinationCity: "San Diego",
    });
    expect(model.priority).toMatchObject({
      originValue: "28.2 min",
      destinationValue: "26.1 min",
      mobilityContext: {
        destinationCommuteAwayShare: "83.9%",
        reading: expect.stringContaining("commute away from home"),
        role: "Context only",
      },
    });
    expect(model.incomeLaborContext).toMatchObject({
      role: "Context only",
      originMedianHouseholdIncome: "$99,897",
      destinationMedianHouseholdIncome: "$109,132",
      reading: expect.stringContaining(
        "San Diego metro household income is higher than Austin",
      ),
      laborMarketBoundary: expect.stringContaining("not a salary prediction"),
      sourceLabel: "U.S. Census Bureau · ACS table B19013",
    });
    expect(model.familyCostContext).toMatchObject({
      role: "Context only",
      destinationMonthlyExpenses: "$1,661",
      reading: expect.stringContaining("family operating costs"),
      childcareBoundary: expect.stringContaining("not childcare-price data"),
    });
    expect(model.housingContext).toMatchObject({
      originValue: "$1,784",
      destinationValue: "$2,336",
      delta: "$552",
      reading: expect.stringContaining(
        "San Diego’s 2024 metro median was $552 higher than Austin",
      ),
    });
    expect(model.climate).toMatchObject({
      originSummary: expect.stringContaining("Very hot, humid summers"),
      destinationSummary: expect.stringContaining("Mild, dry, and sunny"),
      traitChanges: expect.arrayContaining(["much milder summers"]),
    });
  });

  it("reverses pair-specific evidence without retaining forward-route copy", () => {
    const draft = reviewedDraft();
    draft.originSlug = "san-diego-ca";
    draft.destinationSlug = "austin-tx";
    const evaluation = evaluateWizardDraft(draft);
    expect(evaluation.success).toBe(true);
    if (!evaluation.success) return;

    const model = createResearchResultsViewModel(evaluation.evaluation);

    expect(model.route).toMatchObject({
      originCity: "San Diego",
      destinationCity: "Austin",
    });
    expect(model.priority).toMatchObject({
      originValue: "26.1 min",
      destinationValue: "28.2 min",
    });
    expect(model.housingContext).toMatchObject({
      originValue: "$2,336",
      destinationValue: "$1,784",
      delta: "-$552",
      reading: expect.stringContaining(
        "Austin’s 2024 metro median was $552 lower than San Diego",
      ),
    });
    expect(model.climate?.traitChanges).toContain("much hotter summers");
    expect(model.housingContext.reading).not.toContain("Seattle");
  });

  it("omits the commute card when the user says it does not matter", () => {
    const draft = reviewedDraft();
    draft.commuteImportance = "does_not_matter";
    const evaluation = evaluateWizardDraft(draft);
    expect(evaluation.success).toBe(true);
    if (!evaluation.success) return;

    const model = createResearchResultsViewModel(evaluation.evaluation);

    expect(model.priority).toBeNull();
  });

  it("builds the complete results experience when commute is excluded and ranges are omitted", () => {
    const draft = reviewedDraft();
    draft.commuteImportance = "does_not_matter";
    draft.finances.targetTakeHome = "5000";
    draft.finances.targetHousing = "2000";
    draft.finances.targetExpenses = "1500";
    draft.finances.retainedPropertyNet = "0";
    draft.finances.targetTakeHomeRangeMin = "";
    draft.finances.targetTakeHomeRangeMax = "";
    draft.finances.targetHousingRangeMin = "";
    draft.finances.targetHousingRangeMax = "";
    draft.finances.targetExpensesRangeMin = "";
    draft.finances.targetExpensesRangeMax = "";
    draft.finances.retainedPropertyNetRangeMin = "";
    draft.finances.retainedPropertyNetRangeMax = "";
    const evaluation = evaluateWizardDraft(draft);
    expect(evaluation.success).toBe(true);
    if (!evaluation.success) return;

    expect(
      createResearchResultsViewModel(evaluation.evaluation).priority,
    ).toBeNull();
    expect(
      createVerifiedWhatIfViewModel(evaluation.evaluation).controls,
    ).toHaveLength(3);
  });

  it("omits the climate card when the user declares no heat preference", () => {
    const draft = reviewedDraft();
    draft.climateHeatPreference = "does_not_matter";
    const evaluation = evaluateWizardDraft(draft);
    expect(evaluation.success).toBe(true);
    if (!evaluation.success) return;
    expect(
      createResearchResultsViewModel(evaluation.evaluation).climate,
    ).toBeNull();
    expect(
      createResearchResultsViewModel(evaluation.evaluation).climateEvidence,
    ).toBeNull();
    expect(
      createResearchResultsViewModel(evaluation.evaluation).confidence
        .explanation,
    ).not.toContain("NOAA");
  });

  it("exposes exact favorable thresholds inside the declared ranges", () => {
    const model = createResearchWhatIfViewModel();

    expect(model.controls).toHaveLength(3);
    expect(model.changed).toBe(false);
    expect(model.result.condition.label).toBe("No clear advantage yet");
    expect(model.thresholds).toEqual([
      expect.objectContaining({
        label: "Take-home income",
        operator: "at least",
        threshold: "$5,250",
      }),
      expect.objectContaining({
        label: "Housing",
        operator: "at or below",
        threshold: "$1,750",
      }),
      expect.objectContaining({
        label: "Recurring expenses",
        operator: "at or below",
        threshold: "$1,250",
      }),
    ]);
  });

  it("reevaluates the canonical decision when an assumption changes", () => {
    const model = createResearchWhatIfViewModel({
      takeHomeIncomeCents: 500_000,
      housingCostCents: 175_000,
      recurringExpensesCents: 150_000,
      retainedPropertyNetCents: 0,
    });

    expect(model.changed).toBe(true);
    expect(model.result.condition.label).toBe("Worth a closer look");
    expect(model.result.monthlyCushion).toBe("$1,750");
    expect(model.result.cushionDelta).toBe("$250");
    expect(model.result.classification).toBe("improves");
  });

  it("builds controls and thresholds from a reviewed user evaluation", () => {
    const draft = reviewedDraft();
    draft.climateHeatPreference = "does_not_matter";
    draft.finances.targetTakeHome = "5000";
    draft.finances.targetHousing = "2000";
    draft.finances.targetExpenses = "1500";
    draft.finances.retainedPropertyNet = "0";
    const evaluation = evaluateWizardDraft(draft);
    expect(evaluation.success).toBe(true);
    if (!evaluation.success) return;

    const baseline = createVerifiedWhatIfViewModel(evaluation.evaluation);
    expect(baseline.controls).toHaveLength(3);
    expect(baseline.controls.map((control) => control.label)).not.toContain(
      "Retained-property monthly net",
    );
    expect(baseline.thresholds.length).toBeGreaterThan(0);

    const updated = createVerifiedWhatIfViewModel(evaluation.evaluation, {
      ...baseline.values,
      housingCostCents: 175_000,
    });
    expect(updated.changed).toBe(true);
    expect(updated.result.condition.label).not.toBe(
      baseline.result.condition.label,
    );
  });
});
