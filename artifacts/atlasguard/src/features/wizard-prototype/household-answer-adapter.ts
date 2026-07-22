import {
  MOVEWISE_HOUSEHOLD_ANSWER_SCHEMA_VERSION,
  MOVEWISE_HOUSEHOLD_EVIDENCE_PLAN_QUESTION_VERSION,
  MOVEWISE_HOUSEHOLD_FACTOR_IDS_BY_MODE,
  createMoveWiseHouseholdAnswers,
} from "@workspace/contracts";
import type {
  MoveWiseHouseholdAnswerPayload,
  VerifiedMoveWiseHouseholdAnswers,
} from "@workspace/contracts";

import {
  validateWizardStep,
  isHardRentCeiling,
  type ConditionalHouseholdNeed,
  type WizardErrors,
  type WizardPrototypeDraft,
} from "./model";

export type WizardHouseholdAnswerAdapterResult =
  | { success: true; answers: VerifiedMoveWiseHouseholdAnswers }
  | { success: false; errors: WizardErrors };

type HouseholdFactorAnswer = MoveWiseHouseholdAnswerPayload["factors"][number];

const excludedAnswer = (
  factorId: HouseholdFactorAnswer["factorId"],
): HouseholdFactorAnswer => ({
  factorId,
  importance: "not_applicable",
  impact: "excluded",
  essentialStatus: null,
});

const essentialStatusFromConstraint = (
  status: ConditionalHouseholdNeed["status"],
): NonNullable<HouseholdFactorAnswer["essentialStatus"]> => {
  switch (status) {
    case "works":
      return "confirmed_met";
    case "does_not_work":
      return "confirmed_unmet";
    case "not_checked":
    case "":
      return "unconfirmed";
  }
};

const impactFromConstraint = (
  status: ConditionalHouseholdNeed["status"],
): HouseholdFactorAnswer["impact"] => {
  switch (status) {
    case "works":
      return "positive";
    case "does_not_work":
      return "negative";
    case "not_checked":
    case "":
      return "unavailable";
  }
};

const answerFromConditionalNeed = (
  factorId: HouseholdFactorAnswer["factorId"],
  need: ConditionalHouseholdNeed,
): HouseholdFactorAnswer => {
  if (need.relevance === "") {
    throw new Error(
      `Household factor ${factorId} cannot be adapted while relevance is unknown.`,
    );
  }
  if (need.relevance === "no") return excludedAnswer(factorId);

  const isEssential = need.importance === "blocker";
  return {
    factorId,
    importance: isEssential ? "essential" : "important",
    impact: impactFromConstraint(need.status),
    essentialStatus: isEssential
      ? essentialStatusFromConstraint(need.status)
      : null,
  };
};

const parseWholeDollars = (value: string): number | null => {
  const normalized = value.trim().replace(/,/g, "");
  return /^\d+$/.test(normalized) ? Number(normalized) : null;
};

export function adaptWizardDraftToHouseholdAnswers(
  draft: WizardPrototypeDraft,
): WizardHouseholdAnswerAdapterResult {
  const errors = {
    ...validateWizardStep("firstHome", draft),
    ...validateWizardStep("household", draft),
  };
  if (Object.keys(errors).length > 0 || draft.householdMode === "") {
    return { success: false, errors };
  }

  const { householdPlan } = draft;
  const destinationRent = parseWholeDollars(draft.finances.targetHousing);
  const maximumRent = parseWholeDollars(householdPlan.housing.maxMonthlyCost);
  if (destinationRent === null || maximumRent === null) {
    return {
      success: false,
      errors: {
        scenario:
          "MoveWise needs a destination rent estimate and rent ceiling to evaluate the rental plan.",
      },
    };
  }
  const rentIsEssential = isHardRentCeiling(householdPlan.housing);
  const answersByFactor: Record<
    HouseholdFactorAnswer["factorId"],
    HouseholdFactorAnswer
  > = {
    space_fit: {
      factorId: "space_fit",
      importance: rentIsEssential ? "essential" : "important",
      impact: "unavailable",
      essentialStatus: rentIsEssential
        ? destinationRent <= maximumRent
          ? "confirmed_met"
          : "confirmed_unmet"
        : null,
    },
    support_network: excludedAnswer("support_network"),
    childcare_continuity: excludedAnswer("childcare_continuity"),
    school_continuity: excludedAnswer("school_continuity"),
    required_services_continuity: excludedAnswer(
      "required_services_continuity",
    ),
    car_free_access: excludedAnswer("car_free_access"),
  };
  answersByFactor.support_network = answerFromConditionalNeed(
    "support_network",
    householdPlan.supportNetwork,
  );
  if (draft.householdMode === "family") {
    answersByFactor.childcare_continuity = answerFromConditionalNeed(
      "childcare_continuity",
      householdPlan.childcare,
    );
    answersByFactor.school_continuity = answerFromConditionalNeed(
      "school_continuity",
      householdPlan.school,
    );
  }
  answersByFactor.required_services_continuity = answerFromConditionalNeed(
    "required_services_continuity",
    householdPlan.requiredServices,
  );
  answersByFactor.car_free_access = answerFromConditionalNeed(
    "car_free_access",
    householdPlan.carFreeAccess,
  );
  const factors = MOVEWISE_HOUSEHOLD_FACTOR_IDS_BY_MODE[
    draft.householdMode
  ].map((factorId) => answersByFactor[factorId]);

  return {
    success: true,
    answers: createMoveWiseHouseholdAnswers({
      schemaVersion: MOVEWISE_HOUSEHOLD_ANSWER_SCHEMA_VERSION,
      questionVersion: MOVEWISE_HOUSEHOLD_EVIDENCE_PLAN_QUESTION_VERSION,
      mode: draft.householdMode,
      factors,
    }),
  };
}
