import type {
  VerifiedMoveWiseHouseholdAnswers,
  VerifiedResearchEvaluationResult,
} from "@workspace/contracts";

import type {
  DestinationPlanningAssumptions,
  DestinationPlanningSource,
} from "./destination-planning-assumptions";
import { householdFactorLabels } from "./model";
import { getHouseholdConstraintDefinitionByFactorId } from "./household-constraints";

export type MoveWiseValueOrigin = "user" | "movewise" | "imported";
export type MoveWiseEvidenceStatus = "estimated" | "verified" | null;
export type MoveWiseKnowledgeStatus = "known" | "unknown" | "not_applicable";

export type MoveWiseOpenCheck = Readonly<{
  id: string;
  moduleId: "budget" | "first_home" | "household";
  fieldId: string;
  knowledge: MoveWiseKnowledgeStatus;
  origin: MoveWiseValueOrigin | null;
  evidenceStatus: MoveWiseEvidenceStatus;
  role: "constraint" | "blocker";
  severity: "check" | "major" | "blocker";
  label: string;
  action: string;
}>;

type DecisionLedgerInput = Readonly<{
  scenario: VerifiedResearchEvaluationResult["scenarioInput"];
  householdAnswers: VerifiedMoveWiseHouseholdAnswers;
  destinationAssumptions: DestinationPlanningAssumptions;
  activeBlockerCodes?: readonly string[];
}>;

const originFromPlanningSource = (
  source: DestinationPlanningSource,
): MoveWiseValueOrigin => (source === "user_override" ? "user" : "movewise");

const evidenceFromBasis = (
  basis: "confirmed" | "user_estimate" | "assumed_same_as_origin",
): Exclude<MoveWiseEvidenceStatus, null> =>
  basis === "confirmed" ? "verified" : "estimated";

const financialCheck = (options: {
  id: string;
  fieldId: string;
  label: string;
  action: string;
  source: DestinationPlanningSource;
  basis: "confirmed" | "user_estimate" | "assumed_same_as_origin";
}): MoveWiseOpenCheck | null => {
  const evidenceStatus = evidenceFromBasis(options.basis);
  if (evidenceStatus === "verified") return null;
  return {
    id: options.id,
    moduleId: "budget",
    fieldId: options.fieldId,
    knowledge: "known",
    origin: originFromPlanningSource(options.source),
    evidenceStatus,
    role: "constraint",
    severity: "check",
    label: options.label,
    action: options.action,
  };
};

export function createMoveWiseOpenCheckLedger({
  scenario,
  householdAnswers,
  destinationAssumptions,
  activeBlockerCodes = [],
}: DecisionLedgerInput): readonly MoveWiseOpenCheck[] {
  const destination = scenario.finances.destination;
  const checks: MoveWiseOpenCheck[] = [];
  if (activeBlockerCodes.includes("negative_destination_cushion")) {
    const verified = [
      destination.takeHomeIncome.basis,
      destination.housingCost.basis,
      destination.recurringExpensesExcludingHousing.basis,
      destination.retainedPropertyNet.basis,
    ].every((basis) => basis === "confirmed");
    checks.push({
      id: "budget.destination.monthly-cushion",
      moduleId: "budget",
      fieldId: "finances.targetTakeHome",
      knowledge: "known",
      origin: null,
      evidenceStatus: verified ? "verified" : "estimated",
      role: "blocker",
      severity: "blocker",
      label: "Resolve the negative destination budget",
      action:
        "Adjust income, rent, or recurring expenses until the destination month has breathing room.",
    });
  }
  if (
    activeBlockerCodes.includes(
      "destination_housing_burden_at_or_above_50_percent",
    )
  ) {
    const verified =
      destination.housingCost.basis === "confirmed" &&
      destination.grossIncome?.basis === "confirmed";
    checks.push({
      id: "budget.destination.housing-burden",
      moduleId: "budget",
      fieldId: "finances.targetGrossIncome",
      knowledge: "known",
      origin: null,
      evidenceStatus: verified ? "verified" : "estimated",
      role: "blocker",
      severity: "blocker",
      label: "Resolve the destination housing burden",
      action:
        "Adjust rent or gross income until housing is below half of monthly gross income.",
    });
  }
  const financialChecks = [
    financialCheck({
      id: "budget.destination.take-home",
      fieldId: "finances.targetTakeHome",
      label: "Verify destination take-home",
      action:
        "Replace the planning estimate with a paycheck or job-specific amount.",
      source: destinationAssumptions.takeHome,
      basis: destination.takeHomeIncome.basis,
    }),
    financialCheck({
      id: "budget.destination.housing",
      fieldId: "finances.targetHousing",
      label: "Verify destination rent",
      action: "Check current listings that match the home size you need.",
      source: destinationAssumptions.housing,
      basis: destination.housingCost.basis,
    }),
    financialCheck({
      id: "budget.destination.recurring-expenses",
      fieldId: "finances.targetExpenses",
      label: "Verify destination recurring expenses",
      action: "Replace the regional estimate with a household-specific budget.",
      source: destinationAssumptions.expenses,
      basis: destination.recurringExpensesExcludingHousing.basis,
    }),
  ].filter((check): check is MoveWiseOpenCheck => check !== null);
  checks.push(...financialChecks);

  if (destination.grossIncome === null) {
    checks.push({
      id: "budget.destination.gross-income",
      moduleId: "budget",
      fieldId: "finances.targetGrossIncome",
      knowledge: "unknown",
      origin: null,
      evidenceStatus: null,
      role: "constraint",
      severity: "major",
      label: "Add destination gross income",
      action:
        "Add monthly gross income to run the housing-burden safety check.",
    });
  } else if (destination.grossIncome.basis !== "confirmed") {
    checks.push({
      id: "budget.destination.gross-income",
      moduleId: "budget",
      fieldId: "finances.targetGrossIncome",
      knowledge: "known",
      origin: "user",
      evidenceStatus: "estimated",
      role: "constraint",
      severity: "major",
      label: "Verify destination gross income",
      action:
        "Confirm the gross-income amount used for the housing-burden check.",
    });
  }

  if (
    destinationAssumptions.currentHousingTenure === "own" &&
    destination.retainedPropertyNet.basis !== "confirmed"
  ) {
    checks.push({
      id: "budget.destination.retained-property",
      moduleId: "budget",
      fieldId: "finances.retainedPropertyNet",
      knowledge: "known",
      origin: "user",
      evidenceStatus: "estimated",
      role: "constraint",
      severity: "check",
      label: "Verify retained-property impact",
      action: "Confirm the monthly income or cost of keeping the property.",
    });
  }

  if (destinationAssumptions.rentCeilingType === "not_sure") {
    checks.push({
      id: "first-home.rent-ceiling-meaning",
      moduleId: "first_home",
      fieldId: "householdPlan.housing.ceilingType",
      knowledge: "unknown",
      origin: "user",
      evidenceStatus: null,
      role: "constraint",
      severity: "major",
      label: "Decide how firm the rent ceiling is",
      action:
        "Choose whether the amount is a hard limit, a target, or a flexible planning reference.",
    });
  }

  const evaluatedRentDollars = Math.round(
    destination.housingCost.monthlyCents / 100,
  );
  if (evaluatedRentDollars > destinationAssumptions.maximumMonthlyRentDollars) {
    checks.push({
      id: "first-home.rent-ceiling",
      moduleId: "first_home",
      fieldId: "householdPlan.housing.maxMonthlyCost",
      knowledge: "known",
      origin: "user",
      evidenceStatus: "verified",
      role: destinationAssumptions.rentCeilingNonNegotiable
        ? "blocker"
        : "constraint",
      severity: destinationAssumptions.rentCeilingNonNegotiable
        ? "blocker"
        : "major",
      label: "Resolve the rent-ceiling conflict",
      action: `Find a suitable home at or below $${destinationAssumptions.maximumMonthlyRentDollars.toLocaleString("en-US")} or change the constraint.`,
    });
  }

  for (const answer of householdAnswers.factors) {
    if (
      answer.factorId === "space_fit" ||
      answer.importance === "not_applicable"
    )
      continue;
    const label =
      householdFactorLabels[
        answer.factorId as keyof typeof householdFactorLabels
      ];
    const definition = getHouseholdConstraintDefinitionByFactorId(
      answer.factorId,
    );
    const isBlocker = answer.importance === "essential";
    const isUnchecked =
      answer.impact === "unavailable" ||
      (isBlocker && answer.essentialStatus === "unconfirmed");
    const isUnmet =
      answer.impact === "negative" ||
      answer.impact === "strong_negative" ||
      (isBlocker && answer.essentialStatus === "confirmed_unmet");
    if (isUnchecked) {
      checks.push({
        id: `household.${answer.factorId}`,
        moduleId: "household",
        fieldId: `householdPlan.${definition.key}.status`,
        knowledge: "unknown",
        origin: "user",
        evidenceStatus: null,
        role: isBlocker ? "blocker" : "constraint",
        severity: isBlocker ? "major" : "check",
        label: `Check ${label.toLowerCase()}`,
        action: `Confirm whether ${label.toLowerCase()} will work before relying on this result.`,
      });
    }
    if (isUnmet) {
      checks.push({
        id: `household.${answer.factorId}`,
        moduleId: "household",
        fieldId: `householdPlan.${definition.key}.status`,
        knowledge: "known",
        origin: "user",
        evidenceStatus: "verified",
        role: isBlocker ? "blocker" : "constraint",
        severity: isBlocker ? "blocker" : "major",
        label: `Resolve ${label.toLowerCase()}`,
        action: `Change the plan or resolve the unmet need: ${label.toLowerCase()}.`,
      });
    }
  }

  return checks;
}

export const moveWiseOriginLabel: Record<MoveWiseValueOrigin, string> = {
  user: "You entered",
  movewise: "MoveWise estimate",
  imported: "Imported",
};

export const moveWiseEvidenceLabel: Record<
  Exclude<MoveWiseEvidenceStatus, null>,
  string
> = {
  estimated: "Estimated",
  verified: "Verified",
};
