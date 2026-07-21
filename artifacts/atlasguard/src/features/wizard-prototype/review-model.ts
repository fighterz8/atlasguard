import {
  getResearchMetroFamilyCostGuidance,
  getResearchMetroMobilityGuidance,
  getResearchMetroOwnershipGuidance,
  getSupportedResearchPlace,
} from "@workspace/benchmark-data";

import { submitWizardDraft } from "./submit-wizard-draft";
import type { WizardErrors, WizardPrototypeDraft } from "./model";
import type { DestinationPlanningSource } from "./destination-planning-assumptions";

type ReviewTone = "favorable" | "caution" | "risk" | "neutral" | "unavailable";
type ReviewRole = "Scored" | "Used in estimate" | "Context only";

export type MoveWiseReviewFinding = Readonly<{
  id: string;
  label: string;
  detail: string;
  tone: ReviewTone;
  role: ReviewRole;
}>;

export type MoveWiseReviewAssumption = Readonly<{
  id: string;
  label: string;
  value: string;
  source: string;
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
  movewise_public_estimate: "MoveWise public estimate",
  movewise_baseline: "MoveWise fallback baseline",
  user_override: "You entered this value",
};

const planningSourceTone: Record<DestinationPlanningSource, ReviewTone> = {
  movewise_public_estimate: "neutral",
  movewise_baseline: "caution",
  user_override: "favorable",
};

const differenceText = (amount: number, noun: string) =>
  `${formatDollars(Math.abs(amount))} ${amount <= 0 ? "lower" : "higher"} ${noun}`;

const ownershipContextApplies = (tenure: string) =>
  tenure === "rent_then_buy" || tenure === "buy";

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
  const rentCeilingDifference =
    assumptions.maximumMonthlyRentDollars - destinationHousing / 100;

  const findings: MoveWiseReviewFinding[] = [];

  if (incomeGuidance) {
    const incomeDelta =
      incomeGuidance.suggestedMonthlyTakeHomeDollars -
      incomeGuidance.currentMonthlyTakeHomeDollars;
    findings.push({
      id: "destination-income",
      label: "Destination income estimate",
      detail: `${destination.city} take-home starts at ${formatDollars(
        incomeGuidance.suggestedMonthlyTakeHomeDollars,
      )}, ${differenceText(incomeDelta, "than your current take-home")} using ACS metro income context.`,
      tone: incomeDelta >= 0 ? "favorable" : "caution",
      role: "Used in estimate",
    });
  }

  if (rentGuidance) {
    findings.push({
      id: "bedroom-rent-fit",
      label: "Bedroom-aware rent fit",
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
      label: "Rental supply signal",
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
          ? "Ownership context"
          : "Ownership-later context",
      detail: `${destination.city} owner-occupied median value is ${differenceText(
        ownershipGuidance.ownerValueDifferenceDollars,
        `than ${origin.city}`,
      )}; selected monthly owner costs with a mortgage are ${differenceText(
        ownershipGuidance.monthlyOwnerCostWithMortgageDifferenceDollars,
        `than ${origin.city}`,
      )}. This is not a mortgage quote or scored buying model.`,
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
      label: "Recurring expense translation",
      detail: `${destination.city} non-housing recurring expenses start at ${formatDollars(
        expenseGuidance.suggestedMonthlyExpensesDollars,
      )}, ${differenceText(expenseDelta, "than your current expenses")} using BEA regional prices.`,
      tone: expenseDelta <= 0 ? "favorable" : "caution",
      role: "Used in estimate",
    });
  }

  if (familyCostGuidance) {
    findings.push({
      id: "family-operating-costs",
      label: "Family operating costs",
      detail: `${familyCostGuidance.summary} This is not childcare-price data, so childcare remains context only until age-specific public evidence is added.`,
      tone:
        familyCostGuidance.direction === "lower"
          ? "favorable"
          : familyCostGuidance.direction === "higher"
            ? "caution"
            : "neutral",
      role: familyCostGuidance.role,
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
      label: "Daily-life friction",
      detail: `${destination.city} has a ${Math.abs(commuteDelta).toFixed(
        1,
      )}-minute ${commuteDelta <= 0 ? "shorter" : "longer"} typical commute. ${formatPercent(
        mobilityGuidance.destination.commuteAwayShareBps,
      )} of ${destination.city} workers commute away from home, a ${commuteAwayDirection} share than ${origin.city}. This is not a car-dependence score.`,
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
    label: "Monthly cushion direction",
    detail: `The destination budget is ${formatMoney(
      Math.abs(cushionDelta),
    )} ${cushionDelta >= 0 ? "better" : "worse"} per month before final score mechanics.`,
    tone:
      cushionDelta > 0 ? "favorable" : cushionDelta < 0 ? "risk" : "neutral",
    role: "Scored",
  });

  findings.push({
    id: "biggest-caveat",
    label: "Biggest caveat",
    detail:
      "MoveWise is evaluating the immediate rent-first stage. Ownership financing, childcare, schools, and neighborhood fit remain context only until user-reviewed inputs and approved rules are added.",
    tone: "caution",
    role: "Context only",
  });

  const reviewAssumptions: MoveWiseReviewAssumption[] = [
    {
      id: "take-home",
      label: "Destination take-home",
      value: formatMoney(destinationTakeHome),
      source: planningSourceLabel[assumptions.takeHome],
      role: "Used in estimate",
      tone: planningSourceTone[assumptions.takeHome],
    },
    {
      id: "housing",
      label: "Destination rent",
      value: formatMoney(destinationHousing),
      source: planningSourceLabel[assumptions.housing],
      role: "Scored",
      tone: planningSourceTone[assumptions.housing],
    },
    {
      id: "expenses",
      label: "Destination recurring expenses",
      value: formatMoney(destinationExpenses),
      source: planningSourceLabel[assumptions.expenses],
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
      role: assumptions.rentCeilingNonNegotiable ? "Scored" : "Context only",
      tone: rentCeilingDifference >= 0 ? "favorable" : "risk",
    },
  ];

  const coverage: MoveWiseReviewCoverage[] = [
    incomeGuidance
      ? {
          id: "income-source",
          label: "Income",
          detail: `${incomeGuidance.source.publisher} · ACS table ${incomeGuidance.source.tableId} · ${incomeGuidance.source.observationPeriod}`,
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
          detail: `${rentGuidance.source.publisher} · ACS tables ${rentGuidance.source.rentTableId}/${rentGuidance.source.stockTableId} · ${rentGuidance.source.observationPeriod}`,
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
          detail: `${mobilityGuidance.source.publisher} · ACS tables ${mobilityGuidance.source.commuteTableId}/${mobilityGuidance.source.workerModeTableId} · ${mobilityGuidance.source.observationPeriod}`,
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
          detail: `${ownershipGuidance.source.publisher} · ACS tables ${ownershipGuidance.source.ownerValueTableId}/${ownershipGuidance.source.selectedOwnerCostsTableId} · ${ownershipGuidance.source.observationPeriod}`,
          tone: "neutral" as const,
        }
      : {
          id: "ownership-source",
          label: "Ownership",
          detail:
            "Owner value and selected owner-cost context was unavailable for this supported comparison.",
          tone: "caution" as const,
        },
    expenseGuidance
      ? {
          id: "expense-source",
          label: "Recurring expenses",
          detail: `${expenseGuidance.source.publisher} · ${expenseGuidance.source.tableId} line ${expenseGuidance.source.lineCode} · ${expenseGuidance.source.observationPeriod}`,
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
      label: "Not scored yet",
      detail:
        "Expanded household, ownership financing, childcare, school, neighborhood, transportation-mode, and vehicle-availability evidence are not included in this v1 score.",
      tone: "unavailable",
    },
  ];

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
          ? "Ownership later is context only"
          : assumptions.destinationHousingTenure === "buy"
            ? "Ownership is context only in this score"
            : "No ownership timeline in this score",
      scoringScope: "Immediate rental stage · deterministic rule 0.2.0",
      findings,
      assumptions: reviewAssumptions,
      coverage,
    },
  };
}
