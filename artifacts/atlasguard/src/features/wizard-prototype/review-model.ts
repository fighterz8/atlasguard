import {
  getResearchMetroClimateRiskGuidance,
  getResearchMetroFamilyCostGuidance,
  getResearchMetroMobilityGuidance,
  getResearchMetroOwnershipGuidance,
  getSupportedResearchPlace,
} from "@workspace/benchmark-data";

import { submitWizardDraft } from "./submit-wizard-draft";
import {
  createMoveWiseOpenCheckLedger,
  type MoveWiseEvidenceStatus,
  type MoveWiseOpenCheck,
  type MoveWiseValueOrigin,
} from "./decision-ledger";
import { householdFactorLabels } from "./model";
import type { WizardErrors, WizardPrototypeDraft } from "./model";
import type { DestinationPlanningSource } from "./destination-planning-assumptions";
import {
  createMoveWiseDecisionGateModel,
  type MoveWiseDecisionGateModel,
} from "./decision-gate-model";

type ReviewTone = "favorable" | "caution" | "risk" | "neutral" | "unavailable";
type ReviewRole = "Scored" | "Used in estimate" | "Context only";
export type ReviewGroup = "best_signs" | "pressure_points" | "family_checks";

export type MoveWiseReviewFinding = Readonly<{
  id: string;
  label: string;
  detail: string;
  tone: ReviewTone;
  role: ReviewRole;
  group: ReviewGroup;
}>;

export type MoveWiseReviewAssumption = Readonly<{
  id: string;
  label: string;
  value: string;
  source: string;
  origin: MoveWiseValueOrigin;
  evidenceStatus: MoveWiseEvidenceStatus;
  role: ReviewRole;
  tone: ReviewTone;
}>;

export type MoveWiseReviewCoverage = Readonly<{
  id: string;
  label: string;
  detail: string;
  tone: ReviewTone;
}>;

export type MoveWiseReviewModel = Readonly<{
  routeLabel: string;
  originCity: string;
  destinationCity: string;
  housingStage: string;
  housingLaterPlan: string;
  scoringScope: string;
  findings: readonly MoveWiseReviewFinding[];
  assumptions: readonly MoveWiseReviewAssumption[];
  openChecks: readonly MoveWiseOpenCheck[];
  decisionGate: MoveWiseDecisionGateModel;
  coverage: readonly MoveWiseReviewCoverage[];
}>;

export type MoveWiseReviewResult =
  | Readonly<{ success: true; model: MoveWiseReviewModel }>
  | Readonly<{ success: false; errors: WizardErrors }>;

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const formatMoney = (cents: number) => dollars.format(cents / 100);
const formatDollars = (value: number) => dollars.format(value);
const formatPercent = (basisPoints: number) =>
  `${(basisPoints / 100).toFixed(1)}%`;

const planningSourceLabel: Record<DestinationPlanningSource, string> = {
  movewise_public_estimate: "MoveWise estimated this",
  movewise_baseline: "Starting point to edit",
  user_override: "You entered this",
};

const planningSourceTone: Record<DestinationPlanningSource, ReviewTone> = {
  movewise_public_estimate: "neutral",
  movewise_baseline: "caution",
  user_override: "favorable",
};

const planningSourceOrigin: Record<
  DestinationPlanningSource,
  MoveWiseValueOrigin
> = {
  movewise_public_estimate: "movewise",
  movewise_baseline: "movewise",
  user_override: "user",
};

const evidenceStatusFromBasis = (
  basis: "confirmed" | "user_estimate" | "assumed_same_as_origin",
): Exclude<MoveWiseEvidenceStatus, null> =>
  basis === "confirmed" ? "verified" : "estimated";

const differenceText = (amount: number, noun: string) =>
  `${formatDollars(Math.abs(amount))} ${amount <= 0 ? "lower" : "higher"} ${noun}`;

const ownershipContextApplies = (tenure: string) =>
  tenure === "rent_then_buy" || tenure === "buy";

const householdEssentialSummary = (
  householdAnswers: Extract<
    ReturnType<typeof submitWizardDraft>,
    { success: true }
  >["householdAnswers"],
) => {
  const essential = householdAnswers.factors.filter(
    ({ importance }) => importance === "essential",
  );
  const confirmed = essential.filter(
    ({ essentialStatus }) => essentialStatus === "confirmed_met",
  );
  const unconfirmed = essential.filter(
    ({ essentialStatus }) => essentialStatus === "unconfirmed",
  );
  const unmet = essential.filter(
    ({ essentialStatus }) => essentialStatus === "confirmed_unmet",
  );
  const important = householdAnswers.factors.filter(
    ({ importance, impact }) =>
      importance === "important" && impact !== "unavailable",
  );

  const named = [...unmet, ...unconfirmed, ...confirmed, ...important]
    .slice(0, 4)
    .map(
      ({ factorId }) =>
        householdFactorLabels[factorId as keyof typeof householdFactorLabels],
    );

  return {
    confirmedCount: confirmed.length,
    unconfirmedCount: unconfirmed.length,
    unmetCount: unmet.length,
    importantCount: important.length,
    names: named,
  };
};

const supplyComparisonText = (
  destinationCity: string,
  originCity: string,
  stockCategoryLabel: string,
  destinationShareBps: number,
  differenceBps: number,
) => {
  const category = stockCategoryLabel.replace(/^./, (letter) =>
    letter.toUpperCase(),
  );
  const direction =
    Math.abs(differenceBps) < 50
      ? `a similar share of renter homes in ${destinationCity} and ${originCity}`
      : differenceBps > 0
        ? `a larger share of renter homes in ${destinationCity} than ${originCity}`
        : `a smaller share of renter homes in ${destinationCity} than ${originCity}`;
  const scarcity =
    destinationShareBps < 1_000
      ? "That still makes this requirement a relatively narrow part of the rental market."
      : "That is a market-level availability signal, not a live listing count.";
  return `${category} are ${formatPercent(destinationShareBps)} of ${destinationCity} renter homes, ${direction}. ${scarcity}`;
};

export function createMoveWiseReviewModel(
  draft: WizardPrototypeDraft,
): MoveWiseReviewResult {
  const result = submitWizardDraft(draft);
  if (!result.success) return { success: false, errors: result.errors };

  const origin = getSupportedResearchPlace(draft.originSlug);
  const destination = getSupportedResearchPlace(draft.destinationSlug);
  if (origin === null || destination === null) {
    return {
      success: false,
      errors: {
        destinationSlug:
          "MoveWise could not resolve this comparison for review.",
      },
    };
  }
  const profile = result.evaluation.decisionProfile;
  const finances = profile.financialPosition;
  const cushionDelta =
    finances.destination.monthlyCushionCents -
    finances.origin.monthlyCushionCents;
  const assumptions = result.destinationAssumptions;
  const rentGuidance = assumptions.rentGuidance;
  const incomeGuidance = assumptions.incomeGuidance;
  const expenseGuidance = assumptions.expenseGuidance;
  const familyCostGuidance = getResearchMetroFamilyCostGuidance(
    draft.originSlug,
    draft.destinationSlug,
    Number(draft.finances.currentExpenses.trim().replace(/,/g, "")),
  );
  const ownershipGuidance = getResearchMetroOwnershipGuidance(
    draft.originSlug,
    draft.destinationSlug,
  );
  const climateRiskGuidance = getResearchMetroClimateRiskGuidance(
    draft.originSlug,
    draft.destinationSlug,
  );
  const mobilityGuidance = getResearchMetroMobilityGuidance(
    draft.originSlug,
    draft.destinationSlug,
  );
  const destinationHousing =
    result.evaluation.scenarioInput.finances.destination.housingCost
      .monthlyCents;
  const destinationTakeHome =
    result.evaluation.scenarioInput.finances.destination.takeHomeIncome
      .monthlyCents;
  const destinationExpenses =
    result.evaluation.scenarioInput.finances.destination
      .recurringExpensesExcludingHousing.monthlyCents;
  const destinationFinanceInputs =
    result.evaluation.scenarioInput.finances.destination;
  const rentCeilingDifference =
    assumptions.maximumMonthlyRentDollars - destinationHousing / 100;

  const findings: Array<Omit<MoveWiseReviewFinding, "group">> = [];

  if (incomeGuidance) {
    const incomeDelta =
      incomeGuidance.suggestedMonthlyTakeHomeDollars -
      incomeGuidance.currentMonthlyTakeHomeDollars;
    findings.push({
      id: "destination-income",
      label: "Expected take-home",
      detail: `${destination.city} take-home starts at ${formatDollars(
        incomeGuidance.suggestedMonthlyTakeHomeDollars,
      )}, ${differenceText(incomeDelta, "than your current take-home")} based on the metro income difference.`,
      tone: incomeDelta >= 0 ? "favorable" : "caution",
      role: "Used in estimate",
    });
  }

  if (rentGuidance) {
    findings.push({
      id: "bedroom-rent-fit",
      label: "Rent for the home size you need",
      detail: `${rentGuidance.rentCategoryLabel} is ${differenceText(
        rentGuidance.monthlyDifferenceDollars,
        `than ${origin.city}`,
      )}. ${rentGuidance.stockCategoryLabel.replace(/^./, (letter) =>
        letter.toUpperCase(),
      )} are ${formatPercent(
        rentGuidance.destination.renterStockShareBps,
      )} of ${destination.city} renter homes.`,
      tone: rentGuidance.monthlyDifferenceDollars <= 0 ? "favorable" : "risk",
      role: "Scored",
    });

    findings.push({
      id: "rental-supply",
      label: "How common those rentals are",
      detail: supplyComparisonText(
        destination.city,
        origin.city,
        rentGuidance.stockCategoryLabel,
        rentGuidance.destination.renterStockShareBps,
        rentGuidance.renterStockShareDifferenceBps,
      ),
      tone:
        rentGuidance.destination.renterStockShareBps < 1_000
          ? "caution"
          : "neutral",
      role: "Context only",
    });

    findings.push({
      id: "rent-ceiling-fit",
      label: "Rent ceiling fit",
      detail:
        rentCeilingDifference >= 0
          ? `${formatMoney(destinationHousing)} is ${formatDollars(
              rentCeilingDifference,
            )} under your rent ceiling.`
          : `${formatMoney(destinationHousing)} is ${formatDollars(
              Math.abs(rentCeilingDifference),
            )} over your rent ceiling.`,
      tone: rentCeilingDifference >= 0 ? "favorable" : "risk",
      role: assumptions.rentCeilingNonNegotiable ? "Scored" : "Context only",
    });
  }

  if (
    ownershipContextApplies(assumptions.destinationHousingTenure) &&
    ownershipGuidance
  ) {
    findings.push({
      id: "ownership-later",
      label:
        assumptions.destinationHousingTenure === "buy"
          ? "Buying context"
          : "Buying later",
      detail: `${destination.city} owner-occupied median value is ${differenceText(
        ownershipGuidance.ownerValueDifferenceDollars,
        `than ${origin.city}`,
      )}; selected monthly owner costs with a mortgage are ${differenceText(
        ownershipGuidance.monthlyOwnerCostWithMortgageDifferenceDollars,
        `than ${origin.city}`,
      )}. Keep this as a later-stage planning signal while the first move is rent-first.`,
      tone:
        ownershipGuidance.ownerValueDirection === "higher" ||
        ownershipGuidance.ownerCostDirection === "higher"
          ? "caution"
          : ownershipGuidance.ownerValueDirection === "lower" &&
              ownershipGuidance.ownerCostDirection === "lower"
            ? "favorable"
            : "neutral",
      role: ownershipGuidance.role,
    });
  }

  if (expenseGuidance) {
    const expenseDelta =
      expenseGuidance.suggestedMonthlyExpensesDollars -
      expenseGuidance.currentMonthlyExpensesDollars;
    findings.push({
      id: "recurring-expenses",
      label: "Everyday bills",
      detail: `${destination.city} non-housing recurring expenses start at ${formatDollars(
        expenseGuidance.suggestedMonthlyExpensesDollars,
      )}, ${differenceText(expenseDelta, "than your current expenses")} after adjusting for regional prices.`,
      tone: expenseDelta <= 0 ? "favorable" : "caution",
      role: "Used in estimate",
    });
  }

  if (familyCostGuidance) {
    findings.push({
      id: "family-operating-costs",
      label: "Family operating costs",
      detail: `${familyCostGuidance.summary} Childcare can still change the picture, so keep that need visible if it matters for your household.`,
      tone:
        familyCostGuidance.direction === "lower"
          ? "favorable"
          : familyCostGuidance.direction === "higher"
            ? "caution"
            : "neutral",
      role: familyCostGuidance.role,
    });
  }

  const householdSummary = householdEssentialSummary(result.householdAnswers);
  if (
    householdSummary.confirmedCount > 0 ||
    householdSummary.unconfirmedCount > 0 ||
    householdSummary.unmetCount > 0 ||
    householdSummary.importantCount > 0
  ) {
    findings.push({
      id: "household-essentials",
      label: "Household essentials",
      detail: `${householdSummary.unmetCount} must-have needs look blocked, ${householdSummary.unconfirmedCount} still need checking, and ${householdSummary.confirmedCount} look covered. Needs in view: ${householdSummary.names.join(", ")}.`,
      tone:
        householdSummary.unmetCount > 0
          ? "risk"
          : householdSummary.unconfirmedCount > 0
            ? "caution"
            : householdSummary.confirmedCount > 0
              ? "favorable"
              : "neutral",
      role: "Context only",
    });
  }

  if (climateRiskGuidance) {
    const hazards = climateRiskGuidance.destinationProminentHazards
      .map(({ label, rating }) => `${label}: ${rating}`)
      .join("; ");
    findings.push({
      id: "climate-risk-context",
      label: "Climate and hazard baseline",
      detail: `${climateRiskGuidance.summary} ${destination.city}'s area shows ${climateRiskGuidance.destination.overallRiskRating} overall baseline risk, with these prominent hazards: ${hazards}.`,
      tone:
        climateRiskGuidance.riskDirection === "higher" ||
        climateRiskGuidance.destination.overallRiskRating === "Very High"
          ? "caution"
          : "neutral",
      role: climateRiskGuidance.role,
    });
  }

  if (mobilityGuidance) {
    const commuteDelta = mobilityGuidance.displayCommuteDifferenceMinutes;
    const commuteAwayDifference =
      mobilityGuidance.commuteAwayShareDifferenceBps;
    const commuteAwayDirection =
      Math.abs(commuteAwayDifference) < 50
        ? "similar"
        : commuteAwayDifference > 0
          ? "higher"
          : "lower";
    findings.push({
      id: "daily-life-friction",
      label: "Daily commute feel",
      detail: `${destination.city} has a ${Math.abs(commuteDelta).toFixed(
        1,
      )}-minute ${commuteDelta <= 0 ? "shorter" : "longer"} typical commute. ${formatPercent(
        mobilityGuidance.destination.commuteAwayShareBps,
      )} of ${destination.city} workers commute away from home, a ${commuteAwayDirection} share than ${origin.city}.`,
      tone:
        commuteDelta > 2
          ? "caution"
          : commuteDelta < -2
            ? "favorable"
            : "neutral",
      role: "Context only",
    });
  }

  findings.push({
    id: "monthly-cushion",
    label: "Monthly breathing room",
    detail: `The destination budget is ${formatMoney(
      Math.abs(cushionDelta),
    )} ${cushionDelta >= 0 ? "better" : "worse"} per month with the numbers above.`,
    tone:
      cushionDelta > 0 ? "favorable" : cushionDelta < 0 ? "risk" : "neutral",
    role: "Scored",
  });

  findings.push({
    id: "biggest-caveat",
    label: "Big thing to remember",
    detail:
      "This pass is about the first stage of the move: renting, monthly budget, and must-have household needs. Buying, childcare details, schools, and neighborhood fit should be checked next if they matter.",
    tone: "caution",
    role: "Context only",
  });

  const reviewAssumptions: MoveWiseReviewAssumption[] = [
    {
      id: "take-home",
      label: "Destination take-home",
      value: formatMoney(destinationTakeHome),
      source: planningSourceLabel[assumptions.takeHome],
      origin: planningSourceOrigin[assumptions.takeHome],
      evidenceStatus: evidenceStatusFromBasis(
        destinationFinanceInputs.takeHomeIncome.basis,
      ),
      role: "Used in estimate",
      tone: planningSourceTone[assumptions.takeHome],
    },
    {
      id: "housing",
      label: "Destination rent",
      value: formatMoney(destinationHousing),
      source: planningSourceLabel[assumptions.housing],
      origin: planningSourceOrigin[assumptions.housing],
      evidenceStatus: evidenceStatusFromBasis(
        destinationFinanceInputs.housingCost.basis,
      ),
      role: "Scored",
      tone: planningSourceTone[assumptions.housing],
    },
    {
      id: "expenses",
      label: "Destination recurring expenses",
      value: formatMoney(destinationExpenses),
      source: planningSourceLabel[assumptions.expenses],
      origin: planningSourceOrigin[assumptions.expenses],
      evidenceStatus: evidenceStatusFromBasis(
        destinationFinanceInputs.recurringExpensesExcludingHousing.basis,
      ),
      role: "Used in estimate",
      tone: planningSourceTone[assumptions.expenses],
    },
    {
      id: "rent-ceiling",
      label: "Rent ceiling",
      value: formatDollars(assumptions.maximumMonthlyRentDollars),
      source:
        rentCeilingDifference >= 0
          ? `${formatDollars(rentCeilingDifference)} over the rent estimate`
          : `${formatDollars(Math.abs(rentCeilingDifference))} under the rent estimate`,
      origin: "user",
      evidenceStatus: "verified",
      role: assumptions.rentCeilingNonNegotiable ? "Scored" : "Context only",
      tone: rentCeilingDifference >= 0 ? "favorable" : "risk",
    },
  ];

  const coverage: MoveWiseReviewCoverage[] = [
    incomeGuidance
      ? {
          id: "income-source",
          label: "Income",
          detail: `${incomeGuidance.source.publisher}, ${incomeGuidance.source.observationPeriod}. Used to set a starting take-home estimate for the destination.`,
          tone: "neutral" as const,
        }
      : {
          id: "income-source",
          label: "Income",
          detail:
            "Public income guidance was unavailable, so MoveWise used the editable fallback baseline.",
          tone: "caution" as const,
        },
    rentGuidance
      ? {
          id: "rent-source",
          label: "Rent and rental stock",
          detail: `${rentGuidance.source.publisher}, ${rentGuidance.source.observationPeriod}. Used for rent by bedroom count and how common that rental size is.`,
          tone: "neutral" as const,
        }
      : {
          id: "rent-source",
          label: "Rent and rental stock",
          detail:
            "Bedroom-aware public rent guidance was unavailable for this move picture.",
          tone: "caution" as const,
        },
    mobilityGuidance
      ? {
          id: "mobility-source",
          label: "Mobility",
          detail: `${mobilityGuidance.source.publisher}, ${mobilityGuidance.source.observationPeriod}. Used for typical commute and work-from-home context.`,
          tone: "neutral" as const,
        }
      : {
          id: "mobility-source",
          label: "Mobility",
          detail:
            "Mobility context was unavailable for this supported comparison.",
          tone: "caution" as const,
        },
    ownershipGuidance
      ? {
          id: "ownership-source",
          label: "Ownership",
          detail: `${ownershipGuidance.source.publisher}, ${ownershipGuidance.source.observationPeriod}. Used only as buying-later context.`,
          tone: "neutral" as const,
        }
      : {
          id: "ownership-source",
          label: "Ownership",
          detail:
            "Owner value and selected owner-cost context was unavailable for this supported comparison.",
          tone: "caution" as const,
        },
    climateRiskGuidance
      ? {
          id: "climate-risk-source",
          label: "Climate and risk",
          detail: `${climateRiskGuidance.source.publisher} ${climateRiskGuidance.source.datasetVersion}. Used as area-level climate and hazard context.`,
          tone: "neutral" as const,
        }
      : {
          id: "climate-risk-source",
          label: "Climate and risk",
          detail:
            "FEMA county-level climate and natural-hazard context was unavailable for this supported comparison.",
          tone: "caution" as const,
        },
    expenseGuidance
      ? {
          id: "expense-source",
          label: "Recurring expenses",
          detail: `${expenseGuidance.source.publisher}, ${expenseGuidance.source.observationPeriod}. Used to adjust everyday non-housing expenses.`,
          tone: "neutral" as const,
        }
      : {
          id: "expense-source",
          label: "Recurring expenses",
          detail:
            "Regional price translation was unavailable, so MoveWise used the editable fallback baseline.",
          tone: "caution" as const,
        },
    {
      id: "missing-public-evidence",
      label: "Still worth checking",
      detail:
        "Buying details, childcare, school fit, neighborhood fit, property-level risk, and car needs may still matter for your family.",
      tone: "unavailable",
    },
  ];

  const familyCheckIds = new Set([
    "rental-supply",
    "household-essentials",
    "biggest-caveat",
  ]);
  const groupedFindings: MoveWiseReviewFinding[] = findings.map((finding) => ({
    ...finding,
    group: familyCheckIds.has(finding.id)
      ? "family_checks"
      : finding.tone === "favorable"
        ? "best_signs"
        : finding.tone === "risk" || finding.tone === "caution"
          ? "pressure_points"
          : "family_checks",
  }));
  const openChecks = createMoveWiseOpenCheckLedger({
    scenario: result.evaluation.scenarioInput,
    householdAnswers: result.householdAnswers,
    destinationAssumptions: result.destinationAssumptions,
    activeBlockerCodes: result.deterministicAnalysis.result.activeBlockerCodes,
  });

  return {
    success: true,
    model: {
      routeLabel: `${origin.city} to ${destination.city}`,
      originCity: origin.city,
      destinationCity: destination.city,
      housingStage:
        assumptions.destinationHousingTenure === "rent_then_buy"
          ? "Renting first"
          : assumptions.destinationHousingTenure === "buy"
            ? "Buying plan"
            : "Renting",
      housingLaterPlan:
        assumptions.destinationHousingTenure === "rent_then_buy"
          ? "Buying later stays on the checklist"
          : assumptions.destinationHousingTenure === "buy"
            ? "Buying details still need a separate check"
            : "No buying timeline added",
      scoringScope: "First-stage rent and monthly budget",
      findings: groupedFindings,
      assumptions: reviewAssumptions,
      openChecks,
      decisionGate: createMoveWiseDecisionGateModel(openChecks),
      coverage,
    },
  };
}
